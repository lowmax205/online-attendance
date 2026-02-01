"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  EventTable,
  type EventRow,
} from "@/components/dashboard/moderator/event-management/event-table";
import { getEventQRForDownload } from "@/actions/events/download-qr";
import { EventForm } from "@/components/dashboard/moderator/event-management/event-form";
import { EventDetailDialog } from "@/components/dashboard/moderator/event-management/event-detail-dialog";
import {
  EventFilterMenu,
  type EventFilterValues,
} from "@/components/dashboard/moderator/event-management/event-filters";
import { DashboardSearchInput } from "@/components/dashboard/shared/dashboard-search-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { listEvents } from "@/actions/events/list";
import { deleteEvent } from "@/actions/events/delete";
import { EventStatus } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import { Plus, RefreshCw, ShieldAlert } from "lucide-react";

interface EventSummary {
  totalActive: number;
  totalCompleted: number;
  totalCancelled: number;
  upcomingEvents: number;
}

const EMPTY_SUMMARY: EventSummary = {
  totalActive: 0,
  totalCompleted: 0,
  totalCancelled: 0,
  upcomingEvents: 0,
};

interface EventManagementViewProps {
  title: string;
  description: string;
  scope: "mine" | "all";
  basePath: string;
  showCreateButton?: boolean;
  searchPlaceholder?: string;
  readOnly?: boolean;
  readOnlyMessage?: string;
}

type PageFilterValues = EventFilterValues & {
  search?: string;
};

const DEFAULT_FILTERS: PageFilterValues = {
  status: undefined,
  sortBy: "startDateTime",
  sortOrder: "desc",
  startDate: undefined,
  endDate: undefined,
  search: undefined,
};

