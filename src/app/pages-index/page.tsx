import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PageInfo {
  url: string;
  name: string;
  description: string;
  role?: string;
  status: "public" | "protected";
}

// Helper function to check if a URL contains dynamic segments
const isDynamicRoute = (url: string) => /\[.+\]/.test(url);

const pages: PageInfo[] = [
  {
    url: "/",
    name: "Landing Page",
    description:
      "Home page with event attendance system overview and quick navigation to login or main dashboard",
    status: "public",
  },
  {
    url: "/auth/login",
    name: "Login",
    description:
      "User authentication page for students, moderators, and administrators to log in with email and password",
    status: "public",
  },
  {
    url: "/attendance",
    name: "Attendance Check-in and Check-out",
    description:
      "Main attendance check-in and check-out page where students enter event codes or scan QR codes to mark attendance",
    role: "Student",
    status: "protected",
  },
  {
    url: "/attendance/[eventId]",
    name: "Event Attendance Details",
    description:
      "Dynamic page for specific event attendance with check-in/out, photo capture, signature, and GPS validation",
    role: "Student",
    status: "protected",
  },
  {
    url: "/attendance/[eventId]/success",
    name: "Attendance Success",
    description:
      "Confirmation page displayed after successful check-in/check-out with attendance record details",
    role: "Student",
    status: "protected",
  },
  {
    url: "/profile",
    name: "Profile Management",
    description:
      "User profile view page showing current account information and profile details",
    role: "All Roles",
    status: "protected",
  },
  {
    url: "/profile/create",
    name: "Create Profile",
    description:
      "Initial profile setup page for users who haven't completed their profile yet (academic info, department, etc.)",
    role: "All Roles",
    status: "protected",
  },
  {
    url: "/dashboard",
    name: "Dashboard Router",
    description:
      "Smart dashboard page that redirects users to their role-specific dashboard (student/moderator/admin)",
    role: "All Roles",
    status: "protected",
  },
  {
    url: "/dashboard/student",
    name: "Student Dashboard",
    description:
      "Student-specific dashboard showing attendance history, event calendar, and personal attendance statistics",
    role: "Student",
    status: "protected",
  },
  {
    url: "/dashboard/student/attendance/[id]",
    name: "Student Attendance Details",
    description:
      "Detailed view of a specific attendance record for students including photos, signatures, and verification status",
    role: "Student",
    status: "protected",
  },
  {
    url: "/dashboard/moderator",
    name: "Moderator Dashboard",
    description:
      "Moderator home page with quick access to event management, attendance verification, and monitoring tools",
    role: "Moderator",
    status: "protected",
  },
  {
    url: "/dashboard/moderator/events",
    name: "Moderator Events Management",
    description:
      "List of all events managed by the moderator with edit, delete, and view attendance options",
    role: "Moderator",
    status: "protected",
  },
  {
    url: "/dashboard/moderator/events/create",
    name: "Create Event",
    description:
      "Event creation form where moderators define event details, venue, date/time, and map coordinates",
    role: "Moderator",
    status: "protected",
  },
  {
    url: "/dashboard/admin",
    name: "Admin Dashboard",
    description:
      "Administrator home page with access to system management, user management, and analytics",
    role: "Administrator",
    status: "protected",
  },
  {
    url: "/dashboard/admin/page",
    name: "Admin Main",
    description:
      "Primary admin dashboard page with system statistics, quick actions, and navigation to management sections",
    role: "Administrator",
    status: "protected",
  },
  {
    url: "/dashboard/admin/users",
    name: "User Management",
    description:
      "Comprehensive user management interface for creating, editing, suspending, and deleting system users",
    role: "Administrator",
    status: "protected",
  },
  {
    url: "/dashboard/admin/events",
    name: "All Events Management",
    description:
      "System-wide event list visible to admins with filtering, bulk actions, and detailed event oversight",
    role: "Administrator",
    status: "protected",
  },
  {
    url: "/dashboard/admin/attendance",
    name: "All Attendance Records",
    description:
      "Complete attendance database with advanced filtering by event, department, course, date, and export capabilities",
    role: "Administrator",
    status: "protected",
  },
  {
    url: "/dashboard/admin/analytics",
    name: "Analytics & Reports",
    description:
      "System analytics dashboard with attendance trends, user statistics, and department-level insights",
    role: "Administrator",
    status: "protected",
  },
  {
    url: "/updates",
    name: "Updates & Changelog",
    description:
      "Dynamic changelog viewer showing all system releases, features, and improvements in reverse chronological order",
    status: "public",
  },
];

