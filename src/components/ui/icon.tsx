import type { ComponentType, SVGProps } from "react";
import type { LucideProps } from "lucide-react";

/**
 * LinkTroo icon system — one library (lucide), outline/stroke only.
 *
 * Size tokens (px):
 *   sm  — inline with small text, tight buttons          13
 *   md  — default for buttons, rows, labels              15
 *   lg  — section headers, prominent controls            18
 *   xl  — hero / feature icons                           24
 *
 * Stroke width is fixed at 1.75 for visual consistency across all sizes.
 * Icons inherit `currentColor` and follow text color, hover, active and
 * disabled states automatically.
 */
const SIZES = { sm: 13, md: 15, lg: 18, xl: 24 } as const;

export type IconSize = keyof typeof SIZES;

interface IconProps extends Omit<LucideProps, "size" | "strokeWidth"> {
  as: ComponentType<SVGProps<SVGSVGElement> & LucideProps>;
  size?: IconSize | number;
  strokeWidth?: number;
  className?: string;
}

export function Icon({ as: Cmp, size = "md", strokeWidth = 1.75, className = "", ...rest }: IconProps) {
  const px = typeof size === "number" ? size : SIZES[size];
  return <Cmp size={px} strokeWidth={strokeWidth} aria-hidden="true" className={`shrink-0 ${className}`} {...rest} />;
}
