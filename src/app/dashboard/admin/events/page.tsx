"use client";

import { EventManagementView } from "@/app/dashboard/admin/events/event-management-client";
import { useAuth } from "@/hooks/use-auth";

export default function AdminAllEventsPage() {
  const { user } = useAuth();
  const isModerator = user?.role === "Moderator";

  return (
    <EventManagementView
      title="All Events"
      description="Review every event across the institution, monitor engagement, and support moderators where needed."
      scope="all"
      basePath="/dashboard/admin/events"
      showCreateButton={!isModerator}
      searchPlaceholder="Search events by name, venue, or creator"
      readOnly={isModerator}
      readOnlyMessage="Moderators can review all events but must request changes from an administrator."
    />
  );
}
