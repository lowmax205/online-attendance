"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export type FilterConfig =
  | {
      name: string;
      type: "select";
      label: string;
      options: { value: string; label: string }[];
      placeholder?: string;
    }
  | {
      name: string;
      type: "search";
      label: string;
      placeholder?: string;
    }
  | {
      name: string;
      type: "date";
      label: string;
      placeholder?: string;
    }
  | {
      name: string;
      type: "daterange";
      label: string;
      startName: string;
      endName: string;
      startLabel?: string;
      endLabel?: string;
    };

interface FilterPanelProps {
  filters: FilterConfig[];
  values: Record<string, string | Date | undefined>;
  onFilterChange: (name: string, value: string | Date | undefined) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  isLoading?: boolean;
}

export function FilterPanel({
  filters,
  values,
  onFilterChange,
  onApplyFilters,
  onClearFilters,
  isLoading = false,
}: FilterPanelProps) {
  return (
    <div className="space-y-4 rounded-lg border p-4 bg-card">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filters.map((filter) => (
          <div key={filter.name} className="space-y-2">
            {filter.type === "select" && (
              <>
                <Label htmlFor={filter.name}>{filter.label}</Label>
                <Select
                  value={(values[filter.name] as string) || ""}
                  onValueChange={(value) =>
                    onFilterChange(filter.name, value || undefined)
                  }
                  disabled={isLoading}
                >
                  <SelectTrigger id={filter.name} aria-label={filter.label}>
                    <SelectValue
                      placeholder={
                        filter.placeholder || `Select ${filter.label}`
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {filter.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}

            {filter.type === "search" && (
              <>
                <Label htmlFor={filter.name}>{filter.label}</Label>
                <div className="relative">
                  <Input
                    id={filter.name}
                    type="text"
                    placeholder={filter.placeholder || `Search ${filter.label}`}
                    value={(values[filter.name] as string) || ""}
                    onChange={(e) =>
                      onFilterChange(filter.name, e.target.value || undefined)
                    }
                    disabled={isLoading}
                    aria-label={filter.label}
                    className="pr-8"
                  />
                  {values[filter.name] && (
                    <button
                      type="button"
                      onClick={() => onFilterChange(filter.name, undefined)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={`Clear ${filter.label}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </>
            )}

            {filter.type === "date" && (
              <>
                <Label htmlFor={filter.name}>{filter.label}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id={filter.name}
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !values[filter.name] && "text-muted-foreground",
                      )}
                      disabled={isLoading}
                      aria-label={filter.label}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {values[filter.name] instanceof Date
                        ? format(values[filter.name] as Date, "PPP")
                        : filter.placeholder || "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={values[filter.name] as Date | undefined}
                      onSelect={(date) => onFilterChange(filter.name, date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </>
            )}

            {filter.type === "daterange" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor={filter.startName}>
                    {filter.startLabel || "Start Date"}
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id={filter.startName}
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !values[filter.startName] && "text-muted-foreground",
                        )}
                        disabled={isLoading}
                        aria-label={filter.startLabel || "Start Date"}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {values[filter.startName] instanceof Date
                          ? format(values[filter.startName] as Date, "PPP")
                          : "Start date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={values[filter.startName] as Date | undefined}
                        onSelect={(date) =>
                          onFilterChange(filter.startName, date)
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={filter.endName}>
                    {filter.endLabel || "End Date"}
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id={filter.endName}
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !values[filter.endName] && "text-muted-foreground",
                        )}
                        disabled={isLoading}
                        aria-label={filter.endLabel || "End Date"}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {values[filter.endName] instanceof Date
                          ? format(values[filter.endName] as Date, "PPP")
                          : "End date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={values[filter.endName] as Date | undefined}
                        onSelect={(date) =>
                          onFilterChange(filter.endName, date)
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={onApplyFilters}
          disabled={isLoading}
          aria-label="Apply filters"
        >
          Apply Filters
        </Button>
        <Button
          variant="outline"
          onClick={onClearFilters}
          disabled={isLoading}
          aria-label="Clear all filters"
        >
          Clear Filters
        </Button>
      </div>
    </div>
  );
}
