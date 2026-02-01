"use client";

import * as React from "react";
import {
  FilterPanel,
  FilterConfig,
} from "@/components/dashboard/shared/filter-panel";
import { Role, AccountStatus } from "@prisma/client";

interface UserFiltersProps {
  values: {
    role?: string;
    accountStatus?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  };
  onFilterChange: (name: string, value: string | Date | undefined) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  isLoading?: boolean;
}

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
  { value: "email", label: "Email" },
  { value: "role", label: "Role" },
  { value: "createdAt", label: "Created Date" },
  { value: "lastLoginAt", label: "Last Login" },
];

const sortOrderOptions = [
  { value: "asc", label: "Ascending" },
  { value: "desc", label: "Descending" },
];

export function UserFilters({
  values,
  onFilterChange,
  onApplyFilters,
  onClearFilters,
  isLoading = false,
}: UserFiltersProps) {
  const filterConfig: FilterConfig[] = [
    {
      name: "role",
      type: "select",
      label: "Role",
      options: roleOptions,
      placeholder: "All Roles",
    },
    {
      name: "accountStatus",
      type: "select",
      label: "Account Status",
      options: statusOptions,
      placeholder: "All Statuses",
    },
    {
      name: "search",
      type: "search",
      label: "Search",
      placeholder: "Search by email or name...",
    },
    {
      name: "sortBy",
      type: "select",
      label: "Sort By",
      options: sortOptions,
      placeholder: "Sort by...",
    },
    {
      name: "sortOrder",
      type: "select",
      label: "Sort Order",
      options: sortOrderOptions,
      placeholder: "Order",
    },
  ];

  return (
    <FilterPanel
      filters={filterConfig}
      values={values}
      onFilterChange={onFilterChange}
      onApplyFilters={onApplyFilters}
      onClearFilters={onClearFilters}
      isLoading={isLoading}
    />
  );
}
