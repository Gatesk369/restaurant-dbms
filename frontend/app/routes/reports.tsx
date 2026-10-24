import { useMemo, useState } from "react";
import { useLoaderData, useNavigate } from "react-router";

import type { Route } from "./+types/reports";
import { PaymentDonut } from "~/components/charts/PaymentDonut";
import { RevenueBars } from "~/components/charts/RevenueBars";
import { PageHeader } from "~/components/staff/PageHeader";
import { PaidOrderHistory } from "~/components/staff/PaidOrderHistory";
import {
  SalesPanel,
  SummaryStrip,
  TopItemsPanel,
  TurnoverPanel,
  WaiterPanel,
} from "~/components/staff/ReportPanels";
import { Button } from "~/components/ui/Button";
import { Panel, PanelHeading } from "~/components/ui/Panel";
import { getScreen } from "~/lib/access";
import { loadPaymentHistory, loadReports } from "~/lib/api/reports";
import { requireStaffScreen, rethrowApiError } from "~/lib/auth-guard";
import {
  calendarMonthFor,
  dailyPeriods,
  parseRange,
  rangeFor,
  rangeLabel,
  summarise,
  toSlices,
  weeklyPeriods,
  type RangeKey,
} from "~/lib/domain/reports";
import { kampalaDate } from "~/lib/time";

export const handle = { screen: "reports" } as const;

const screen = getScreen("reports");

export function meta({}: Route.MetaArgs) {
  return [{ title: `${screen.title} · Restaurant DBMS` }];
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  requireStaffScreen("reports");
  const params = new URL(request.url).searchParams;
  const requestedPreset = params.get("range");
  const range: RangeKey = parseRange(requestedPreset);
  const defaults = rangeFor(range, kampalaDate());
  const from = params.get("from") || defaults.from;
  const to = params.get("to") || defaults.to;
  const custom = !requestedPreset && Boolean(params.get("from") || params.get("to"));
  const offset = Math.max(0, Number(params.get("offset")) || 0);
  const days = Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
  const periodMode: RangeKey = custom && days > 14 ? "month" : "week";
  try {
    const selectedRange = { from, to };
    const [bundle, history] = await Promise.all([
      loadReports(selectedRange),
      loadPaymentHistory(selectedRange, offset),
    ]);
    return { range, periodMode, custom, bundle, history };
  } catch (error) {
    return rethrowApiError(error);
  }
}

const COPY: Record<RangeKey, { trend: string; sales: string; head: string; best: string }> = {
  week: { trend: "Daily revenue", sales: "Daily sales", head: "Day", best: "Busiest day" },
  month: { trend: "Weekly revenue", sales: "Weekly sales", head: "Week", best: "Busiest week" },
};

export default function Reports() {
  const { range, periodMode, custom, bundle, history } = useLoaderData<typeof clientLoader>();
  const navigate = useNavigate();
  const activeRangeKey = `${bundle.range.from}:${bundle.range.to}`;
  const [dateDraft, setDateDraft] = useState(() => ({
    rangeKey: activeRangeKey,
    from: bundle.range.from,
    to: bundle.range.to,
  }));
  const start = dateDraft.rangeKey === activeRangeKey ? dateDraft.from : bundle.range.from;
  const end = dateDraft.rangeKey === activeRangeKey ? dateDraft.to : bundle.range.to;

  const view = useMemo(() => {
    if (!bundle) return null;
    const periods = periodMode === "week" ? dailyPeriods(bundle.daily) : weeklyPeriods(bundle.daily);
    const slices = toSlices(bundle.methods);
    return {
      periods,
      summary: summarise(periods),
      slices,
      methodTotal: slices.reduce((sum, s) => sum + s.amount, 0),
    };
  }, [bundle, periodMode]);

  const copy = COPY[periodMode];
  const today = kampalaDate();
  const calendarMonth = calendarMonthFor(today);

  return (
    <>
      <PageHeader
        title={screen.title}
        subtitle={bundle ? rangeLabel(bundle.range.from, bundle.range.to) : undefined}
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap gap-2">
            <Button size="md" variant="tonal" onClick={() => navigate(`?from=${today}&to=${today}`)}>Today</Button>
            <Button size="md" variant="tonal" onClick={() => navigate(`?from=${calendarMonth.from}&to=${calendarMonth.to}`)}>This month</Button>
          </div>
          <label className="flex flex-col gap-1 text-label font-bold tracking-label">
            From
            <input aria-label="Reports start date" type="date" value={start} onChange={(e) => setDateDraft({ rangeKey: activeRangeKey, from: e.target.value, to: end })} className="min-h-12 rounded-md bg-field px-3 text-body font-normal shadow-[inset_0_-1px_0_var(--color-moss)]" />
          </label>
          <label className="flex flex-col gap-1 text-label font-bold tracking-label">
            To
            <input aria-label="Reports end date" type="date" value={end} onChange={(e) => setDateDraft({ rangeKey: activeRangeKey, from: start, to: e.target.value })} className="min-h-12 rounded-md bg-field px-3 text-body font-normal shadow-[inset_0_-1px_0_var(--color-moss)]" />
          </label>
          <Button size="md" variant="tonal" onClick={() => navigate(`?from=${start}&to=${end}`)}>Apply dates</Button>
        </div>
      </PageHeader>

      {bundle && view ? (
        <>
          <SummaryStrip summary={view.summary} bestLabel={copy.best} />

          <div className="flex flex-wrap items-start gap-6">
            <Panel sizing="content" className="min-w-0 flex-[2_1_560px]">
              <PanelHeading
                title={copy.trend}
                caption="UGX, from the PAYMENTS table. The tallest bar is darker."
              />
              <RevenueBars periods={view.periods} />
            </Panel>
            <Panel sizing="content" gap="md" className="min-w-0 flex-[1_1_320px]">
              <PanelHeading
                title="Payment methods"
                caption="Share of revenue by how guests paid."
              />
              <PaymentDonut slices={view.slices} total={view.methodTotal} />
            </Panel>
          </div>
          <PaidOrderHistory
            id="history"
            page={history}
            onPage={(offset) => navigate(`?${custom ? `from=${bundle.range.from}&to=${bundle.range.to}` : `range=${range}`}&offset=${offset}`)}
          />

          <div className="flex flex-wrap items-start gap-6">
            <TopItemsPanel rows={bundle.topItems} />
            <WaiterPanel rows={bundle.waiters} />
          </div>

          <div className="flex flex-wrap items-start gap-6">
            <SalesPanel
              title={copy.sales}
              periodHead={copy.head}
              periods={view.periods}
              summary={view.summary}
            />
            <TurnoverPanel rows={bundle.turnover} />
          </div>
        </>
      ) : null}
    </>
  );
}
