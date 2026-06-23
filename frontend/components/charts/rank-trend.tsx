"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const data = [
  { year: "2023", rank: 67200 },
  { year: "2024", rank: 64800 },
  { year: "2025", rank: 62100 },
  { year: "2026", rank: 58620 }
];

export function RankTrend() {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d9e2ea" />
          <XAxis dataKey="year" />
          <YAxis reversed domain={["dataMin - 2000", "dataMax + 2000"]} />
          <Tooltip />
          <Line type="monotone" dataKey="rank" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