export function EventManagementView({
  title,
  description,
  scope,
  basePath,
  showCreateButton = true,
  searchPlaceholder = "Search by event or venue",
  readOnly = false,
  readOnlyMessage,
}: EventManagementViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [events, setEvents] = React.useState<EventRow[]>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 20,
    totalPages: 0,
    totalItems: 0,
  });
  const [summary, setSummary] = React.useState<EventSummary>(EMPTY_SUMMARY);
  const [lastSyncedAt, setLastSyncedAt] = React.useState<Date | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchDraft, setSearchDraft] = React.useState<string | undefined>();
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [selectedEventId, setSelectedEventId] = React.useState<string | null>(
    null,
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [eventToDelete, setEventToDelete] = React.useState<string | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = React.useState(false);
  const [viewEventId, setViewEventId] = React.useState<string | null>(null);

  const PAGE_SIZE = 20;
  const searchParamsString = searchParams.toString();

  const appliedFilters = React.useMemo<PageFilterValues>(() => {
    const params = new URLSearchParams(searchParamsString);
    return {
      status: params.get("status") || undefined,
      sortBy: params.get("sortBy") || DEFAULT_FILTERS.sortBy,
      sortOrder: params.get("sortOrder") || DEFAULT_FILTERS.sortOrder,
      startDate: params.get("startDate") || undefined,
      endDate: params.get("endDate") || undefined,
      search: params.get("search") || undefined,
    } satisfies PageFilterValues;
  }, [searchParamsString]);

  React.useEffect(() => {
    setSearchDraft(appliedFilters.search);
  }, [appliedFilters.search]);

  const currentPage = React.useMemo(() => {
    const params = new URLSearchParams(searchParamsString);
    const pageValue = parseInt(params.get("page") || "1", 10);
    return Number.isNaN(pageValue) || pageValue < 1 ? 1 : pageValue;
  }, [searchParamsString]);

  const buildQueryString = React.useCallback(
    (filters: PageFilterValues, page: number) => {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);
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

  const fetchEvents = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await listEvents({
        page: currentPage,
        limit: PAGE_SIZE,
        status: appliedFilters.status as EventStatus | undefined,
        startDate: appliedFilters.startDate,
        endDate: appliedFilters.endDate,
        search: appliedFilters.search,
        sortBy: (appliedFilters.sortBy ?? DEFAULT_FILTERS.sortBy) as
          | "name"
          | "startDateTime"
          | "endDateTime"
          | "status"
          | "createdAt",
        sortOrder: (appliedFilters.sortOrder ?? DEFAULT_FILTERS.sortOrder) as
          | "asc"
          | "desc",
        scope,
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to fetch events");
      }

      setEvents(
        result.data.events.map((event) => ({
          id: event.id,
          name: event.name,
          startDateTime: new Date(event.startDateTime),
          endDateTime: new Date(event.endDateTime),
          status: event.status,
          venueName: event.venueName ?? "",
          _count: event._count,
        })) as EventRow[],
      );
      setPagination({
        pageIndex: currentPage - 1,
        pageSize: PAGE_SIZE,
        totalPages: result.data.pagination.totalPages,
        totalItems: result.data.pagination.total,
      });
      setSummary(result.data.summary ?? EMPTY_SUMMARY);
      setLastSyncedAt(new Date());
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to fetch events",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    appliedFilters.endDate,
    appliedFilters.search,
    appliedFilters.sortBy,
    appliedFilters.sortOrder,
    appliedFilters.startDate,
    appliedFilters.status,
    currentPage,
    scope,
    toast,
  ]);

  const fetchKey = React.useMemo(
    () =>
      [
        appliedFilters.status ?? "",
        appliedFilters.startDate ?? "",
        appliedFilters.endDate ?? "",
        appliedFilters.search ?? "",
        appliedFilters.sortBy ?? DEFAULT_FILTERS.sortBy,
        appliedFilters.sortOrder ?? DEFAULT_FILTERS.sortOrder,
        currentPage,
        scope,
      ].join("|"),
    [
      appliedFilters.endDate,
      appliedFilters.search,
      appliedFilters.sortBy,
      appliedFilters.sortOrder,
      appliedFilters.startDate,
      appliedFilters.status,
      currentPage,
      scope,
    ],
  );

  const lastFetchKeyRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (lastFetchKeyRef.current === fetchKey) {
      return;
    }
    lastFetchKeyRef.current = fetchKey;
    void fetchEvents();
  }, [fetchEvents, fetchKey]);

  const updateUrlParams = React.useCallback(
    (newFilters: PageFilterValues, page = 1) => {
      const nextQuery = buildQueryString(newFilters, page);
      const currentQuery = buildQueryString(appliedFilters, currentPage);
      if (nextQuery === currentQuery) {
        return;
      }

      const targetPath = nextQuery ? `${basePath}?${nextQuery}` : basePath;
      router.push(targetPath);
    },
    [appliedFilters, basePath, buildQueryString, currentPage, router],
  );

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

  const handleApplyFilters = (newFilters: EventFilterValues) => {
    const normalizedFilters: PageFilterValues = {
      ...appliedFilters,
      status: newFilters.status,
      startDate: newFilters.startDate,
      endDate: newFilters.endDate,
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

  const handleRefresh = () => {
    void fetchEvents();
  };

  const appliedFilterCount = React.useMemo(() => {
    let count = 0;
    if (appliedFilters.status) count += 1;
    if (appliedFilters.search) count += 1;
    if (appliedFilters.startDate) count += 1;
    if (appliedFilters.endDate) count += 1;
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

  const filterMenuValues: EventFilterValues = {
    status: appliedFilters.status,
    startDate: appliedFilters.startDate,
    endDate: appliedFilters.endDate,
    sortBy: appliedFilters.sortBy,
    sortOrder: appliedFilters.sortOrder,
  };

  const handleEdit = (eventId: string) => {
    if (readOnly) return;
    setSelectedEventId(eventId);
    setEditDialogOpen(true);
  };

  const handleView = (eventId: string) => {
    setViewEventId(eventId);
    setViewDialogOpen(true);
  };

  const handleDownloadQR = async (eventId: string) => {
    if (readOnly) return;
    try {
      const result = await getEventQRForDownload(eventId);
      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to download QR code");
      }

      // Force download even for hosted images by converting to a blob URL when needed
      let downloadUrl = result.data.dataUrl;
      let revokeUrl: string | undefined;
      if (!downloadUrl.startsWith("data:")) {
        const response = await fetch(downloadUrl);
        if (!response.ok) {
          throw new Error("Unable to fetch QR image for download");
        }
        const blob = await response.blob();
        downloadUrl = URL.createObjectURL(blob);
        revokeUrl = downloadUrl;
      }

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = result.data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (revokeUrl) URL.revokeObjectURL(revokeUrl);

      toast({
        title: "QR code downloaded",
        description: `Saved as ${result.data.filename}`,
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description:
          error instanceof Error ? error.message : "Unable to download QR code",
        variant: "destructive",
      });
    }
  };

  const handleDelete = (eventId: string) => {
    if (readOnly) return;
    setEventToDelete(eventId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = React.useCallback(async () => {
    if (!eventToDelete || readOnly) return;
    try {
      const result = await deleteEvent(eventToDelete);
      if (!result.success) {
        throw new Error(result.error || "Failed to delete event");
      }
      toast({
        title: "Event deleted",
        description: "Event has been deleted successfully",
      });
      setDeleteDialogOpen(false);
      setEventToDelete(null);
      void fetchEvents();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete event",
        variant: "destructive",
      });
    }
  }, [eventToDelete, fetchEvents, readOnly, toast]);

  const detailCountLabel = React.useMemo(() => {
    const firstItem = pagination.pageIndex * pagination.pageSize + 1;
    const lastItem = Math.min(
      (pagination.pageIndex + 1) * pagination.pageSize,
      pagination.totalItems,
    );
    if (pagination.totalItems === 0) {
      return "No events found";
    }
    return `Showing ${firstItem}-${lastItem} of ${pagination.totalItems} events`;
  }, [pagination.pageIndex, pagination.pageSize, pagination.totalItems]);

  return (
    <div className="container mx-auto space-y-8 py-8">
      {readOnly && (
        <Alert className="border-border/60">
          <ShieldAlert className="mt-0.5 h-4 w-4 text-muted-foreground" />
          <AlertTitle>View-only access</AlertTitle>
          <AlertDescription>
            {readOnlyMessage ??
              "You can review events from across the institution but cannot make changes with moderator permissions."}
          </AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{detailCountLabel}</span>
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
            <DashboardSearchInput
              value={searchDraft}
              onChange={handleSearchChange}
              onSubmit={handleSearchSubmit}
              onClear={handleSearchClear}
              disabled={isLoading}
              placeholder={searchPlaceholder}
              ariaLabel="Search events"
            />
            <div className="flex items-center gap-2">
              <EventFilterMenu
                values={filterMenuValues}
                onApplyFilters={handleApplyFilters}
                onClearFilters={handleClearFilters}
                isLoading={isLoading}
                activeFilterCount={appliedFilterCount}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </div>
        </div>
        {showCreateButton && !readOnly && (
          <div className="flex items-center justify-end">
            <Button asChild>
              <Link href="/dashboard/moderator/events/create">
                <Plus className="mr-2 h-4 w-4" />
                Create Event
              </Link>
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{pagination.totalItems}</p>
            <p className="text-xs text-muted-foreground">
              Across current filters
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
              Includes {summary.upcomingEvents} upcoming
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{summary.totalCompleted}</p>
            <p className="text-xs text-muted-foreground">Already finished</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{summary.totalCancelled}</p>
            <p className="text-xs text-muted-foreground">Called off events</p>
          </CardContent>
        </Card>
      </div>

      <EventTable
        events={events}
        pagination={pagination}
        onPaginationChange={handlePaginationChange}
        onView={handleView}
        onEdit={handleEdit}
        onDownloadQR={handleDownloadQR}
        onDelete={handleDelete}
        isLoading={isLoading}
        isReadOnly={readOnly}
      />

      {selectedEventId && !readOnly && (
        <EventForm
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) {
              setSelectedEventId(null);
            }
          }}
          mode="edit"
          eventId={selectedEventId}
          onSuccess={() => {
            setEditDialogOpen(false);
            setSelectedEventId(null);
            void fetchEvents();
          }}
        />
      )}

      <EventDetailDialog
        eventId={viewEventId}
        open={viewDialogOpen}
        onOpenChange={(open) => {
          setViewDialogOpen(open);
          if (!open) {
            setViewEventId(null);
          }
        }}
      />

      {!readOnly && (
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete event?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently remove the
                event and associated attendance records.
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
      )}
    </div>
  );
}
