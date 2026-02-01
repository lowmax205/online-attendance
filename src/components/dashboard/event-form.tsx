"use client";

import React, { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createEventSchema, updateEventSchema } from "@/lib/validations/event";
import { Button } from "@/components/ui/button";
import { MapLocationPicker } from "@/components/dashboard/map-location-picker";
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
import { format } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";

type EventFormData = {
  name: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  venueName: string;
  venueAddress?: string | null;
  campus?: string;
  venueLatitude: number;
  venueLongitude: number;
  checkInBufferMins: number;
  checkOutBufferMins: number;
  status?: "Active" | "Completed" | "Cancelled";
};

interface EventFormProps {
  mode: "create" | "edit";
  defaultValues?: Partial<EventFormData>;
  onSubmit: (data: EventFormData) => Promise<void>;
  isLoading?: boolean;
}

export function EventForm({
  mode,
  defaultValues,
  onSubmit,
  isLoading = false,
}: EventFormProps) {
  const schema = mode === "create" ? createEventSchema : updateEventSchema;

  const form = useForm<EventFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: defaultValues || {
      name: "",
      description: "",
      campus: "MainCampus",
      checkInBufferMins: 30,
      checkOutBufferMins: 30,
    },
  });

  // Memoize location select callback to prevent infinite updates in MapLocationPicker
  const handleLocationSelect = useCallback(
    (lat: number, lng: number) => {
      form.setValue("venueLatitude", lat);
      form.setValue("venueLongitude", lng);
    },
    [form],
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Annual Tech Conference 2025"
                  maxLength={100}
                  {...field}
                  onChange={(e) => {
                    const value = e.target.value.slice(0, 100);
                    field.onChange(value);
                  }}
                />
              </FormControl>
              <FormDescription>
                {field.value?.length || 0}/100 characters
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => {
            const wordCount =
              field.value?.trim().split(/\s+/).filter(Boolean).length || 0;
            return (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter event description..."
                    className="min-h-[100px]"
                    maxLength={3000}
                    {...field}
                    onChange={(e) => {
                      let value = e.target.value;
                      // Enforce 3000 character limit
                      if (value.length > 3000) {
                        value = value.slice(0, 3000);
                      }
                      // Check word count
                      const words = value.trim().split(/\s+/).filter(Boolean);
                      // If word count exceeds 300, remove the last word
                      if (words.length > 300) {
                        value = words.slice(0, 300).join(" ");
                      }
                      field.onChange(value);
                    }}
                  />
                </FormControl>
                <FormDescription>
                  {wordCount}/300 words • {field.value?.length || 0}/3000
                  characters
                </FormDescription>
                <FormMessage />
              </FormItem>
            );
          }}
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
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          // Preserve time if already set, otherwise use current time
                          if (field.value) {
                            const existingDate = new Date(field.value);
                            date.setHours(
                              existingDate.getHours(),
                              existingDate.getMinutes(),
                            );
                          } else {
                            const now = new Date();
                            date.setHours(now.getHours(), now.getMinutes());
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
                          const [hours, minutes] = e.target.value.split(":");
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
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          // Preserve time if already set, otherwise use current time + 2 hours
                          if (field.value) {
                            const existingDate = new Date(field.value);
                            date.setHours(
                              existingDate.getHours(),
                              existingDate.getMinutes(),
                            );
                          } else {
                            const now = new Date();
                            now.setHours(now.getHours() + 2);
                            date.setHours(now.getHours(), now.getMinutes());
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
                          const [hours, minutes] = e.target.value.split(":");
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
                          const startTime = form.watch("startDateTime");
                          const baseTime = startTime
                            ? new Date(startTime)
                            : new Date();
                          const endTime = new Date(
                            baseTime.getTime() + 2 * 60 * 60 * 1000,
                          ); // +2 hours
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

        <div className="space-y-4 rounded-lg border p-4">
          <h3 className="text-sm font-medium">Venue Information</h3>

          <FormField
            control={form.control}
            name="venueName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Venue Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Main Auditorium"
                    maxLength={50}
                    {...field}
                    onChange={(e) => {
                      const value = e.target.value.slice(0, 50);
                      field.onChange(value);
                    }}
                  />
                </FormControl>
                <FormDescription>
                  {field.value?.length || 0}/50 characters
                </FormDescription>
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
                    placeholder="123 University Ave"
                    maxLength={80}
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => {
                      const value = e.target.value.slice(0, 80);
                      field.onChange(value);
                    }}
                  />
                </FormControl>
                <FormDescription>
                  {field.value?.length || 0}/80 characters
                </FormDescription>
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
                  value={field.value || "MainCampus"}
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
                    <SelectItem value="MainitCampus">Mainit Campus</SelectItem>
                    <SelectItem value="ClaverCampus">Claver Campus</SelectItem>
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

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="venueLatitude"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Latitude</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.000001"
                      placeholder="14.5995"
                      value={field.value ?? ""}
                      onChange={(e) => {
                        if (e.target.value === "") {
                          field.onChange(undefined);
                        } else {
                          const inputValue = e.target.value;
                          // Check decimal places
                          const decimals = inputValue.split(".")[1];
                          if (decimals && decimals.length > 6) {
                            // Prevent input if more than 6 decimals
                            return;
                          }
                          let value = parseFloat(inputValue);
                          // Validate range
                          if (value < -90 || value > 90) {
                            return;
                          }
                          // Limit to 6 decimal places
                          value = Math.round(value * 1000000) / 1000000;
                          field.onChange(value);
                        }
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    GPS coordinate (max 6 decimals, range: -90 to 90)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="venueLongitude"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Longitude</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.000001"
                      placeholder="120.9842"
                      value={field.value ?? ""}
                      onChange={(e) => {
                        if (e.target.value === "") {
                          field.onChange(undefined);
                        } else {
                          const inputValue = e.target.value;
                          // Check decimal places
                          const decimals = inputValue.split(".")[1];
                          if (decimals && decimals.length > 6) {
                            // Prevent input if more than 6 decimals
                            return;
                          }
                          let value = parseFloat(inputValue);
                          // Validate range
                          if (value < -180 || value > 180) {
                            return;
                          }
                          // Limit to 6 decimal places
                          value = Math.round(value * 1000000) / 1000000;
                          field.onChange(value);
                        }
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    GPS coordinate (max 6 decimals, range: -180 to 180)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Map Location Picker */}
          <div className="pt-4">
            <MapLocationPicker
              onLocationSelect={handleLocationSelect}
              initialLatitude={form.watch("venueLatitude")}
              initialLongitude={form.watch("venueLongitude")}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="checkInBufferMins"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Check-in Buffer (minutes)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  />
                </FormControl>
                <FormDescription>
                  Allow check-in this many minutes before start time
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
                <FormLabel>Check-out Buffer (minutes)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  />
                </FormControl>
                <FormDescription>
                  Allow check-in this many minutes after end time
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading
              ? "Saving..."
              : mode === "create"
                ? "Create Event"
                : "Update Event"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
