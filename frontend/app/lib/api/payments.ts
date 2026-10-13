import { parseUgx } from "../money";
import { request } from "./client";
import type { Payment, PaymentMethod, SalesRecord } from "./types";

interface WirePayment {
  payment_id: number;
  order_id: number;
  amount: string | number;
  payment_method: PaymentMethod;
  cashier_id: number;
  transaction_time: string;
}

interface WireSalesRecord {
  sales_record_id: number;
  order_id: number;
  payment_id: number;
  total_amount: string | number;
  sale_date: string;
}

export interface PaymentResult {
  payment: Payment;
  sales_record: SalesRecord | null;
}

/**
 * Record payment for a served order. The amount is never sent: the server
 * adds up the stored item subtotals. Cashiers only (the API returns 403 to
 * other roles); 400 if the order is not served, 409 if it is already paid.
 */
export async function payOrder(orderId: number, method: PaymentMethod): Promise<PaymentResult> {
  const data = await request<{ payment: WirePayment; sales_record?: WireSalesRecord | null }>(
    `/api/staff/orders/${orderId}/pay/`,
    { method: "POST", body: { payment_method: method } },
  );
  const sale = data.sales_record;
  return {
    payment: { ...data.payment, amount: parseUgx(data.payment.amount) },
    sales_record: sale ? { ...sale, total_amount: parseUgx(sale.total_amount) } : null,
  };
}
