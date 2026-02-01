"use client";

import * as React from "react";
import { DataTable } from "@/components/dashboard/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, QrCode, Trash2, Eye } from "lucide-react";
import { EventStatus } from "@prisma/client";
import { format } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";

export interface EventRow {
  id: string;
  name: string;
  startDateTime: Date;
  endDateTime: Date;
  status: EventStatus;
  venueName: string;
  _count: {
    Attendance: number;
  };
}

interface EventTableProps {
  events: EventRow[];
  pagination: {
    pageIndex: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
  };
  onPaginationChange: (pageIndex: number) => void;
  onView: (eventId: string) => void;
  onEdit: (eventId: string) => void;
  onDownloadQR: (eventId: string) => void;
  onDelete: (eventId: string) => void;
  isLoading?: boolean;
  isReadOnly?: boolean;
}

const statusVariant: Record<
  EventStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  [EventStatus.Active]: "default",
  [EventStatus.Completed]: "outline",
  [EventStatus.Cancelled]: "destructive",
};

export function EventTable({
  events,
  pagination,
  onPaginationChange,
  onView,
  onEdit,
  onDownloadQR,
  onDelete,
  isLoading = false,
  isReadOnly = false,
}: EventTableProps) {
  const columns = React.useMemo<ColumnDef<EventRow>[]>(() => {
    const baseColumns: ColumnDef<EventRow>[] = [
      {
        accessorKey: "name",
        header: "Event Name",
        cell: ({ row }) => (
          <div className="max-w-[300px]">
            <div className="font-medium truncate">{row.original.name}</div>
            <div className="text-sm text-muted-foreground truncate">
              {row.original.venueName}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "startDateTime",
        header: "Start Date",
        cell: ({ row }) => (
          <div className="min-w-[120px]">
            <div>
              {format(new Date(row.original.startDateTime), "MMM d, yyyy")}
            </div>
            <div className="text-sm text-muted-foreground">
              {format(new Date(row.original.startDateTime), "h:mm a")}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={statusVariant[row.original.status]}>
            {row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: "_count.Attendance",
        header: "Attendance",
        cell: ({ row }) => (
          <div className="text-center font-medium">
            {row.original._count.Attendance}
          </div>
        ),
      },
    ];

    if (!isReadOnly) {
      baseColumns.push({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onView(row.original.id)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEdit(row.original.id)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Event
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDownloadQR(row.original.id)}>
                <QrCode className="mr-2 h-4 w-4" />
                Download QR
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(row.original.id)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Event
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      });
    } else {
      baseColumns.push({
        id: "view",
        header: "View",
        cell: ({ row }) => (
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => onView(row.original.id)}
          >
            <Eye className="mr-2 h-4 w-4" />
            View
          </Button>
        ),
      });
    }

    return baseColumns;
  }, [isReadOnly, onDelete, onDownloadQR, onEdit, onView]);

  return (
    <DataTable
      columns={columns}
      data={events}
      pagination={pagination}
      onPaginationChange={onPaginationChange}
      isLoading={isLoading}
    />
  );
}
