"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";

/**
 * Charts follow the dataviz method: validated categorical slots 1–2 (blue,
 * orange), 2px surface gap between stacked segments, bars <= 24px with a 4px
 * rounded data-end, 2px lines with >= 8px ringed markers, hairline solid grid,
 * one y-axis per chart, hover tooltip on every chart, legend for 2 series.
 * Text uses text tokens, never the series color.
 */

export interface MonthPoint {
  key: string;
  label: string;
  restock: number;
  replacement: number;
  purchases: number;
  waste: number;
  submissions: number;
}

const VARS = {
  "--series-1": "#2a78d6",
  "--series-2": "#eb6834",
} as React.CSSProperties;

const AXIS = { stroke: "var(--muted-foreground)", fontSize: 12, tickLine: false, axisLine: false } as const;
const GRID = <CartesianGrid vertical={false} stroke="var(--border)" strokeWidth={1} />;

function money(v: number) {
  return v >= 1000 ? `$${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : `$${Math.round(v)}`;
}

function ChartTooltip({ active, payload, label, valueFormat }: TooltipContentProps<number, string> & { valueFormat?: (v: number) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background rounded-md border px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="flex items-center gap-2">
          <span className="inline-block size-2.5 rounded-sm" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}</span>
          <span className="ml-auto pl-3 font-medium tabular-nums">{valueFormat ? valueFormat(Number(p.value)) : Number(p.value).toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
}

/** Legend in series order (Recharts' default order isn't guaranteed). Text stays in text ink. */
function SeriesLegend({ items, line }: { items: { label: string; color: string }[]; line?: boolean }) {
  return (
    <div className="mt-2 flex flex-wrap justify-center gap-4 text-xs">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span className={line ? "inline-block h-0.5 w-3.5 rounded" : "inline-block size-2.5 rounded-sm"} style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

export function UsageChart({ data }: { data: MonthPoint[] }) {
  return (
    <div style={VARS}>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          {GRID}
          <XAxis dataKey="label" {...AXIS} />
          <YAxis {...AXIS} allowDecimals={false} width={44} />
          <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.6 }} content={(p) => <ChartTooltip {...(p as TooltipContentProps<number, string>)} />} />
          <Bar isAnimationActive={false} dataKey="restock" name="Restock (used)" stackId="u" fill="var(--series-1)" maxBarSize={24} stroke="var(--background)" strokeWidth={2} />
          <Bar isAnimationActive={false} dataKey="replacement" name="Replacement" stackId="u" fill="var(--series-2)" maxBarSize={24} radius={[4, 4, 0, 0]} stroke="var(--background)" strokeWidth={2} />
        </BarChart>
      </ResponsiveContainer>
      <SeriesLegend items={[{ label: "Restock (used)", color: "var(--series-1)" }, { label: "Replacement", color: "var(--series-2)" }]} />
    </div>
  );
}

export function SpendChart({ data }: { data: MonthPoint[] }) {
  const dot = (color: string) => ({ r: 4, fill: color, stroke: "var(--background)", strokeWidth: 2 });
  return (
    <div style={VARS}>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          {GRID}
          <XAxis dataKey="label" {...AXIS} />
          <YAxis {...AXIS} tickFormatter={money} width={52} />
          <Tooltip
            cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
            content={(p) => (
              <ChartTooltip
                {...(p as TooltipContentProps<number, string>)}
                valueFormat={(v) => v.toLocaleString(undefined, { style: "currency", currency: "USD" })}
              />
            )}
          />
          <Line isAnimationActive={false} type="linear" dataKey="purchases" name="Purchases" stroke="var(--series-1)" strokeWidth={2} strokeLinecap="round" dot={dot("var(--series-1)")} activeDot={{ ...dot("var(--series-1)"), r: 5 }} />
          <Line isAnimationActive={false} type="linear" dataKey="waste" name="Waste" stroke="var(--series-2)" strokeWidth={2} strokeLinecap="round" dot={dot("var(--series-2)")} activeDot={{ ...dot("var(--series-2)"), r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
      <SeriesLegend line items={[{ label: "Purchases", color: "var(--series-1)" }, { label: "Waste", color: "var(--series-2)" }]} />
    </div>
  );
}

export function TopItemsChart({ data }: { data: { name: string; issued: number }[] }) {
  return (
    <div style={VARS} className="w-full">
      <ResponsiveContainer width="100%" height={Math.max(160, data.length * 36)}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, left: 8, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke="var(--border)" strokeWidth={1} />
          <XAxis type="number" {...AXIS} allowDecimals={false} />
          <YAxis type="category" dataKey="name" {...AXIS} width={190} tick={{ fill: "var(--foreground)", fontSize: 12 }} />
          <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.6 }} content={(p) => <ChartTooltip {...(p as TooltipContentProps<number, string>)} />} />
          <Bar
            isAnimationActive={false}
            dataKey="issued"
            name="Units taken"
            fill="var(--series-1)"
            maxBarSize={24}
            radius={[0, 4, 4, 0]}
            label={{ position: "right", fill: "var(--foreground)", fontSize: 12 }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
