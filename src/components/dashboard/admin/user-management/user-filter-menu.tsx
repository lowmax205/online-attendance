"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AccountStatus, Role } from "@prisma/client";
import { Filter, RotateCcw } from "lucide-react";

export type UserFilterValues = {
  role?: string;
  accountStatus?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
};

interface UserFilterMenuProps {
  values: UserFilterValues;
  onApplyFilters: (values: UserFilterValues) => void;
  onClearFilters: () => void;
  isLoading?: boolean;
  activeFilterCount?: number;
}

const ROLE_ALL = "__all_roles";
const STATUS_ALL = "__all_statuses";

const roleOptions = [
  { value: Role.Student, label: "Student" },
  { value: Role.Moderator, label: "Moderator" },
  { value: Role.Administrator, label: "Administrator" },
];

const statusOptions = [
  { value: AccountStatus.ACTIVE, label: "Active" },
  { value: AccountStatus.SUSPENDED, label: "Suspended" },
];

const sortOptions = [
  { value: "createdAt", label: "Newest" },
  { value: "lastLoginAt", label: "Last Login" },
  { value: "email", label: "Email" },
  { value: "role", label: "Role" },
];

const sortOrderOptions = [
  { value: "desc", label: "Descending" },
  { value: "asc", label: "Ascending" },
];

export function UserFilterMenu({
  values,
  onApplyFilters,
  onClearFilters,
  isLoading = false,
  activeFilterCount = 0,
}: UserFilterMenuProps) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<UserFilterValues>(values);

  React.useEffect(() => {
    if (!open) {
      setDraft(values);
    }
  }, [values, open]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setDraft(values);
    }
  };

  const handleApply = () => {
    onApplyFilters(draft);
    setOpen(false);
  };

  const handleClear = () => {
    onClearFilters();
    setOpen(false);
  };
  const roleValue = draft.role ?? ROLE_ALL;
  const statusValue = draft.accountStatus ?? STATUS_ALL;
  const sortValue = draft.sortBy ?? "createdAt";
  const sortOrderValue = draft.sortOrder ?? "desc";

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          aria-label="Toggle user filters"
          disabled={isLoading && !open}
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge
              variant="secondary"
              className="ml-1 rounded-full px-2 py-0 text-xs"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" sideOffset={8}>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="user-role">Role</Label>
              <Select
                value={roleValue}
                onValueChange={(value) =>
                  setDraft((prev) => ({
                    ...prev,
                    role: value === ROLE_ALL ? undefined : value,
                  }))
                }
                disabled={isLoading}
              >
                <SelectTrigger id="user-role">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ROLE_ALL}>All roles</SelectItem>
                  {roleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-status">Account Status</Label>
              <Select
                value={statusValue}
                onValueChange={(value) =>
                  setDraft((prev) => ({
                    ...prev,
                    accountStatus: value === STATUS_ALL ? undefined : value,
                  }))
                }
                disabled={isLoading}
              >
                <SelectTrigger id="user-status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={STATUS_ALL}>All statuses</SelectItem>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-sort">Sort By</Label>
              <Select
                value={sortValue}
                onValueChange={(value) =>
                  setDraft((prev) => ({
                    ...prev,
                    sortBy: value,
                  }))
                }
                disabled={isLoading}
              >
                <SelectTrigger id="user-sort">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-sort-order">Sort Order</Label>
              <Select
                value={sortOrderValue}
                onValueChange={(value) =>
                  setDraft((prev) => ({
                    ...prev,
                    sortOrder: value,
                  }))
                }
                disabled={isLoading}
              >
                <SelectTrigger id="user-sort-order">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortOrderOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
              disabled={isLoading}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              disabled={isLoading}
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
