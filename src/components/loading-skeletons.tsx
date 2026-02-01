import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton for dashboard stat cards
 */
export function DashboardStatsLoading() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4 rounded" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Loading skeleton for dashboard tables
 */
export function DashboardTableLoading({ rows = 5 }: { rows?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full max-w-md" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Loading skeleton for full page dashboard
 */
export function DashboardPageLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-6 w-96" />
      </div>

      <div className="space-y-8">
        <DashboardStatsLoading />
        <DashboardTableLoading rows={5} />
      </div>
    </div>
  );
}

/**
 * Loading skeleton for event form
 */
export function EventFormLoading() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent className="space-y-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Loading skeleton for attendance verification
 */
export function AttendanceDetailLoading() {
  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <Skeleton className="h-10 w-64 mb-8" />

      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="grid grid-cols-2 gap-4">
                  <div>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        {/* Photos skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <Skeleton className="aspect-[3/4] w-full rounded-lg" />
              <Skeleton className="aspect-[3/4] w-full rounded-lg" />
            </div>
          </CardContent>
        </Card>

        {/* Signature skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * T062: Loading skeleton for data tables (Phase 3.14)
 * Enhanced table skeleton with header and pagination
 */
export function DataTableLoading({ rows = 10 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {/* Table header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-64" /> {/* Search/filter */}
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" /> {/* Export button */}
          <Skeleton className="h-10 w-24" /> {/* Action button */}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        {/* Table header row */}
        <div className="border-b bg-muted/50 p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-4" /> {/* Checkbox */}
            <Skeleton className="h-4 w-32" /> {/* Column 1 */}
            <Skeleton className="h-4 w-24" /> {/* Column 2 */}
            <Skeleton className="h-4 w-24" /> {/* Column 3 */}
            <Skeleton className="h-4 w-20" /> {/* Column 4 */}
            <Skeleton className="h-4 w-16 ml-auto" /> {/* Actions */}
          </div>
        </div>

        {/* Table rows */}
        <div className="divide-y">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-4" /> {/* Checkbox */}
                <Skeleton className="h-4 w-32" /> {/* Column 1 */}
                <Skeleton className="h-4 w-24" /> {/* Column 2 */}
                <Skeleton className="h-4 w-24" /> {/* Column 3 */}
                <Skeleton className="h-4 w-20" /> {/* Column 4 */}
                <Skeleton className="h-8 w-16 ml-auto" /> {/* Actions */}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" /> {/* Row count */}
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" /> {/* Previous */}
          <Skeleton className="h-10 w-24" /> {/* Next */}
        </div>
      </div>
    </div>
  );
}

/**
 * T062: Loading skeleton for analytics charts
 */
export function ChartLoading() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full rounded" />
      </CardContent>
    </Card>
  );
}

/**
 * T062: Loading skeleton for filter panel
 */
export function FilterPanelLoading() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}
