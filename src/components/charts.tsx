"use client";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Month = {
  month: string;
  uploaded: number;
  processed: number;
  exceptions: number;
  spend: number;
};
export function TrendChart({
  data,
  kind,
  locale,
}: {
  data: Month[];
  kind: "activity" | "spend" | "exceptions";
  locale: string;
}) {
  const ar = locale === "ar";
  const x = (month: string) =>
    /^\d{4}-\d{2}$/.test(month)
      ? new Intl.DateTimeFormat(locale, {
          month: "short",
          timeZone: "UTC",
        }).format(new Date(month + "-01"))
      : month;
  const axis = { fill: "var(--subtle)", fontSize: 12 };
  const tooltip = {
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: 9,
    color: "var(--ink)",
  };
  return (
    <div
      className="chart"
      dir="ltr"
      role="img"
      aria-label={
        kind === "spend"
          ? ar
            ? "مخطط الإنفاق الشهري"
            : "Monthly spending chart"
          : kind === "exceptions"
            ? ar
              ? "مخطط الاستثناءات"
              : "Monthly exceptions chart"
            : ar
              ? "مخطط نشاط المستندات"
              : "Monthly document activity chart"
      }
    >
      <ResponsiveContainer width="100%" height={220} minWidth={0}>
        {kind === "spend" ? (
          <AreaChart
            data={data}
            margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="spend-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#8263f3" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#8263f3" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis
              dataKey="month"
              tickFormatter={x}
              axisLine={false}
              tickLine={false}
              tick={axis}
            />
            <YAxis tick={axis} axisLine={false} tickLine={false} width={48} />
            <Tooltip
              labelFormatter={(label) => x(String(label ?? ""))}
              contentStyle={tooltip}
            />
            <Area
              type="monotone"
              dataKey="spend"
              name={ar ? "الإنفاق" : "Spending"}
              stroke="#7657e8"
              fill="url(#spend-fill)"
              strokeWidth={2.8}
              isAnimationActive={false}
            />
          </AreaChart>
        ) : (
          <BarChart
            data={data}
            margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
            barGap={4}
          >
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis
              dataKey="month"
              tickFormatter={x}
              axisLine={false}
              tickLine={false}
              tick={axis}
            />
            <YAxis
              allowDecimals={false}
              tick={axis}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip
              labelFormatter={(label) => x(String(label ?? ""))}
              contentStyle={tooltip}
              cursor={{ fill: "var(--surface-soft)" }}
            />
            {kind === "activity" ? (
              <>
                <Bar
                  dataKey="uploaded"
                  name={ar ? "تم التحميل" : "Uploaded"}
                  fill="#bbaafa"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="processed"
                  name={ar ? "تمت المعالجة" : "Processed"}
                  fill="#7454df"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                  isAnimationActive={false}
                />
              </>
            ) : (
              <Bar
                dataKey="exceptions"
                name={ar ? "الاستثناءات" : "Exceptions"}
                fill="#bb82e8"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
                isAnimationActive={false}
              />
            )}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
