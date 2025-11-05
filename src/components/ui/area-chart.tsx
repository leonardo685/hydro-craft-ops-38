"use client";

import React from "react";
import * as SubframeCore from "@subframe/core";
import { cn } from "@/lib/utils";

type DataPoint = Record<string, string | number>;

interface AreaChartRootProps
  extends Omit<
    React.ComponentProps<typeof SubframeCore.AreaChart>,
    "data" | "categories" | "index"
  > {
  data?: DataPoint[];
  categories?: string[];
  index?: string;
  stacked?: boolean;
  className?: string;
  colors?: string[];
}

const AreaChartRoot = React.forwardRef<
  React.ElementRef<typeof SubframeCore.AreaChart>,
  AreaChartRootProps
>(function AreaChartRoot(
  {
    data = [],
    categories = [],
    index = "",
    stacked = false,
    colors = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--secondary))", "#10b3a3"],
    className,
    ...otherProps
  }: AreaChartRootProps,
  ref
) {
  return (
    <div className="[&_.recharts-cartesian-grid]:hidden [&_.recharts-legend-wrapper]:!text-base [&_.recharts-legend-item-text]:!text-base [&_.recharts-legend-item-text]:!font-medium [&_.recharts-legend-item]:cursor-pointer [&_.recharts-legend-item]:px-2 [&_.recharts-legend-item]:py-1">
      <SubframeCore.AreaChart
        className={cn("h-80 w-full", className)}
        ref={ref}
        data={data}
        categories={categories}
        index={index}
        stacked={stacked}
        colors={colors}
        {...otherProps}
      />
    </div>
  );
});

export const AreaChart = AreaChartRoot;
export default AreaChart;
