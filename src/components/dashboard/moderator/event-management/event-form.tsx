"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  eventCreateSchema,
  eventUpdateSchema,
  type EventCreate,
  type EventUpdate,
} from "@/lib/validations/event-management";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, Clock, Loader2 } from "lucide-react";
import { MapLocationPicker } from "@/components/dashboard/map-location-picker";
import { useToast } from "@/hooks/use-toast";
import { createEvent } from "@/actions/events/create";
import { updateEvent } from "@/actions/events/update";
import { getEventById } from "@/actions/events/get-by-id";
import { format } from "date-fns";

const FALLBACK_EVENT_VALUES: EventCreate = {
  name: "",
  description: "",
  startDateTime: "",
  endDateTime: "",
  venueName: "",
  venueAddress: "",
  campus: "MainCampus",
  venueLatitude: 0,
  venueLongitude: 0,
  checkInBufferMins: 30,
  checkOutBufferMins: 30,
};

interface EventFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  eventId?: string;
  initialData?: Partial<EventUpdate>;
  mode?: "create" | "edit";
}

export function EventForm({
  open,
  onOpenChange,
  onSuccess,
  eventId,
  initialData,
  mode = "create",
}: EventFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isLoadingEventData, setIsLoadingEventData] = React.useState(false);
  const defaultValues = React.useMemo(() => ({ ...FALLBACK_EVENT_VALUES }), []);

  const form = useForm<EventCreate | EventUpdate>({
    resolver: zodResolver(
      mode === "create" ? eventCreateSchema : eventUpdateSchema,
    ),
    defaultValues: initialData
      ? { ...defaultValues, ...initialData }
      : { ...defaultValues },
  });

  React.useEffect(() => {
    if (!open) {
      return;
    }

    // If in edit mode and eventId is provided, fetch the event data
    if (mode === "edit" && eventId && !initialData) {
      const loadEventData = async () => {
        try {
          setIsLoadingEventData(true);
          const result = await getEventById(eventId);

          if (!result.success || !result.data) {
            throw new Error(result.error || "Failed to load event data");
          }

          const event = result.data;

          // Format dates for datetime-local input
          const formattedData: EventUpdate = {
            name: event.name,
            description: event.description ?? "",
            startDateTime: format(
              new Date(event.startDateTime),
              "yyyy-MM-dd'T'HH:mm",
            ),
            endDateTime: format(
              new Date(event.endDateTime),
              "yyyy-MM-dd'T'HH:mm",
            ),
            venueName: event.venueName ?? "",
            venueAddress: event.venueAddress ?? "",
            campus: event.campus ?? "MainCampus",
            venueLatitude: event.venueLatitude,
            venueLongitude: event.venueLongitude,
            checkInBufferMins: event.checkInBufferMins,
            checkOutBufferMins: event.checkOutBufferMins,
          };

          form.reset(formattedData);
        } catch (error) {
          toast({
            title: "Error",
            description:
              error instanceof Error
                ? error.message
                : "Failed to load event data",
            variant: "destructive",
          });
          onOpenChange(false);
        } finally {
          setIsLoadingEventData(false);
        }
      };

      void loadEventData();
    } else if (initialData) {
      form.reset({ ...defaultValues, ...initialData });
    } else {
      form.reset({ ...defaultValues });
    }
  }, [
    defaultValues,
    form,
    initialData,
    open,
    mode,
    eventId,
    toast,
    onOpenChange,
  ]);

  const handleSubmit = async (data: EventCreate | EventUpdate) => {
    try {
      setIsSubmitting(true);

      // Convert datetime-local format to ISO string
      const processedData = {
        ...data,
        startDateTime: data.startDateTime
          ? new Date(data.startDateTime).toISOString()
          : undefined,
        endDateTime: data.endDateTime
          ? new Date(data.endDateTime).toISOString()
          : undefined,
      };

      const result =
        mode === "create"
          ? await createEvent(processedData as EventCreate)
          : await updateEvent(eventId!, processedData as EventUpdate);

      if (!result.success) {
        throw new Error(result.error || `Failed to ${mode} event`);
      }

      toast({
        title: `Event ${mode === "create" ? "created" : "updated"}`,
        description: `The event has been ${mode === "create" ? "created" : "updated"} successfully.`,
      });

      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : `Failed to ${mode} event`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create New Event" : "Edit Event"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Fill in the details below to create a new event."
              : "Update the event details below."}
          </DialogDescription>
        </DialogHeader>

        {isLoadingEventData ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter event name"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter event description"
                        className="resize-none"
                        rows={3}
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="startDateTime"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date & Time</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground",
                              )}
                            >
                              {field.value ? (
                                format(new Date(field.value), "PPP p")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={
                              field.value ? new Date(field.value) : undefined
                            }
                            onSelect={(date) => {
                              if (date) {
                                if (field.value) {
                                  const existingDate = new Date(field.value);
                                  date.setHours(
                                    existingDate.getHours(),
                                    existingDate.getMinutes(),
                                  );
                                } else {
                                  const now = new Date();
                                  date.setHours(
                                    now.getHours(),
                                    now.getMinutes(),
                                  );
                                }
                                field.onChange(date.toISOString());
                              }
                            }}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            initialFocus
                          />
                          <div className="border-t p-3 space-y-2">
                            <Input
                              type="time"
                              value={
                                field.value
                                  ? format(new Date(field.value), "HH:mm")
                                  : ""
                              }
                              onChange={(e) => {
                                const currentDate = field.value
                                  ? new Date(field.value)
                                  : new Date();
                                const [hours, minutes] =
                                  e.target.value.split(":");
                                currentDate.setHours(
                                  parseInt(hours),
                                  parseInt(minutes),
                                );
                                field.onChange(currentDate.toISOString());
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                const now = new Date();
                                field.onChange(now.toISOString());
                              }}
                            >
                              <Clock className="mr-2 h-4 w-4" />
                              Now
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDateTime"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Date & Time</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground",
                              )}
                            >
                              {field.value ? (
                                format(new Date(field.value), "PPP p")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={
                              field.value ? new Date(field.value) : undefined
                            }
                            onSelect={(date) => {
                              if (date) {
                                if (field.value) {
                                  const existingDate = new Date(field.value);
                                  date.setHours(
                                    existingDate.getHours(),
                                    existingDate.getMinutes(),
                                  );
                                } else {
                                  const now = new Date();
                                  now.setHours(now.getHours() + 2);
                                  date.setHours(
                                    now.getHours(),
                                    now.getMinutes(),
                                  );
                                }
                                field.onChange(date.toISOString());
                              }
                            }}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            initialFocus
                          />
                          <div className="border-t p-3 space-y-2">
                            <Input
                              type="time"
                              value={
                                field.value
                                  ? format(new Date(field.value), "HH:mm")
                                  : ""
                              }
                              onChange={(e) => {
                                const currentDate = field.value
                                  ? new Date(field.value)
                                  : new Date();
                                const [hours, minutes] =
                                  e.target.value.split(":");
                                currentDate.setHours(
                                  parseInt(hours),
                                  parseInt(minutes),
                                );
                                field.onChange(currentDate.toISOString());
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                const now = new Date();
                                const endTime = new Date(now);
                                endTime.setHours(endTime.getHours() + 2);
                                field.onChange(endTime.toISOString());
                              }}
                            >
                              <Clock className="mr-2 h-4 w-4" />
                              +2 Hours
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="venueName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Venue Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter venue name"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="venueAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Venue Address</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter venue address"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="campus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campus *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value ?? "MainCampus"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select campus" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="MainCampus">Main Campus</SelectItem>
                        <SelectItem value="MalimonoCampus">
                          Malimono Campus
                        </SelectItem>
                        <SelectItem value="MainitCampus">
                          Mainit Campus
                        </SelectItem>
                        <SelectItem value="ClaverCampus">
                          Claver Campus
                        </SelectItem>
                        <SelectItem value="DelCarmenCampus">
                          Del Carmen Campus
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the campus where this event will be held
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="venueLatitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="0.0"
                          {...field}
                          onChange={(e) => {
                            const rawValue = e.target.value;
                            if (rawValue === "") {
                              field.onChange(undefined);
                              return;
                            }
                            const parsed = parseFloat(rawValue);
                            field.onChange(
                              Number.isNaN(parsed) ? undefined : parsed,
                            );
                          }}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="venueLongitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Longitude *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="0.0"
                          {...field}
                          onChange={(e) => {
                            const rawValue = e.target.value;
                            if (rawValue === "") {
                              field.onChange(undefined);
                              return;
                            }
                            const parsed = parseFloat(rawValue);
                            field.onChange(
                              Number.isNaN(parsed) ? undefined : parsed,
                            );
                          }}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Map Location Picker */}
              <div className="pt-4">
                <MapLocationPicker
                  onLocationSelect={(lat, lng) => {
                    form.setValue("venueLatitude", lat);
                    form.setValue("venueLongitude", lng);
                  }}
                  initialLatitude={form.watch("venueLatitude") || undefined}
                  initialLongitude={form.watch("venueLongitude") || undefined}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="checkInBufferMins"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Check-in Buffer (minutes) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="120"
                          {...field}
                          onChange={(e) => {
                            const rawValue = e.target.value;
                            if (rawValue === "") {
                              field.onChange(undefined);
                              return;
                            }
                            const parsed = parseInt(rawValue, 10);
                            field.onChange(
                              Number.isNaN(parsed) ? undefined : parsed,
                            );
                          }}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormDescription>
                        How early can students check in before the event starts
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="checkOutBufferMins"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Check-out Buffer (minutes) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="120"
                          {...field}
                          onChange={(e) => {
                            const rawValue = e.target.value;
                            if (rawValue === "") {
                              field.onChange(undefined);
                              return;
                            }
                            const parsed = parseInt(rawValue, 10);
                            field.onChange(
                              Number.isNaN(parsed) ? undefined : parsed,
                            );
                          }}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormDescription>
                        How late can students check out after the event ends
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {mode === "create" ? "Create Event" : "Update Event"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
