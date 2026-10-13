import { ApiError, request } from "./client";
import type { Table } from "./types";

interface WireTable {
  table_id: number;
  free_status: boolean;
  seats?: number | null;
}

/**
 * GET /api/tables/ (gap G1, issue #12). Returns null while the endpoint does
 * not exist so callers can fall back to the interim, order-derived list.
 */
export async function fetchTables(): Promise<Table[] | null> {
  try {
    const rows = await request<WireTable[]>("/api/tables/", { auth: "none" });
    return rows.map((row) => ({
      table_id: row.table_id,
      free_status: row.free_status,
      seats: row.seats ?? undefined,
    }));
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 405)) return null;
    throw error;
  }
}
