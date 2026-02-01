"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

/**
 * T056: TimePeriodFilter Component
 * Phase 3.12 - UI Components - Analytics Dashboard
 *
 * Provides preset date ranges and custom range picker for analytics filtering
 */

interface TimePeriodFilterProps {
  value: {
    preset: string;
    customRange?: DateRange;
  };
  onChange: (value: { preset: string; customRange?: DateRange }) => void;
  onRefresh: () => void;
  isLoading?: boolean;
  clickThroughEnabled?: boolean;
  onClickThroughToggle?: (enabled: boolean) => void;
  metadata?: {
    generatedAt: string;
    queryTimeMs: number;
    cacheHit?: boolean;
  };
}

const presets = [
  { value: "7days", label: "Last 7 Days" },
  { value: "30days", label: "Last 30 Days" },
  { value: "90days", label: "Last 90 Days" },
  { value: "custom", label: "Custom Range" },
];

export function TimePeriodFilter({
  value,
  onChange,
  onRefresh,
  isLoading = false,
  metadata,
}: TimePeriodFilterProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handlePresetChange = (preset: string) => {
    onChange({ preset, customRange: undefined });
  };

  const handleCustomRangeChange = (range: DateRange | undefined) => {
    if (range) {
      onChange({ preset: "custom", customRange: range });
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Select value={value.preset} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            {presets.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {value.preset === "custom" && (
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[280px] justify-start text-left font-normal",
                  !value.customRange && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value.customRange?.from ? (
                  value.customRange.to ? (
                    <>
                      {format(value.customRange.from, "LLL dd, y")} -{" "}
                      {format(value.customRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(value.customRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={value.customRange?.from}
                selected={value.customRange}
                onSelect={handleCustomRangeChange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        )}
      </div>

      <div className="flex items-center gap-4">
        {metadata && !isLoading && (
          <div className="text-xs text-muted-foreground whitespace-nowrap">
            Last updated: {new Date(metadata.generatedAt).toLocaleString()}
            {metadata.cacheHit && " (cached)"} • Query time:{" "}
            {metadata.queryTimeMs}ms
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
        >
          <RefreshCw
            className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")}
          />
          Refresh Data
        </Button>
      </div>
    </div>
  );
}
