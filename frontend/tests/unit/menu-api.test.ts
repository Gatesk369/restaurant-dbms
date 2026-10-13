import { afterEach, describe, expect, it, vi } from "vitest";

import {
  archiveMenuItem,
  createMenuItem,
  loadStaffMenu,
  restoreMenuItem,
  updateMenuItem,
} from "~/lib/api/menu";

afterEach(() => vi.restoreAllMocks());

function reply(body: unknown, status = 200) {
  return vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(() => Promise.resolve(new Response(JSON.stringify(body), { status })));
}

const row = {
  menu_item_id: 6,
  item_name: "Rolex",
  description: null,
  price: "5000.00",
  availability_status: true,
};

describe("loadStaffMenu", () => {
  it("asks for unavailable items and reads what the API supports from the rows", async () => {
    const spy = reply([row]);
    const plain = await loadStaffMenu();
    expect(String(spy.mock.calls[0][0])).toBe(
      "http://127.0.0.1:8000/api/staff/menu/?include_unavailable=1",
    );
    expect(plain.features).toEqual({ category: false, archived: false });
    // The interim lookup fills the category in the meantime.
    expect(plain.items[0]).toMatchObject({ price: 5000, category: "Snacks" });

    vi.restoreAllMocks();
    reply([{ ...row, category: "Mains", archived: false }]);
    const full = await loadStaffMenu();
    expect(full.features).toEqual({ category: true, archived: true });
    expect(full.items[0]).toMatchObject({ category: "Mains", archived: false });
  });

  it("assumes nothing from an empty menu", async () => {
    reply([]);
    expect((await loadStaffMenu()).features).toEqual({ category: false, archived: false });
  });
});

describe("writing", () => {
  it("creates with a POST body of the form fields", async () => {
    const spy = reply({ ...row, menu_item_id: 19 }, 201);
    const created = await createMenuItem({
      item_name: "Roasted Maize",
      price: 4500,
      availability_status: true,
      category: "Snacks",
    });
    expect(created.menu_item_id).toBe(19);
    expect(spy.mock.calls[0][1]?.method).toBe("POST");
    expect(JSON.parse(String(spy.mock.calls[0][1]?.body))).toEqual({
      item_name: "Roasted Maize",
      price: 4500,
      availability_status: true,
      category: "Snacks",
    });
  });

  it("updates with PATCH and archives with DELETE", async () => {
    const spy = reply(row);
    await updateMenuItem(6, { price: 5500 });
    expect(String(spy.mock.calls[0][0])).toBe("http://127.0.0.1:8000/api/staff/menu/6/");
    expect(spy.mock.calls[0][1]?.method).toBe("PATCH");

    await archiveMenuItem(6);
    expect(spy.mock.calls[1][1]?.method).toBe("DELETE");
  });

  it("restores through availability, and also clears archived when the column exists", async () => {
    const spy = reply(row);
    await restoreMenuItem(6, { category: false, archived: false });
    expect(JSON.parse(String(spy.mock.calls[0][1]?.body))).toEqual({ availability_status: true });

    await restoreMenuItem(6, { category: true, archived: true });
    expect(JSON.parse(String(spy.mock.calls[1][1]?.body))).toEqual({
      archived: false,
      availability_status: true,
    });
  });

  it("surfaces a validation message", async () => {
    reply({ price: "Enter a price greater than 0." }, 400);
    await expect(
      createMenuItem({ item_name: "X", price: 0, availability_status: true }),
    ).rejects.toMatchObject({
      status: 400,
      detail: "Enter a price greater than 0.",
    });
  });
});
