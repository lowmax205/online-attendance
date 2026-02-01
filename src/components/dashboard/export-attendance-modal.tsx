"use client";

import * as React from "react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, Search, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import academicPrograms from "@/lib/data/academic-programs.json";

interface Event {
  id: string;
  name: string;
  startDateTime: Date;
  endDateTime: Date;
  status: string;
}

interface ExportAttendanceModalProps {
  events: Event[];
  onExport: (filters: ExportFilters, format: "csv" | "pdf") => Promise<void>;
  isLoading?: boolean;
}

export interface ExportFilters {
  eventId: string;
  department: string;
  course: string;
  campus: string;
  exportType: "checkIn" | "checkOut";
}

const CAMPUSES = [
  { value: "Main Campus", label: "Main Campus" },
  { value: "Malimono Campus", label: "Malimono Campus" },
  { value: "Mainit Campus", label: "Mainit Campus" },
  { value: "Claver Campus", label: "Claver Campus" },
  { value: "Del Carmen Campus", label: "Del Carmen Campus" },
];

export function ExportAttendanceModal({
  events,
  onExport,
  isLoading = false,
}: ExportAttendanceModalProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [filters, setFilters] = useState<ExportFilters>({
    eventId: "",
    department: "all",
    course: "all",
    campus: "Main Campus",
    exportType: "checkIn",
  });
  const [exportFormat, setExportFormat] = useState<"csv" | "pdf">("pdf");

  const departmentOptions = React.useMemo(
    () => [
      { value: "all", label: "All Departments/Colleges" },
      ...academicPrograms.departments.map((dept) => ({
        value: dept.code,
        label: `${dept.code} - ${dept.name}`,
      })),
    ],
    [],
  );

  const courseOptions = React.useMemo(() => {
    if (filters.department !== "all") {
      const dept = academicPrograms.departments.find(
        (d) => d.code === filters.department,
      );
      if (!dept) {
        return [{ value: "all", label: "All Courses/Programs" }];
      }
      return [
        { value: "all", label: "All Courses/Programs" },
        ...dept.programs.map((program) => ({
          value: program.code,
          label: `${program.code} - ${program.name}`,
        })),
      ];
    }

    const allPrograms = academicPrograms.departments.flatMap((dept) =>
      dept.programs.map((program) => ({
        value: program.code,
        label: `${program.code} - ${program.name}`,
      })),
    );

    return [{ value: "all", label: "All Courses/Programs" }, ...allPrograms];
  }, [filters.department]);

  // Filter completed events and sort by latest
  const completedEvents = events
    .filter((event) => event.status === "Completed")
    .sort(
      (a, b) =>
        new Date(b.endDateTime).getTime() - new Date(a.endDateTime).getTime(),
    );

  // Filter events based on search
  const filteredEvents = searchQuery
    ? completedEvents.filter((event) =>
        event.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : completedEvents.slice(0, 5); // Show latest 5 by default

  // Debug logging
  React.useEffect(() => {
    console.log("Export Modal Debug:", {
      totalEvents: events.length,
      completedEvents: completedEvents.length,
      searchQuery,
      filteredCount: filteredEvents.length,
    });
  }, [events, completedEvents.length, searchQuery, filteredEvents.length]);

  const handleEventSelect = (event: Event) => {
    setSelectedEvent(event);
    setFilters({ ...filters, eventId: event.id });
  };

  const handleExport = async () => {
    if (!selectedEvent) {
      toast.error("Please select an event to export");
      return;
    }

    try {
      await onExport(filters, exportFormat);
      toast.success(
        exportFormat === "pdf"
          ? "PDF preview opened in a new tab"
          : "Export completed successfully!",
      );
      setOpen(false);
      // Reset form
      setSelectedEvent(null);
      setSearchQuery("");
      setFilters({
        eventId: "",
        department: "all",
        course: "all",
        campus: "Main Campus",
        exportType: "checkIn",
      });
      setExportFormat("csv");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to export data",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export Data
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Export Attendance Data
          </DialogTitle>
          <DialogDescription>
            Select an event and configure export options. Export as CSV or
            preview as PDF in a new tab.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step 1: Event Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              Step 1: Select Event
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search for an event..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {selectedEvent ? (
              <div className="rounded-lg border border-primary bg-primary/5 p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">{selectedEvent.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(
                        new Date(selectedEvent.startDateTime),
                        "MMM dd, yyyy 'at' h:mm a",
                      )}
                    </p>
                  </div>
                  <Badge variant="secondary">Selected</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedEvent(null)}
                  className="mt-2"
                >
                  Change Event
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? "Search results:" : "Latest completed events:"}
                </p>
                <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border p-2">
                  {filteredEvents.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      {searchQuery
                        ? "No events found matching your search"
                        : "No completed events available"}
                    </p>
                  ) : (
                    filteredEvents.map((event) => (
                      <button
                        key={event.id}
                        onClick={() => handleEventSelect(event)}
                        className="w-full rounded-md border bg-card p-3 text-left transition-colors hover:bg-accent"
                      >
                        <p className="font-medium">{event.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(
                            new Date(event.startDateTime),
                            "MMM dd, yyyy",
                          )}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Filters */}
          {selectedEvent && (
            <>
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  Step 2: Configure Filters
                </Label>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="department">Department/Colleges</Label>
                    <Select
                      value={filters.department}
                      onValueChange={(value) =>
                        setFilters({
                          ...filters,
                          department: value,
                          course: "all",
                        })
                      }
                    >
                      <SelectTrigger id="department" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {departmentOptions.map((dept) => (
                          <SelectItem key={dept.value} value={dept.value}>
                            {dept.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="course">Course/Program</Label>
                    <Select
                      value={filters.course}
                      onValueChange={(value) =>
                        setFilters({ ...filters, course: value })
                      }
                      disabled={filters.department === "all"}
                    >
                      <SelectTrigger id="course" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {courseOptions.map((course) => (
                          <SelectItem key={course.value} value={course.value}>
                            {course.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="campus">Campus</Label>
                      <Select
                        value={filters.campus}
                        onValueChange={(value) =>
                          setFilters({ ...filters, campus: value })
                        }
                      >
                        <SelectTrigger id="campus" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CAMPUSES.map((campus) => (
                            <SelectItem key={campus.value} value={campus.value}>
                              {campus.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="exportType">Export Type</Label>
                      <Select
                        value={filters.exportType}
                        onValueChange={(value: "checkIn" | "checkOut") =>
                          setFilters({ ...filters, exportType: value })
                        }
                      >
                        <SelectTrigger id="exportType" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="checkIn">
                            Check-In Records
                          </SelectItem>
                          <SelectItem value="checkOut">
                            Check-Out Records
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-4 border-t sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-semibold">Format:</Label>
            <Select
              value={exportFormat}
              onValueChange={(value: "csv" | "pdf") => setExportFormat(value)}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF Preview</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={!selectedEvent || isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {exportFormat === "pdf" ? "Preview PDF" : "Export CSV"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
