"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  UserTable,
  type UserRow,
} from "@/components/dashboard/admin/user-management/user-table";
import {
  UserFilterMenu,
  type UserFilterValues,
} from "@/components/dashboard/admin/user-management/user-filter-menu";
import { UserSearchInput } from "@/components/dashboard/admin/user-management/user-search-input";
import { UserEditDialog } from "@/components/dashboard/admin/user-management/user-edit-dialog";
import { UserCreateForm } from "@/components/dashboard/admin/user-management/user-create-form";
import { PasswordResetDialog } from "@/components/dashboard/admin/user-management/password-reset-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { listUsers, deleteUser } from "@/actions/admin/users";
import { Plus, ShieldAlert } from "lucide-react";
import { Role, AccountStatus } from "@prisma/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";

type UserSummary = {
  totalActive: number;
  totalSuspended: number;
  totalAdministrators: number;
  totalModerators: number;
};

const DEFAULT_FILTERS: UserFilterValues = {
  role: undefined,
  accountStatus: undefined,
  search: undefined,
  sortBy: "createdAt",
  sortOrder: "desc",
};

interface UserManagementClientProps {
  isReadOnly: boolean;
  userEmail: string;
}

export function UserManagementClient({
  isReadOnly,
  userEmail,
}: UserManagementClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [users, setUsers] = React.useState<UserRow[]>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
    totalPages: 0,
    totalItems: 0,
  });
  const [isLoading, setIsLoading] = React.useState(true);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<{
    id: string;
    email: string;
    role: Role;
    status: AccountStatus;
  } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [userToDelete, setUserToDelete] = React.useState<string | null>(null);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] =
    React.useState(false);
  const [userToResetPassword, setUserToResetPassword] = React.useState<{
    id: string;
    email: string;
  } | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = React.useState<Date | null>(null);
  const [summary, setSummary] = React.useState<UserSummary>({
    totalActive: 0,
    totalSuspended: 0,
    totalAdministrators: 0,
    totalModerators: 0,
  });
  const [readOnlyNotice, setReadOnlyNotice] = React.useState<string | null>(
    null,
  );

  const searchParamsString = searchParams.toString();

  const appliedFilters = React.useMemo<UserFilterValues>(() => {
    const params = new URLSearchParams(searchParamsString);
    return {
      role: params.get("role") || undefined,
      accountStatus: params.get("accountStatus") || undefined,
      search: params.get("search") || undefined,
      sortBy: params.get("sortBy") || DEFAULT_FILTERS.sortBy,
      sortOrder: params.get("sortOrder") || DEFAULT_FILTERS.sortOrder,
    } satisfies UserFilterValues;
  }, [searchParamsString]);

  const [searchDraft, setSearchDraft] = React.useState<string | undefined>(
    appliedFilters.search,
  );

  React.useEffect(() => {
    setSearchDraft(appliedFilters.search);
  }, [appliedFilters.search]);

  const currentPage = React.useMemo(() => {
    const params = new URLSearchParams(searchParamsString);
    const pageValue = parseInt(params.get("page") || "1", 10);
    return Number.isNaN(pageValue) || pageValue < 1 ? 1 : pageValue;
  }, [searchParamsString]);

  const PAGE_SIZE = 10;

  const buildQueryString = React.useCallback(
    (filters: UserFilterValues, page: number) => {
      const params = new URLSearchParams();
      if (filters.role) params.set("role", filters.role);
      if (filters.accountStatus)
        params.set("accountStatus", filters.accountStatus);
      if (filters.search) params.set("search", filters.search);
      if (filters.sortBy && filters.sortBy !== DEFAULT_FILTERS.sortBy)
        params.set("sortBy", filters.sortBy);
      if (filters.sortOrder && filters.sortOrder !== DEFAULT_FILTERS.sortOrder)
        params.set("sortOrder", filters.sortOrder);
      if (page > 1) params.set("page", page.toString());
      return params.toString();
    },
    [],
  );

  const fetchUsers = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await listUsers({
        page: currentPage,
        limit: PAGE_SIZE,
        role: appliedFilters.role as Role | undefined,
        status: appliedFilters.accountStatus as AccountStatus | undefined,
        search: appliedFilters.search,
        sortBy: (appliedFilters.sortBy ?? DEFAULT_FILTERS.sortBy) as
          | "email"
          | "role"
          | "createdAt"
          | "lastLoginAt",
        sortOrder: (appliedFilters.sortOrder ?? DEFAULT_FILTERS.sortOrder) as
          | "asc"
          | "desc",
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to fetch users");
      }

      const formattedUsers: UserRow[] = result.data.users.map((user) => {
        const fullName = [user.firstName, user.lastName]
          .filter(Boolean)
          .join(" ")
          .trim();

        return {
          id: user.id,
          email: user.email,
          fullName: fullName || user.email,
          role: user.role,
          accountStatus: user.accountStatus,
          statusChangeReason: user.statusChangeReason,
          lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : null,
          createdAt: new Date(user.createdAt),
          profile: user.profile
            ? {
                studentId: user.profile.studentId,
                department: user.profile.department,
                yearLevel: user.profile.yearLevel,
                section: user.profile.section,
              }
            : null,
        } satisfies UserRow;
      });

      setUsers(formattedUsers);
      setPagination({
        pageIndex: currentPage - 1,
        pageSize: PAGE_SIZE,
        totalPages: result.data.pagination.totalPages,
        totalItems: result.data.pagination.total,
      });
      setSummary(
        result.data.summary ?? {
          totalActive: 0,
          totalSuspended: 0,
          totalAdministrators: 0,
          totalModerators: 0,
        },
      );
      setLastSyncedAt(new Date());
      setReadOnlyNotice(
        result.message ??
          (isReadOnly
            ? "You have view-only access as a moderator. Administrative actions are disabled."
            : null),
      );
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    appliedFilters.accountStatus,
    appliedFilters.role,
    appliedFilters.search,
    appliedFilters.sortBy,
    appliedFilters.sortOrder,
    currentPage,
    isReadOnly,
    toast,
  ]);

  const fetchKey = React.useMemo(
    () =>
      [
        appliedFilters.role ?? "",
        appliedFilters.accountStatus ?? "",
        appliedFilters.search ?? "",
        appliedFilters.sortBy ?? DEFAULT_FILTERS.sortBy,
        appliedFilters.sortOrder ?? DEFAULT_FILTERS.sortOrder,
        currentPage,
      ].join("|"),
    [
      appliedFilters.accountStatus,
      appliedFilters.role,
      appliedFilters.search,
      appliedFilters.sortBy,
      appliedFilters.sortOrder,
      currentPage,
    ],
  );

  const lastFetchKeyRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (lastFetchKeyRef.current === fetchKey) {
      return;
    }
    lastFetchKeyRef.current = fetchKey;
    void fetchUsers();
  }, [fetchKey, fetchUsers]);

  const updateUrlParams = (newFilters: UserFilterValues, page = 1) => {
    const nextQuery = buildQueryString(newFilters, page);
    const currentQuery = buildQueryString(appliedFilters, currentPage);
    if (nextQuery === currentQuery) {
      return;
    }

    const targetPath = nextQuery
      ? `/dashboard/admin/users?${nextQuery}`
      : "/dashboard/admin/users";
    router.push(targetPath);
  };

  const handleSearchChange = (value: string | undefined) => {
    setSearchDraft(value);
  };

  const handleSearchSubmit = () => {
    const normalizedSearch =
      searchDraft && searchDraft.trim().length > 0 ? searchDraft : undefined;

    if ((appliedFilters.search ?? undefined) === normalizedSearch) {
      return;
    }

    updateUrlParams(
      {
        ...appliedFilters,
        search: normalizedSearch,
      },
      1,
    );
  };

  const handleSearchClear = () => {
    setSearchDraft(undefined);
    if (appliedFilters.search) {
      updateUrlParams(
        {
          ...appliedFilters,
          search: undefined,
        },
        1,
      );
    }
  };

  const handleApplyFilters = (newFilters: UserFilterValues) => {
    const normalizedFilters: UserFilterValues = {
      role: newFilters.role,
      accountStatus: newFilters.accountStatus,
      search: newFilters.search ?? appliedFilters.search,
      sortBy: newFilters.sortBy ?? DEFAULT_FILTERS.sortBy,
      sortOrder: newFilters.sortOrder ?? DEFAULT_FILTERS.sortOrder,
    };
    updateUrlParams(normalizedFilters, 1);
  };

  const handleClearFilters = () => {
    updateUrlParams(DEFAULT_FILTERS, 1);
  };

  const handlePaginationChange = (pageIndex: number) => {
    updateUrlParams(appliedFilters, pageIndex + 1);
  };

  const appliedFilterCount = React.useMemo(() => {
    let count = 0;
    if (appliedFilters.role) count += 1;
    if (appliedFilters.accountStatus) count += 1;
    if (appliedFilters.search) count += 1;
    if (
      appliedFilters.sortBy &&
      appliedFilters.sortBy !== DEFAULT_FILTERS.sortBy
    )
      count += 1;
    if (
      appliedFilters.sortOrder &&
      appliedFilters.sortOrder !== DEFAULT_FILTERS.sortOrder
    )
      count += 1;
    return count;
  }, [appliedFilters]);

  const handleEditUser = (user: UserRow) => {
    if (isReadOnly) return;
    setSelectedUser({
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.accountStatus,
    });
    setEditDialogOpen(true);
  };

  const handleResetPassword = (userId: string) => {
    if (isReadOnly) return;
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    setUserToResetPassword({ id: userId, email: user.email });
    setResetPasswordDialogOpen(true);
  };

  const handleDelete = (userId: string) => {
    if (isReadOnly) return;
    setUserToDelete(userId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete || isReadOnly) return;
    try {
      const result = await deleteUser({ userId: userToDelete });
      if (!result.success)
        throw new Error(result.error || "Failed to delete user");
      toast({
        title: "User deleted",
        description: "User has been deleted successfully",
      });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto space-y-8 py-8">
      {(isReadOnly || readOnlyNotice) && (
        <Alert className="border-border/60">
          <ShieldAlert className="mt-0.5 h-4 w-4 text-muted-foreground" />
          <AlertTitle>View-only access</AlertTitle>
          <AlertDescription>
            {readOnlyNotice ??
              "Moderators can review user information but cannot make changes."}
          </AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight">
            User Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage users, roles, and account status across the platform.
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>
              Showing {users.length} of {pagination.totalItems} user
              {pagination.totalItems === 1 ? "" : "s"}
            </span>
            {lastSyncedAt && (
              <>
                <span>•</span>
                <span>
                  Synced{" "}
                  {formatDistanceToNow(lastSyncedAt, { addSuffix: true })}
                </span>
              </>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <UserSearchInput
              value={searchDraft}
              onChange={handleSearchChange}
              onSubmit={handleSearchSubmit}
              onClear={handleSearchClear}
              disabled={isLoading}
            />
            <UserFilterMenu
              values={appliedFilters}
              onApplyFilters={handleApplyFilters}
              onClearFilters={handleClearFilters}
              isLoading={isLoading}
              activeFilterCount={appliedFilterCount}
            />
          </div>
        </div>
        <div className="flex items-center justify-end">
          <Button
            onClick={() => {
              if (isReadOnly) return;
              setCreateDialogOpen(true);
            }}
            disabled={isReadOnly}
            title={
              isReadOnly
                ? "Moderators have view-only access to user management"
                : undefined
            }
            variant={isReadOnly ? "outline" : "default"}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create User
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{pagination.totalItems}</p>
            <p className="text-xs text-muted-foreground">
              Across the entire system
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{summary.totalActive}</p>
            <p className="text-xs text-muted-foreground">
              Ready to participate across the entire system
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{summary.totalSuspended}</p>
            <p className="text-xs text-muted-foreground">
              Awaiting follow-up across the entire system
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Admin team</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {summary.totalAdministrators + summary.totalModerators}
            </p>
            <p className="text-xs text-muted-foreground">
              Administrators &amp; moderators across the entire system
            </p>
          </CardContent>
        </Card>
      </div>

      <UserTable
        users={users}
        pagination={pagination}
        onPaginationChange={handlePaginationChange}
        onEditUser={handleEditUser}
        onResetPassword={handleResetPassword}
        onDelete={handleDelete}
        isLoading={isLoading}
        isReadOnly={isReadOnly}
      />

      {!isReadOnly && (
        <>
          <UserCreateForm
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            onSuccess={() => {
              setCreateDialogOpen(false);
              fetchUsers();
            }}
          />

          {selectedUser && (
            <UserEditDialog
              open={editDialogOpen}
              onOpenChange={setEditDialogOpen}
              userId={selectedUser.id}
              currentRole={selectedUser.role}
              currentStatus={selectedUser.status}
              currentUserEmail={selectedUser.email}
              isCurrentUser={selectedUser.email === userEmail}
              onSuccess={() => {
                setEditDialogOpen(false);
                fetchUsers();
              }}
            />
          )}

          <PasswordResetDialog
            open={resetPasswordDialogOpen}
            onOpenChange={setResetPasswordDialogOpen}
            userId={userToResetPassword?.id ?? null}
            userEmail={userToResetPassword?.email ?? ""}
          />

          <AlertDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  user account and all associated data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
