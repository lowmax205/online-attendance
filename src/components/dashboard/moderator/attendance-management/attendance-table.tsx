"use client";

import * as React from "react";
import { DataTable } from "@/components/dashboard/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, CheckCircle } from "lucide-react";
import { VerificationStatus } from "@prisma/client";
import { format } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";

export interface AttendanceRow {
  id: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    UserProfile: {
      studentId: string;
      department: string;
      yearLevel: number;
      section: string | null;
      contactNumber: string | null;
    } | null;
  };
  event: {
    id: string;
    name: string;
  };
  checkInSubmittedAt: Date;
  checkOutSubmittedAt?: Date | null;
  verificationStatus: VerificationStatus;
  checkInDistance: number | null;
  /** Flag for per-record verification capability */
  canVerify?: boolean;
}

interface AttendanceTableProps {
  attendances: AttendanceRow[];
  pagination: {
    pageIndex: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
  };
  onPaginationChange: (pageIndex: number) => void;
  onViewDetails: (attendanceId: string) => void;
  onVerify?: (attendanceId: string) => void;
  isLoading?: boolean;
}

const statusVariant: Record<
  "Pending" | "Approved" | "Rejected",
  "default" | "secondary" | "destructive" | "outline"
> = {
  [VerificationStatus.Pending]: "secondary",
  [VerificationStatus.Approved]: "default",
  [VerificationStatus.Rejected]: "destructive",
};

export function AttendanceTable({
  attendances,
  pagination,
  onPaginationChange,
  onViewDetails,
  onVerify,
  isLoading = false,
}: AttendanceTableProps) {
  const columns: ColumnDef<AttendanceRow>[] = [
    {
      accessorKey: "user",
      header: "Student",
      cell: ({ row }) => (
        <div className="min-w-[200px]">
          <div className="font-medium">
            {row.original.user.firstName} {row.original.user.lastName}
          </div>
          <div className="text-sm text-muted-foreground">
            {row.original.user.UserProfile?.studentId || "N/A"}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "event.name",
      header: "Event",
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate">{row.original.event.name}</div>
      ),
    },
    {
      accessorKey: "checkInSubmittedAt",
      header: "Check-in Time",
      cell: ({ row }) => (
        <div className="min-w-[150px]">
          <div>
            {format(new Date(row.original.checkInSubmittedAt), "MMM d, yyyy")}
          </div>
          <div className="text-sm text-muted-foreground">
            {format(new Date(row.original.checkInSubmittedAt), "h:mm a")}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "checkOutSubmittedAt",
      header: "Check-out Time",
      cell: ({ row }) => {
        const submittedAt = row.original.checkOutSubmittedAt;
        if (!submittedAt) {
          return <div className="text-sm text-muted-foreground">N/A</div>;
        }

        return (
          <div className="min-w-[150px]">
            <div>{format(new Date(submittedAt), "MMM d, yyyy")}</div>
            <div className="text-sm text-muted-foreground">
              {format(new Date(submittedAt), "h:mm a")}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "verificationStatus",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={
            statusVariant[
              row.original.verificationStatus as
                | "Pending"
                | "Approved"
                | "Rejected"
            ]
          }
        >
          {row.original.verificationStatus}
        </Badge>
      ),
    },
    {
      accessorKey: "distanceMeters",
      header: "Distance",
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">
          {row.original.checkInDistance !== null &&
          row.original.checkInDistance !== undefined
            ? `${row.original.checkInDistance.toFixed(0)}m`
            : "N/A"}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const isPending =
          row.original.verificationStatus === VerificationStatus.Pending;
        const isAllowed = row.original.canVerify ?? true;

        return (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(row.original.id)}
              className="h-8"
            >
              <Eye className="mr-2 h-4 w-4" />
              View
            </Button>
            {onVerify && isPending && isAllowed && (
              <Button
                size="sm"
                onClick={() => onVerify(row.original.id)}
                className="h-8"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Verify
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={attendances}
      pagination={pagination}
      onPaginationChange={onPaginationChange}
      isLoading={isLoading}
    />
  );
}
