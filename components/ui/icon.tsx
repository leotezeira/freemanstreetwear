import type { LucideIcon } from "lucide-react";

type IconProps = {
  icon: LucideIcon;
  size?: number;
  className?: string;
  decorative?: boolean;
  label?: string;
};

export function Icon({ icon: IconCmp, size = 18, className, decorative = true, label }: IconProps) {
  const ariaProps = decorative
    ? ({ "aria-hidden": true } as const)
    : ({ role: "img", "aria-label": label ?? "Icon" } as const);

  return <IconCmp size={size} className={className} {...ariaProps} />;
}
