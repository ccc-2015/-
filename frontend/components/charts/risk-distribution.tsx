"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { RecommendationItem } from "@/types/domain";

const order = ["冲", "稳", "保", "兜底"] as const;

export function RiskDistribution({ items }: { items: RecommendationItem[] }) {
  const data = order.map((level) => ({
    name: level,
    count: items.filter((item) => item.riskLevel === level).length
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d9e2ea" />
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
