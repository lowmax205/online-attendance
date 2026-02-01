"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface DashboardSearchInputProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  onSubmit: () => void;
  onClear?: () => void;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel?: string;
}

export function DashboardSearchInput({
  value,
  onChange,
  onSubmit,
  onClear,
  disabled = false,
  placeholder = "Search",
  ariaLabel = "Search",
}: DashboardSearchInputProps) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onSubmit();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      onChange(undefined);
      onClear?.();
    }
  };

  return (
    <div className="flex w-full gap-2 flex-col sm:flex-row sm:items-center">
      <div className="relative w-full min-w-0">
        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value ?? ""}
          onChange={(event) => {
            const nextValue = event.target.value;
            onChange(nextValue ? nextValue : undefined);
          }}
          placeholder={placeholder}
          className="pl-8 pr-8"
          disabled={disabled}
          aria-label={ariaLabel}
          type="search"
          onKeyDown={handleKeyDown}
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange(undefined);
              onClear?.();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onSubmit}
        disabled={disabled}
        className="w-full sm:w-auto"
      >
        <Search className="mr-2 h-4 w-4" />
        Search
      </Button>
    </div>
  );
}
