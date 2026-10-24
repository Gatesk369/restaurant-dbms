import { useMemo } from "react";
import { useLoaderData, useNavigate } from "react-router";

import type { Route } from "./+types/reports";
import { PaymentDonut } from "~/components/charts/PaymentDonut";
import { RevenueBars } from "~/components/charts/RevenueBars";
import { PageHeader } from "~/components/staff/PageHeader";
import {
  SalesPanel,
  SummaryStrip,
  TopItemsPanel,
  TurnoverPanel,
  WaiterPanel,
} from "~/components/staff/ReportPanels";
import { ToggleChip, ToggleGroup } from "~/components/ui/Chip";
import { Panel, PanelHeading } from "~/components/ui/Panel";
import { getScreen } from "~/lib/access";
import { loadReports } from "~/lib/api/reports";
import { requireStaffScreen, rethrowApiError } from "~/lib/auth-guard";
import {
  RANGES,
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
  const range: RangeKey = parseRange(new URL(request.url).searchParams.get("range"));
  try {
    return { range, bundle: await loadReports(rangeFor(range, kampalaDate())) };
  } catch (error) {
    return rethrowApiError(error);
  }
}

const COPY: Record<RangeKey, { trend: string; sales: string; head: string; best: string }> = {
  week: { trend: "Daily revenue", sales: "Daily sales", head: "Day", best: "Busiest day" },
  month: { trend: "Weekly revenue", sales: "Weekly sales", head: "Week", best: "Busiest week" },
};

export default function Reports() {
  const { range, bundle } = useLoaderData<typeof clientLoader>();
  const navigate = useNavigate();

  const view = useMemo(() => {
    if (!bundle) return null;
    const periods = range === "week" ? dailyPeriods(bundle.daily) : weeklyPeriods(bundle.daily);
    const slices = toSlices(bundle.methods);
    return {
      periods,
      summary: summarise(periods),
      slices,
      methodTotal: slices.reduce((sum, s) => sum + s.amount, 0),
    };
  }, [bundle, range]);

  const copy = COPY[range];

  return (
    <>
      <PageHeader
        title={screen.title}
        subtitle={bundle ? rangeLabel(bundle.range.from, bundle.range.to) : undefined}
      >
        <ToggleGroup label="Date range">
          {RANGES.map((option) => (
            <ToggleChip
              key={option.key}
              size="large"
              pressed={range === option.key}
              onClick={() => navigate(`?range=${option.key}`)}
            >
              {option.label}
            </ToggleChip>
          ))}
        </ToggleGroup>
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
