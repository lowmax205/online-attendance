/**
 * Chart color utilities
 * Converts CSS custom properties to actual color values for Recharts
 */

/**
 * Get computed color from CSS custom property
 * Falls back to default colors if the property is not available
 */
export function getChartColor(variable: string): string {
  if (typeof window === "undefined") {
    // SSR fallback colors
    const fallbacks: Record<string, string> = {
      "--chart-1": "#ea580c", // Orange
      "--chart-2": "#06b6d4", // Cyan
      "--chart-3": "#8b5cf6", // Purple
      "--chart-4": "#facc15", // Yellow
      "--chart-5": "#f43f5e", // Rose/Pink
      "--primary": "#16a34a", // Green
    };
    return fallbacks[variable] || "#6b7280";
  }

  try {
    const style = getComputedStyle(document.documentElement);
    const color = style.getPropertyValue(variable).trim();

    if (color && color.startsWith("oklch")) {
      // Convert oklch to hsl for better compatibility
      return `oklch(${color.replace("oklch(", "").replace(")", "")})`;
    }

    if (color && color.startsWith("hsl")) {
      return color;
    }

    // Fallback to computed chart colors
    const fallbacks: Record<string, string> = {
      "--chart-1": "#ea580c",
      "--chart-2": "#06b6d4",
      "--chart-3": "#8b5cf6",
      "--chart-4": "#facc15",
      "--chart-5": "#f43f5e",
      "--primary": "#16a34a",
    };

    return fallbacks[variable] || "#6b7280";
  } catch {
    return "#6b7280";
  }
}

/**
 * Get all chart colors as an array
 */
export function getChartColors(): string[] {
  return [
    getChartColor("--chart-1"),
    getChartColor("--chart-2"),
    getChartColor("--chart-3"),
    getChartColor("--chart-4"),
    getChartColor("--chart-5"),
  ];
}
