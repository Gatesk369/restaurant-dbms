import { afterEach, describe, expect, it, vi } from "vitest";

import { login, me } from "~/lib/api/auth";
import { ApiError, parseErrorBody, request } from "~/lib/api/client";
import { getStaffSession, setStaffSession } from "~/lib/session";

function respond(status: number, body: unknown) {
  return vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response(body === null ? "" : JSON.stringify(body), { status }));
}

afterEach(() => vi.restoreAllMocks());

describe("parseErrorBody", () => {
  it("reads detail, field messages and message lists", () => {
    expect(parseErrorBody({ detail: "Nope." })).toEqual({ detail: "Nope.", fields: {} });
    expect(parseErrorBody({ price: ["Enter a price greater than 0."] })).toEqual({
      detail: null,
      fields: { price: "Enter a price greater than 0." },
    });
    expect(parseErrorBody(["Bad."])).toEqual({ detail: "Bad.", fields: {} });
    expect(parseErrorBody(null)).toEqual({ detail: null, fields: {} });
  });
});

describe("request", () => {
  it("sends the staff bearer token and the JSON body", async () => {
    setStaffSession({
      token: "abc",
      staff: { staff_id: 1, username: "u", role: "manager" },
    });
    const fetchMock = respond(201, { ok: true });
    await request("/api/staff/menu/", { method: "POST", body: { item_name: "Tea" } });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("http://127.0.0.1:8000/api/staff/menu/");
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer abc",
      "Content-Type": "application/json",
    });
    expect(init?.body).toBe(JSON.stringify({ item_name: "Tea" }));
  });

  it("sends the customer session header and no bearer token", async () => {
    sessionStorage.setItem(
      "rdbms.customer",
      JSON.stringify({ customer_id: 1, table_id: 6, session_token: "uuid-1" }),
    );
    const fetchMock = respond(200, []);
    await request("/api/my/orders/", { auth: "customer" });
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({ "X-Session-Token": "uuid-1" });
    expect(fetchMock.mock.calls[0][1]?.headers).not.toHaveProperty("Authorization");
  });

  it("builds query strings and skips empty values", async () => {
    const fetchMock = respond(200, []);
    await request("/api/staff/orders/", {
      query: { status: "served,ready", search: "", limit: 6 },
    });
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "http://127.0.0.1:8000/api/staff/orders/?status=served%2Cready&limit=6",
    );
  });

  it("turns a 401 into ApiError and ends the staff session", async () => {
    setStaffSession({
      token: "old",
      staff: { staff_id: 1, username: "u", role: "cashier" },
    });
    respond(401, { detail: "Invalid or expired token." });

    const error = await request("/api/auth/me/").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).isUnauthorized).toBe(true);
    expect((error as ApiError).detail).toBe("Invalid or expired token.");
    expect(getStaffSession()).toBeNull();
  });

  it("keeps the session on a failed sign-in attempt", async () => {
    setStaffSession({
      token: "keep",
      staff: { staff_id: 1, username: "u", role: "cashier" },
    });
    respond(401, { detail: "Invalid username or password." });
    await expect(login("u", "bad")).rejects.toMatchObject({
      status: 401,
      detail: "Invalid username or password.",
    });
    expect(getStaffSession()?.token).toBe("keep");
  });

  it("maps 403, 409 and field errors", async () => {
    respond(403, { detail: "You do not have permission to perform this action." });
    await expect(request("/api/staff/menu/")).rejects.toMatchObject({ isForbidden: true });

    respond(409, { detail: "This order has already been paid." });
    await expect(request("/api/staff/orders/1/pay/", { method: "POST" })).rejects.toMatchObject({
      isConflict: true,
      detail: "This order has already been paid.",
    });

    respond(400, { table_id: "That table doesn't exist." });
    await expect(
      request("/api/customers/", { method: "POST", auth: "none" }),
    ).rejects.toMatchObject({ fields: { table_id: "That table doesn't exist." } });
  });

  it("reports network failures as status 0", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
    const error = await request("/api/menu/", { auth: "none" }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).isNetwork).toBe(true);
  });

  it("falls back to a generic message when the body is not JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("<html>", { status: 500 }));
    await expect(request("/api/menu/", { auth: "none" })).rejects.toMatchObject({
      status: 500,
      detail: "Something went wrong. Please try again.",
    });
  });
});

describe("auth", () => {
  it("returns the session from a login response", async () => {
    respond(200, {
      token: "t",
      staff: { staff_id: 4, username: "demo_kevin", role: "kitchen" },
    });
    expect(await login("demo_kevin", "pw")).toEqual({
      token: "t",
      staff: { staff_id: 4, username: "demo_kevin", role: "kitchen", display_name: undefined },
    });
  });

  it("rejects an unexpected role from the server", async () => {
    respond(200, { staff_id: 4, username: "x", role: "owner" });
    await expect(me()).rejects.toThrow(TypeError);
  });
});
