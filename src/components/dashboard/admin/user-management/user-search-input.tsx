"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface UserSearchInputProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  onSubmit: () => void;
  onClear?: () => void;
  disabled?: boolean;
}

export function UserSearchInput({
  value,
  onChange,
  onSubmit,
  onClear,
  disabled = false,
}: UserSearchInputProps) {
  return (
    <div className="relative w-full min-w-0 sm:w-64">
      <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value ?? ""}
        onChange={(event) => {
          const nextValue = event.target.value;
          onChange(nextValue ? nextValue : undefined);
        }}
        placeholder="Search by name or email"
        className="pl-8"
        disabled={disabled}
        aria-label="Search users"
        type="search"
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onSubmit();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            onChange(undefined);
            onClear?.();
          }
        }}
      />
    </div>
  );
}
