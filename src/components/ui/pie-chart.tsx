"use client";

import React from "react";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { cn } from "@/lib/utils";

interface PieChartData {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface PieChartProps {
  data: PieChartData[];
  colors?: string[];
  className?: string;
  showLegend?: boolean;
  innerRadius?: number;
  outerRadius?: number;
}

const COLORS = [
  '#10b981', // green
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border bg-background/95 p-3 text-sm shadow-md backdrop-blur-sm">
        <p className="font-semibold text-foreground">{payload[0].name}</p>
        <p className="text-muted-foreground">
          {new Intl.NumberFormat('pt-BR', { 
            style: 'currency', 
            currency: 'BRL' 
          }).format(payload[0].value)}
        </p>
        <p className="text-xs text-muted-foreground">
          {payload[0].percent ? `${(payload[0].percent * 100).toFixed(1)}%` : ''}
        </p>
      </div>
    );
  }
  return null;
};

export function PieChart({ 
  data, 
  colors = COLORS, 
  className,
  showLegend = true,
  innerRadius = 0,
  outerRadius = 80
}: PieChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%" className={cn(className)}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          fill="#8884d8"
          dataKey="value"
          label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
          labelLine={true}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        {showLegend && <Legend />}
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}

export default PieChart;
