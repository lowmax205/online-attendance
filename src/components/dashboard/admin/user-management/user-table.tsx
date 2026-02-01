"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/dashboard/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, UserCog, Trash2, KeyRound, Info } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { AccountStatus, Role } from "@prisma/client";

export interface UserRow {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  accountStatus: AccountStatus;
  statusChangeReason?: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  profile?: {
    studentId?: string | null;
    department?: string | null;
    yearLevel?: number | null;
    section?: string | null;
  } | null;
}

interface UserTableProps {
  users: UserRow[];
  pagination: {
    pageIndex: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
  };
  onPaginationChange: (pageIndex: number) => void;
  onEditUser: (user: UserRow) => void;
  onResetPassword: (userId: string) => void;
  onDelete: (userId: string) => void;
  isLoading?: boolean;
  isReadOnly?: boolean;
}

export function UserTable({
  users,
  pagination,
  onPaginationChange,
  onEditUser,
  onResetPassword,
  onDelete,
  isLoading = false,
  isReadOnly = false,
}: UserTableProps) {
  const columns = React.useMemo<ColumnDef<UserRow>[]>(() => {
    const baseColumns: ColumnDef<UserRow>[] = [
      {
        accessorKey: "fullName",
        header: "User",
        cell: ({ row }) => {
          const user = row.original;
          const initials =
            (user.fullName || user.email)
              .split(" ")
              .filter(Boolean)
              .map((part) => part.charAt(0).toUpperCase())
              .join("")
              .slice(0, 2) || user.email.charAt(0).toUpperCase();

          return (
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">
                  {user.fullName}
                </p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => {
          const role = row.getValue("role") as Role;
          const roleColors: Record<Role, string> = {
            Student:
              "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
            Moderator:
              "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
            Administrator:
              "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
          };
          return (
            <Badge variant="outline" className={roleColors[role]}>
              {role}
            </Badge>
          );
        },
      },
      {
        accessorKey: "accountStatus",
        header: "Status",
        cell: ({ row }) => {
          const status = row.getValue("accountStatus") as AccountStatus;
          const statusChangeReason = row.original.statusChangeReason;
          const statusColors: Record<AccountStatus, string> = {
            ACTIVE:
              "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
            SUSPENDED:
              "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
          };

          const statusBadge = (
            <Badge variant="outline" className={statusColors[status]}>
              {status}
            </Badge>
          );

          // If suspended and has a reason, show it in a tooltip
          if (status === "SUSPENDED" && statusChangeReason) {
            return (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 cursor-help">
                      {statusBadge}
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm font-semibold mb-1">
                      Suspension Reason:
                    </p>
                    <p className="text-sm">{statusChangeReason}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          }

          return statusBadge;
        },
      },
      {
        id: "affiliation",
        header: "Affiliation",
        accessorFn: (user) => user.profile?.department ?? "",
        cell: ({ row }) => {
          const { role, profile } = row.original;

          if (!profile) {
            return (
              <span className="text-sm text-muted-foreground">
                {role === "Student" ? "No profile" : "—"}
              </span>
            );
          }

          const details = [
            profile.department,
            profile.yearLevel ? `Year ${profile.yearLevel}` : null,
            profile.section ? `Section ${profile.section}` : null,
          ]
            .filter(Boolean)
            .join(" • ");

          return (
            <div className="space-y-1">
              {profile.studentId && (
                <p className="text-sm font-medium">{profile.studentId}</p>
              )}
              {details ? (
                <p className="text-xs text-muted-foreground">{details}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Profile on file</p>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "lastLoginAt",
        header: "Last Login",
        cell: ({ row }) => {
          const lastLogin = row.getValue("lastLoginAt") as Date | null;
          if (!lastLogin) {
            return <span className="text-muted-foreground">Never</span>;
          }
          return (
            <div className="space-y-0.5 text-sm">
              <span className="font-medium">
                {format(lastLogin, "MMM dd, yyyy")}
              </span>
              <span className="block text-xs text-muted-foreground">
                {format(lastLogin, "HH:mm")} •{" "}
                {formatDistanceToNow(lastLogin, { addSuffix: true })}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: "Joined",
        cell: ({ row }) => {
          const joined = row.getValue("createdAt") as Date;
          return (
            <div className="space-y-0.5 text-sm">
              <span className="font-medium">
                {format(joined, "MMM dd, yyyy")}
              </span>
              <span className="block text-xs text-muted-foreground">
                {formatDistanceToNow(joined, { addSuffix: true })}
              </span>
            </div>
          );
        },
      },
    ];

    if (!isReadOnly) {
      baseColumns.push(
        {
          accessorKey: "id",
          header: "User ID",
          cell: ({ row }) => {
            const userId = row.getValue("id") as string;
            return (
              <div className="font-mono text-xs text-muted-foreground">
                {userId}
              </div>
            );
          },
        },
        {
          id: "actions",
          header: "Actions",
          cell: ({ row }) => {
            const user = row.original;

            return (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    aria-label="Open menu"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onEditUser(user)}
                    className="cursor-pointer"
                  >
                    <UserCog className="mr-2 h-4 w-4" />
                    <span>Edit User</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onResetPassword(user.id)}
                    className="cursor-pointer"
                  >
                    <KeyRound className="mr-2 h-4 w-4" />
                    <span>Reset Password</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(user.id)}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete User</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            );
          },
        },
      );
    }

    return baseColumns;
  }, [isReadOnly, onDelete, onEditUser, onResetPassword]);

  return (
    <DataTable
      columns={columns}
      data={users}
      pagination={pagination}
      onPaginationChange={onPaginationChange}
      isLoading={isLoading}
    />
  );
}
