import { useMemo, useState } from "react";
import { useLoaderData, useRevalidator } from "react-router";

import type { Route } from "./+types/menu";
import { MenuEditor, MenuEditorPlaceholder } from "~/components/staff/MenuEditor";
import { MenuList } from "~/components/staff/MenuList";
import { PageHeader } from "~/components/staff/PageHeader";
import { Button } from "~/components/ui/Button";
import { FieldError } from "~/components/ui/Field";
import { Icon } from "~/components/ui/Icon";
import { StatusMessage } from "~/components/ui/Toast";
import { getScreen } from "~/lib/access";
import { ApiError } from "~/lib/api/client";
import {
  archiveMenuItem,
  createMenuItem,
  loadStaffMenu,
  restoreMenuItem,
  updateMenuItem,
} from "~/lib/api/menu";
import type { MenuCategory, MenuItem } from "~/lib/api/types";
import { requireStaffScreen, rethrowApiError } from "~/lib/auth-guard";
import { archivedCount, filterMenu, itemStatus, menuItemNumber } from "~/lib/domain/menu";
import { categoryOf } from "~/lib/domain/menu-categories";
import { isValidItemName, isValidPrice } from "~/lib/validation";

export const handle = { screen: "menu" } as const;

const screen = getScreen("menu");

export function meta({}: Route.MetaArgs) {
  return [{ title: `${screen.title} · Restaurant DBMS` }];
}

export async function clientLoader() {
  requireStaffScreen("menu");
  try {
    return await loadStaffMenu();
  } catch (error) {
    return rethrowApiError(error);
  }
}

function messageOf(error: unknown): string {
  return error instanceof ApiError
    ? `Error: ${error.detail}`
    : "Error: Something went wrong. Please try again.";
}

/** `null` is closed, "new" is the add form, a number is the item being edited. */
type Editing = null | "new" | number;

export default function Menu() {
  const { items, features } = useLoaderData<typeof clientLoader>();
  const revalidator = useRevalidator();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [showArchived, setShowArchived] = useState(false);

  const [editing, setEditing] = useState<Editing>(null);
  const [name, setName] = useState("");
  const [formCategory, setFormCategory] = useState<MenuCategory>("Mains");
  const [price, setPrice] = useState("");
  const [available, setAvailable] = useState(true);
  const [tried, setTried] = useState(false);

  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The mock-up lists items in menu order; the API sorts by name.
  const sorted = useMemo(() => [...items].sort((a, b) => a.menu_item_id - b.menu_item_id), [items]);
  const visible = useMemo(
    () => filterMenu(sorted, features, { search, category, showArchived }),
    [sorted, features, search, category, showArchived],
  );

  function openNew() {
    if (saving || busyId !== null) return;
    setEditing("new");
    setName("");
    setFormCategory("Mains");
    setPrice("");
    setAvailable(true);
    setTried(false);
    setError(null);
    setToast("");
  }

  function openEdit(item: MenuItem) {
    if (saving || busyId !== null) return;
    setEditing(item.menu_item_id);
    setName(item.item_name);
    setFormCategory(categoryOf(item) ?? "Mains");
    setPrice(String(item.price));
    setAvailable(item.availability_status);
    setTried(false);
    setError(null);
    setToast("");
  }

  const nameInvalid = tried && !isValidItemName(name);
  const priceInvalid = tried && !isValidPrice(price);

  async function save() {
    if (editing === null || saving || busyId !== null) return;
    if (!isValidItemName(name) || !isValidPrice(price)) {
      setTried(true);
      return;
    }
    setSaving(true);
    setError(null);
    const trimmed = name.trim();
    const input = {
      item_name: trimmed,
      price: Number.parseInt(price.trim(), 10),
      availability_status: available,
      category: formCategory,
    };
    try {
      if (editing === "new") {
        const created = await createMenuItem(input);
        setToast(`${trimmed} added as ${menuItemNumber(created.menu_item_id)}.`);
      } else {
        await updateMenuItem(editing, input);
        setToast(`${trimmed} updated.`);
      }
      setEditing(null);
      setTried(false);
      await revalidator.revalidate();
    } catch (failure) {
      setError(messageOf(failure));
    } finally {
      setSaving(false);
    }
  }

  async function toggleArchive(item: MenuItem) {
    if (saving || busyId !== null) return;
    const archiving = itemStatus(item, features) !== "archived";
    setBusyId(item.menu_item_id);
    setError(null);
    try {
      if (archiving) await archiveMenuItem(item.menu_item_id);
      else await restoreMenuItem(item.menu_item_id, features);
      setToast(
        archiving
          ? `${item.item_name} archived. Past orders still show it.`
          : `${item.item_name} restored to the menu.`,
      );
      if (editing === item.menu_item_id) setEditing(null);
      await revalidator.revalidate();
    } catch (failure) {
      setToast("");
      setError(messageOf(failure));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader title={screen.title} subtitle={screen.subtitle}>
        <Button size="lg" onClick={openNew} disabled={saving || busyId !== null}>
          <Icon name="add" />
          Add item
        </Button>
      </PageHeader>

      {toast ? <StatusMessage>{toast}</StatusMessage> : null}

      <div className="flex flex-wrap items-start gap-6">
        <MenuList
          items={visible}
          features={features}
          totalCount={items.length}
          archivedCount={archivedCount(items, features)}
          search={search}
          onSearch={setSearch}
          showArchived={showArchived}
          onShowArchived={setShowArchived}
          category={category}
          onCategory={setCategory}
          editingId={typeof editing === "number" ? editing : null}
          busyId={busyId}
          disabled={saving || busyId !== null}
          onEdit={openEdit}
          onToggleArchive={(item) => void toggleArchive(item)}
        />

        <aside className="min-w-0 max-w-full flex-[1_1_340px]">
          {editing === null ? (
            <MenuEditorPlaceholder />
          ) : (
            <MenuEditor
              title={editing === "new" ? "Add item" : `Edit ${menuItemNumber(editing)}`}
              name={name}
              onName={setName}
              category={formCategory}
              onCategory={setFormCategory}
              price={price}
              onPrice={(value) => setPrice(value.replace(/[^0-9-]/g, ""))}
              available={available}
              onAvailable={setAvailable}
              nameInvalid={nameInvalid}
              priceInvalid={priceInvalid}
              categoryNotSaved={!features.category}
              saving={saving}
              disabled={busyId !== null}
              error={error}
              onSubmit={() => void save()}
              onCancel={() => {
                setEditing(null);
                setTried(false);
                setError(null);
              }}
            />
          )}
          {editing === null && error ? <FieldError className="mt-3">{error}</FieldError> : null}
        </aside>
      </div>
    </>
  );
}
