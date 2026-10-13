import { useEffect, useMemo, useRef, useState } from "react";
import { useLoaderData } from "react-router";

import type { Route } from "./+types/station";
import { DoneStep } from "~/components/station/DoneStep";
import { MenuStep, type CartView } from "~/components/station/MenuStep";
import { ReviewStep } from "~/components/station/ReviewStep";
import { StationCanvas } from "~/components/station/StationCanvas";
import { StationHeader } from "~/components/station/StationHeader";
import { TableStep } from "~/components/station/TableStep";
import { StationToast } from "~/components/ui/Toast";
import { ApiError } from "~/lib/api/client";
import { listPublicMenu } from "~/lib/api/menu";
import { fetchMyOrder, sendOrder, startTableSession } from "~/lib/api/station";
import { fetchTables } from "~/lib/api/tables";
import type { Order, Table } from "~/lib/api/types";
import { addToCart, cartTotal, changeQuantity, type CartLine } from "~/lib/domain/cart";
import { categoryOf } from "~/lib/domain/menu-categories";
import type { MobileNetwork } from "~/lib/domain/payments";
import {
  SCREEN_INDEX,
  STATION_CATEGORIES,
  orderFor as orderForText,
  payNote,
  trackerStep,
} from "~/lib/domain/station";
import { deriveTables, parseTableIds } from "~/lib/domain/tables";
import { prototypeControls, tableIdsSpec } from "~/lib/env";
import { useIdle } from "~/lib/hooks/use-idle";
import { usePoll } from "~/lib/hooks/use-poll";
import { formatUgx } from "~/lib/money";
import { clearCustomerSession, getCustomerSession, setCustomerSession } from "~/lib/session";
import {
  EMPTY_DRAFT,
  clearDraft,
  loadDraft,
  saveDraft,
  type StationDraft,
} from "~/lib/station-session";
import { isValidPhone } from "~/lib/validation";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Order from your table · Restaurant DBMS" }];
}

const TRACK_POLL_MS = 5_000;
const IDLE_RESET_MS = 5 * 60_000;
const TOAST_MS = 4_000;

export async function clientLoader() {
  const [menu, apiTables] = await Promise.all([listPublicMenu(), fetchTables()]);
  // Without a tables endpoint (gap G1) every configured table is offered; a
  // customer cannot see which ones are in use.
  const tables: Table[] = apiTables ?? deriveTables(parseTableIds(tableIdsSpec), []);
  return { menu, tables };
}

function messageOf(error: unknown): string {
  return error instanceof ApiError
    ? `Error: ${error.detail}`
    : "Error: Something went wrong. Please try again.";
}

