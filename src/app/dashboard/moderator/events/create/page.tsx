"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EventForm } from "@/components/dashboard/event-form";
import { createEvent } from "@/actions/events/create";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function ModeratorCreateEventPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: Parameters<typeof createEvent>[0]) => {
    try {
      setIsSubmitting(true);

      const payload = {
        ...data,
        startDateTime: data.startDateTime
          ? new Date(data.startDateTime).toISOString()
          : undefined,
        endDateTime: data.endDateTime
          ? new Date(data.endDateTime).toISOString()
          : undefined,
        campus: data.campus ?? "MainCampus",
      };

      const result = await createEvent(payload);

      if (!result.success) {
        throw new Error(result.error || "Failed to create event");
      }

      toast({
        title: "Event created",
        description: "Your event has been created successfully.",
      });
      router.push("/dashboard/moderator/events");
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create event",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-2 pt-6">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Back
        </Button>
        <h1 className="text-2xl font-semibold">Create Event</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Event Details</CardTitle>
        </CardHeader>
        <CardContent>
          <EventForm
            mode="create"
            onSubmit={handleSubmit}
            isLoading={isSubmitting}
            defaultValues={{
              campus: "MainCampus",
              checkInBufferMins: 30,
              checkOutBufferMins: 30,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
