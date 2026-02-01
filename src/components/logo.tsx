import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  href?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  showText?: boolean;
}

const sizeClasses = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

const textSizeClasses = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-2xl",
};

export function Logo({
  href,
  size = "md",
  className,
  showText = true,
}: LogoProps) {
  const logoContent = (
    <div className={cn("flex items-center space-x-2", className)}>
      <Image
        src="/images/logo.svg"
        alt="Event Attendance System Logo"
        width={size === "sm" ? 24 : size === "md" ? 32 : 48}
        height={size === "sm" ? 24 : size === "md" ? 32 : 48}
        className={cn(sizeClasses[size], "bg-foreground rounded-full p-0")}
        priority
      />
      <Image
        src="/images/USC-Logo.png"
        alt="USC Logo"
        width={size === "sm" ? 24 : size === "md" ? 32 : 48}
        height={size === "sm" ? 24 : size === "md" ? 32 : 48}
        className={cn(sizeClasses[size], "bg-foreground rounded-full p-0")}
        priority
        unoptimized
      />

      {showText && (
        <span className={cn("font-bold", textSizeClasses[size])}>
          Event Attendance
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="flex items-center hover:opacity-80 transition-opacity"
      >
        {logoContent}
      </Link>
    );
  }

  return logoContent;
}
