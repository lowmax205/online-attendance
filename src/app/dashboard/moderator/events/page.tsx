"use client";

import { EventManagementView } from "@/app/dashboard/admin/events/event-management-client";

export default function ModeratorEventsPage() {
  return (
    <EventManagementView
      title="My Events"
      description="Create and manage the events you own, monitor attendance, and keep schedules up to date."
      scope="mine"
      basePath="/dashboard/moderator/events"
      showCreateButton
      searchPlaceholder="Search your events by name or venue"
    />
  );
}
