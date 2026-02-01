import { cn } from "@/lib/utils";

interface SimpleIconProps {
  icon: {
    title: string;
    slug: string;
    hex: string;
    path: string;
  };
  className?: string;
  size?: number;
}

export function SimpleIcon({ icon, className, size = 16 }: SimpleIconProps) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      className={cn("inline-block", className)}
      fill="currentColor"
    >
      <title>{icon.title}</title>
      <path d={icon.path} />
    </svg>
  );
}