export default function PagesIndexPage() {
  const publicPages = pages.filter((p) => p.status === "public");
  const protectedPages = pages.filter((p) => p.status === "protected");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Static Pages Index
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Event Attendance System - Build Reference (24 Generated Pages)
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {pages.length}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Total Pages
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {publicPages.length}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Public Pages
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {protectedPages.length}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Protected Pages
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Public Pages Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <Badge
              variant="outline"
              className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
            >
              Public
            </Badge>
            Accessible Pages ({publicPages.length})
          </h2>
          <div className="space-y-4">
            {publicPages.map((page, idx) => (
              <Card key={idx} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {page.name}
                      </CardTitle>
                      <CardDescription className="text-slate-600 dark:text-slate-400 mt-1">
                        {page.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <code className="text-sm bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded text-slate-700 dark:text-slate-300 font-mono">
                      {page.url}
                    </code>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Public Access</Badge>
                      {!isDynamicRoute(page.url) && (
                        <Link href={page.url}>
                          <Button size="sm" variant="outline">
                            Visit
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Protected Pages Section - by Role */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <Badge
              variant="outline"
              className="bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
            >
              Protected
            </Badge>
            Role-Based Pages ({protectedPages.length})
          </h2>

          {/* Student Pages */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full"></span>
              Student Pages
            </h3>
            <div className="space-y-4">
              {protectedPages
                .filter((p) => !p.role || p.role.includes("Student"))
                .map((page, idx) => (
                  <Card
                    key={idx}
                    className="hover:shadow-md transition-shadow border-l-4 border-blue-500 dark:border-blue-400"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                            {page.name}
                          </CardTitle>
                          <CardDescription className="text-slate-700 dark:text-slate-400 mt-1">
                            {page.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <code className="text-sm bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded text-slate-700 dark:text-slate-100 font-mono">
                          {page.url}
                        </code>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900">
                            Student
                          </Badge>
                          {!isDynamicRoute(page.url) && (
                            <Link href={page.url}>
                              <Button size="sm" variant="outline">
                                Visit
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>

          {/* Moderator Pages */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-orange-500 dark:bg-orange-400 rounded-full"></span>
              Moderator Pages
            </h3>
            <div className="space-y-4">
              {protectedPages
                .filter((p) => !p.role || p.role.includes("Moderator"))
                .map((page, idx) => (
                  <Card
                    key={idx}
                    className="hover:shadow-md transition-shadow border-l-4 border-orange-500 dark:border-orange-400"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                            {page.name}
                          </CardTitle>
                          <CardDescription className="text-slate-600 dark:text-slate-400 mt-1">
                            {page.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <code className="text-sm bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded text-slate-700 dark:text-slate-300 font-mono">
                          {page.url}
                        </code>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 hover:bg-orange-100 dark:hover:bg-orange-900">
                            Moderator
                          </Badge>
                          {!isDynamicRoute(page.url) && (
                            <Link href={page.url}>
                              <Button size="sm" variant="outline">
                                Visit
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>

          {/* Admin Pages */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 dark:bg-red-400 rounded-full"></span>
              Administrator Pages
            </h3>
            <div className="space-y-4">
              {protectedPages
                .filter((p) => !p.role || p.role.includes("Administrator"))
                .map((page, idx) => (
                  <Card
                    key={idx}
                    className="hover:shadow-md transition-shadow border-l-4 border-red-500 dark:border-red-400"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                            {page.name}
                          </CardTitle>
                          <CardDescription className="text-slate-600 dark:text-slate-400 mt-1">
                            {page.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <code className="text-sm bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded text-slate-700 dark:text-slate-300 font-mono">
                          {page.url}
                        </code>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-900">
                            Admin
                          </Badge>
                          {!isDynamicRoute(page.url) && (
                            <Link href={page.url}>
                              <Button size="sm" variant="outline">
                                Visit
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        </div>

        {/* API Routes Reference */}
        <Card className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge variant="secondary">API Routes</Badge>
              Additional Backend Endpoints
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600 dark:text-slate-100">
            <p>
              <strong>POST /api/auth/login</strong> - User authentication
              endpoint
            </p>
            <p>
              <strong>POST /api/auth/register</strong> - User registration
              endpoint
            </p>
            <p>
              <strong>GET /api/auth/session</strong> - Get current user session
            </p>
            <p>
              <strong>POST /api/auth/logout</strong> - User logout endpoint
            </p>
            <p>
              <strong>GET /api/events/upcoming</strong> - Fetch upcoming events
            </p>
            <p>
              <strong>GET /api/admin/users</strong> - List users (admin only)
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
