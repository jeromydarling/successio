"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import { formatUsdCompact } from "@/lib/utils";

interface RevenueSparklineProps {
  data: { year: number; revenue: number }[];
  className?: string;
}

/**
 * A compact, animated area+line chart of revenue over the life of the
 * business. Hand-rolled SVG (no chart dep) so it stays light and the path
 * can "draw" itself on scroll-in.
 */
export function RevenueSparkline({ data, className }: RevenueSparklineProps) {
  const W = 720;
  const H = 220;
  const PAD = 28;

  const { linePath, areaPath, points, min, max } = useMemo(() => {
    const revenues = data.map((d) => d.revenue);
    const min = Math.min(...revenues);
    const max = Math.max(...revenues);
    const span = max - min || 1;

    const x = (i: number) => PAD + (i / (data.length - 1)) * (W - PAD * 2);
    const y = (rev: number) =>
      H - PAD - ((rev - min) / span) * (H - PAD * 2);

    const points = data.map((d, i) => ({ cx: x(i), cy: y(d.revenue), ...d }));
    const linePath = points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.cx.toFixed(1)} ${p.cy.toFixed(1)}`)
      .join(" ");
    const areaPath = `${linePath} L ${points[points.length - 1].cx.toFixed(1)} ${H - PAD} L ${points[0].cx.toFixed(1)} ${H - PAD} Z`;

    return { linePath, areaPath, points, min, max };
  }, [data]);

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between mb-3">
        <span className="text-xs uppercase tracking-[0.18em] text-ink-faint font-mono">
          Revenue, {data[0].year}—{data[data.length - 1].year}
        </span>
        <span className="text-xs text-ink-soft font-mono">
          {formatUsdCompact(min)} → <span className="text-emerald-400">{formatUsdCompact(max)}</span>
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto overflow-visible"
        role="img"
        aria-label="Revenue growth over the life of the business"
      >
        <defs>
          <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(52,211,153,0.28)" />
            <stop offset="100%" stopColor="rgba(52,211,153,0)" />
          </linearGradient>
        </defs>

        <motion.path
          d={areaPath}
          fill="url(#rev-fill)"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, delay: 0.6 }}
        />
        <motion.path
          d={linePath}
          fill="none"
          stroke="#34d399"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
        />
        {points.map((p, i) => (
          <motion.circle
            key={p.year}
            cx={p.cx}
            cy={p.cy}
            r={3.5}
            fill="#0a0c10"
            stroke="#34d399"
            strokeWidth={2}
            initial={{ scale: 0, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: 0.8 + i * 0.08 }}
          />
        ))}
      </svg>
    </div>
  );
}
