/**
 * MiniSparkline — tiny inline trend line for KPI tiles (S2.4)
 *
 * Pure SVG, no recharts dep, sized to fit inside a compact KPI tile.
 * Renders nothing when fewer than 2 data points are available.
 */
import { memo } from 'react';

interface MiniSparklineProps {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
  /** Tailwind stroke color class — must use semantic token */
  strokeClassName?: string;
}

export const MiniSparkline = memo(function MiniSparkline({
  values,
  width = 80,
  height = 18,
  className,
  strokeClassName = 'stroke-current',
}: MiniSparklineProps) {
  if (!values || values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);

  const points = values
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  // area path (polyline + base)
  const last = values.length - 1;
  const areaPath = `M0,${height} L${points
    .split(' ')
    .join(' L')} L${(last * stepX).toFixed(1)},${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
    >
      <path d={areaPath} fill="currentColor" opacity={0.12} />
      <polyline
        points={points}
        fill="none"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={strokeClassName}
      />
    </svg>
  );
});

export default MiniSparkline;
