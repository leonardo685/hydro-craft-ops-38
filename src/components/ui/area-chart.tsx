"use client";

import React, { useState } from "react";
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
  const [visibleCategories, setVisibleCategories] = useState<string[]>(categories);

  const toggleCategory = (category: string) => {
    setVisibleCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const activeCategoryIndexes = visibleCategories
    .map((cat) => categories.indexOf(cat))
    .filter((idx) => idx !== -1);

  const activeColors = activeCategoryIndexes.map((idx) => colors[idx]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 justify-center">
        {categories.map((category, index) => {
          const isVisible = visibleCategories.includes(category);
          return (
            <button
              key={category}
              onClick={() => toggleCategory(category)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md transition-all text-lg font-semibold",
                isVisible
                  ? "opacity-100 hover:opacity-80"
                  : "opacity-40 hover:opacity-60"
              )}
            >
              <span
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: colors[index] }}
              />
              <span>{category}</span>
            </button>
          );
        })}
      </div>
      <div className="[&_.recharts-cartesian-grid]:hidden">
        <SubframeCore.AreaChart
          className={cn("h-80 w-full", className)}
          ref={ref}
          data={data}
          categories={visibleCategories}
          index={index}
          stacked={stacked}
          colors={activeColors}
          {...otherProps}
        />
      </div>
    </div>
  );
});

export const AreaChart = AreaChartRoot;
export default AreaChart;
