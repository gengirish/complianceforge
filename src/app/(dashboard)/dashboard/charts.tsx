"use client";

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const RISK_COLORS: Record<string, string> = {
  unacceptable: "#dc2626",
  high: "#f97316",
  limited: "#eab308",
  minimal: "#22c55e",
  unassessed: "#6b7280",
};

const STATUS_COLORS: Record<string, string> = {
  compliant: "#22c55e",
  partially_compliant: "#eab308",
  non_compliant: "#dc2626",
  under_review: "#3b82f6",
  not_started: "#6b7280",
};

interface DashboardChartsProps {
  riskData: Record<string, number>;
  statusData: Record<string, number>;
}

export function DashboardCharts({ riskData, statusData }: DashboardChartsProps) {
  const riskChartData = Object.entries(riskData)
    .filter(([, count]) => count > 0)
    .map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      fill: RISK_COLORS[name] ?? "#6b7280",
    }));

  const statusChartData = Object.entries(statusData)
    .filter(([, count]) => count > 0)
    .map(([name, value]) => ({
      name: name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      value,
      fill: STATUS_COLORS[name] ?? "#6b7280",
    }));

  const hasData = riskChartData.length > 0 || statusChartData.length > 0;

  if (!hasData) {
    return (
      <Card>
        <CardContent className="flex h-48 items-center justify-center text-muted-foreground">
          Add AI systems and classify them to see analytics here
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Risk Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Risk Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={riskChartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {riskChartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(224 71% 4%)",
                  border: "1px solid hsl(215 28% 17%)",
                  borderRadius: "8px",
                  color: "white",
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Compliance Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compliance Status</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={statusChartData} layout="vertical">
              <XAxis type="number" allowDecimals={false} stroke="#6b7280" fontSize={12} />
              <YAxis
                type="category"
                dataKey="name"
                width={130}
                stroke="#6b7280"
                fontSize={12}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(224 71% 4%)",
                  border: "1px solid hsl(215 28% 17%)",
                  borderRadius: "8px",
                  color: "white",
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {statusChartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