export default function Station() {
  const { menu, tables } = useLoaderData<typeof clientLoader>();

  const [draft, setDraft] = useState<StationDraft>(loadDraft);
  const patch = (changes: Partial<StationDraft>) => setDraft((d) => ({ ...d, ...changes }));
  useEffect(() => saveDraft(draft), [draft]);

  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [tried, setTried] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<Order | null>(null);
  const [localStep, setLocalStep] = useState(0);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // --- menu ---------------------------------------------------------------
  const menuById = useMemo(() => new Map(menu.map((i) => [i.menu_item_id, i])), [menu]);
  const lines: CartLine[] = draft.lines;
  const cart: CartView[] = lines.flatMap((line) => {
    const item = menuById.get(line.menu_item_id);
    return item
      ? [
          {
            menuItemId: item.menu_item_id,
            name: item.item_name,
            quantity: line.quantity,
            unitPrice: item.price,
          },
        ]
      : [];
  });
  const total = cartTotal(lines, (id) => menuById.get(id)?.price ?? 0);
  const quantities = useMemo(
    () => new Map(lines.map((l) => [l.menu_item_id, l.quantity])),
    [lines],
  );
  const shownItems = menu
    .filter((i) => categoryOf(i) === draft.category)
    .sort((a, b) => a.menu_item_id - b.menu_item_id);

  function setLines(next: CartLine[]) {
    patch({ lines: next });
  }

  // --- actions ------------------------------------------------------------
  function callWaiter() {
    setToast(
      draft.table ? `A waiter is on the way to Table ${draft.table}.` : "A waiter is on the way.",
    );
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), TOAST_MS);
  }

  async function startOrder() {
    if (draft.table === null || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      // Coming back from "Change table" to the same table keeps its session.
      const existing = getCustomerSession();
      if (!existing || existing.table_id !== draft.table) {
        setCustomerSession(await startTableSession(draft.table));
      }
      patch({ screen: "menu" });
    } catch (error) {
      setStartError(messageOf(error));
    } finally {
      setStarting(false);
    }
  }

  async function send() {
    if (lines.length === 0 || sending) return;
    if (draft.pay === "momo" && !isValidPhone(draft.phone)) {
      setTried(true);
      return;
    }
    const session = getCustomerSession();
    if (!session) {
      setStartError("Error: Your session has ended. Choose your table again.");
      patch({ screen: "start" });
      return;
    }
    setSending(true);
    setSendError(null);
    try {
      const note = draft.notes.trim();
      // The payment choice stays on this screen: the API has no customer
      // payment flow yet (gap G15), so only the cart is sent.
      const order = await sendOrder(
        session,
        lines.map((l) => ({
          menu_item_id: l.menu_item_id,
          quantity: l.quantity,
          ...(note ? { special_instructions: note } : {}),
        })),
      );
      setPlaced(order);
      setLocalStep(0);
      setTried(false);
      patch({ screen: "done", orderId: order.order_id });
    } catch (error) {
      if (error instanceof ApiError && error.isUnauthorized) {
        clearCustomerSession();
        setStartError("Error: Your session has ended. Choose your table again.");
        patch({ screen: "start" });
      } else {
        setSendError(messageOf(error));
      }
    } finally {
      setSending(false);
    }
  }

  function reset() {
    clearDraft();
    clearCustomerSession();
    setDraft(EMPTY_DRAFT);
    setPlaced(null);
    setLocalStep(0);
    setTried(false);
    setStartError(null);
    setSendError(null);
    setToast("");
  }

  // --- tracker ------------------------------------------------------------
  const onDone = draft.screen === "done" && draft.orderId !== null;

  // A refresh on the Done screen has the order id but not the order.
  useEffect(() => {
    const session = getCustomerSession();
    if (!onDone || placed || !session || draft.orderId === null) return;
    fetchMyOrder(session, draft.orderId)
      .then(setPlaced)
      .catch(() => reset());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onDone]);

  usePoll(() => {
    const session = getCustomerSession();
    if (!onDone || !session || draft.orderId === null) return;
    fetchMyOrder(session, draft.orderId)
      .then(setPlaced)
      .catch(() => undefined);
  }, TRACK_POLL_MS);

  // A kiosk forgets the last customer when nobody touches it.
  useIdle(IDLE_RESET_MS, draft.screen === "start" || draft.screen === "done", reset);

  const apiStep = placed ? trackerStep(placed.order_status) : 0;
  const cancelled = placed?.order_status === "cancelled";
  const step = Math.max(apiStep ?? 0, localStep);

  // --- render -------------------------------------------------------------
  const description = orderForText(draft.table, draft.guestName);
  const orderNo = draft.orderId !== null ? `ORD-${draft.orderId}` : "";
  const doneTotal = placed?.total ?? total;
  const summary = placed
    ? placed.items.map((item) => ({
        text: `${item.quantity} × ${item.item_name}`,
        subtotal: item.item_subtotal,
      }))
    : cart.map((line) => ({
        text: `${line.quantity} × ${line.name}`,
        subtotal: line.quantity * line.unitPrice,
      }));
  const kitchenNote =
    placed?.items.find((item) => item.special_instructions)?.special_instructions ??
    draft.notes.trim();

  return (
    <StationCanvas>
      <StationHeader current={SCREEN_INDEX[draft.screen]} onCallWaiter={callWaiter} />

      <div className="relative h-[728px] flex-none">
        {toast ? <StationToast>{toast}</StationToast> : null}

        {draft.screen === "start" ? (
          <TableStep
            tables={tables}
            table={draft.table}
            onPick={(id) => patch({ table: id })}
            guestName={draft.guestName}
            onGuestName={(value) => patch({ guestName: value })}
            starting={starting}
            error={startError}
            onStart={() => void startOrder()}
          />
        ) : null}

        {draft.screen === "menu" ? (
          <MenuStep
            categories={STATION_CATEGORIES}
            category={draft.category}
            onCategory={(category) => patch({ category })}
            onChangeTable={() => patch({ screen: "start" })}
            items={shownItems}
            quantities={quantities}
            onAdd={(id) => setLines(addToCart(lines, id))}
            orderFor={description}
            cart={cart}
            total={total}
            onIncrement={(id) => setLines(changeQuantity(lines, id, 1))}
            onDecrement={(id) => setLines(changeQuantity(lines, id, -1))}
            onReview={() => {
              if (lines.length > 0) {
                setTried(false);
                setSendError(null);
                patch({ screen: "review" });
              }
            }}
          />
        ) : null}

        {draft.screen === "review" ? (
          <ReviewStep
            orderFor={description}
            cart={cart}
            total={total}
            onIncrement={(id) => setLines(changeQuantity(lines, id, 1))}
            onDecrement={(id) => {
              const next = changeQuantity(lines, id, -1);
              // Removing the last item sends the customer back to the menu.
              patch({ lines: next, ...(next.length === 0 ? { screen: "menu" as const } : {}) });
            }}
            notes={draft.notes}
            onNotes={(value) => patch({ notes: value })}
            pay={draft.pay}
            onPay={(choice) => {
              setTried(false);
              patch({ pay: choice });
            }}
            network={draft.network as MobileNetwork}
            onNetwork={(network) => patch({ network })}
            phone={draft.phone}
            onPhone={(value) => {
              setTried(false);
              patch({ phone: value });
            }}
            phoneInvalid={tried && draft.pay === "momo" && !isValidPhone(draft.phone)}
            sending={sending}
            error={sendError}
            onBack={() => patch({ screen: "menu" })}
            onSend={() => void send()}
          />
        ) : null}

        {draft.screen === "done" ? (
          <DoneStep
            orderNo={orderNo}
            tableLabel={`Table ${placed?.table_id ?? draft.table ?? ""}`}
            step={step}
            cancelled={cancelled}
            payNote={payNote(draft.pay, orderNo, formatUgx(doneTotal), draft.phone, draft.network)}
            summary={summary}
            kitchenNote={kitchenNote}
            total={doneTotal}
            canAdvance={prototypeControls}
            atEnd={step >= 2}
            onAdvance={() => setLocalStep((s) => Math.min(2, Math.max(s, apiStep ?? 0) + 1))}
            onReset={reset}
          />
        ) : null}
      </div>
    </StationCanvas>
  );
}
