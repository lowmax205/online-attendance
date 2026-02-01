"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Menu,
  X,
  LogOut,
  User,
  Calendar,
  LayoutDashboard,
  ChevronDown,
  Home,
  Map,
  Users,
  BarChart3,
  ClipboardCheck,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "@/components/logo";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AuthModal, AuthModalTrigger } from "@/components/auth/auth-modal";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import { usePWAInstall } from "@/hooks/use-pwa-install";
import { useRouter, usePathname } from "next/navigation";
import { format } from "date-fns";

interface Event {
  id: string;
  name: string;
  startDateTime: Date;
  venueName: string;
  status: string;
}

function buildInitials(
  firstName?: string,
  lastName?: string,
  email?: string,
): string {
  const first = firstName?.charAt(0)?.toUpperCase() ?? "";
  const last = lastName?.charAt(0)?.toUpperCase() ?? "";
  const initials = `${first}${last}`.trim();

  if (initials.length > 0) {
    return initials;
  }

  const fallback = email?.charAt(0)?.toUpperCase() ?? "";
  return fallback || "U";
}

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"login" | "register">(
    "login",
  );
  const { user, logout, isLoading } = useAuth();
  const { canInstall, isMobile, install } = usePWAInstall();
  const router = useRouter();
  const pathname = usePathname();

  // Check if we're on profile or dashboard pages
  const isOnProfilePage =
    pathname === "/profile" || pathname === "/profile/create";

  // Hide dashboard button ONLY when on main dashboard pages
  const shouldHideDashboardButton =
    pathname === "/dashboard/student" ||
    pathname === "/dashboard/moderator" ||
    pathname === "/dashboard/admin" ||
    pathname === "/dashboard";

  // Fetch upcoming/ongoing events when user is authenticated
  // Only fetch once on mount, use aggressive cache headers from API
  useEffect(() => {
    async function fetchUpcomingEvents() {
      if (!user) return;

      try {
        const response = await fetch("/api/events/upcoming", {
          // Leverage browser cache with stale-while-revalidate
          next: { revalidate: 60 },
        });
        if (response.ok) {
          const data = await response.json();
          setUpcomingEvents(data.events || []);
        }
      } catch (error) {
        console.error("Failed to fetch upcoming events:", error);
      }
    }

    fetchUpcomingEvents();
  }, [user]); // Only re-fetch when user login state changes

  const handleLogout = async () => {
    await logout();
    setIsOpen(false);
    // Force a hard refresh to clear all cached state and navigation
    router.push("/");
    router.refresh();
  };

  const getDashboardRoute = () => {
    if (!user) return "/dashboard";
    switch (user.role) {
      case "Student":
        return "/dashboard/student";
      case "Moderator":
        return "/dashboard/moderator";
      case "Administrator":
        return "/dashboard/admin";
      default:
        return "/dashboard";
    }
  };

  const handleAuthModalOpen = (tab: "login" | "register" = "login") => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
    setIsOpen(false);
  };

  const userInitials = user
    ? buildInitials(user.firstName, user.lastName, user.email)
    : "";
  const userFullName = user
    ? `${user.firstName} ${user.lastName}`.trim() || user.email
    : "";

  // Public navigation for non-authenticated users
  const publicNavLinks = [
    { href: "/", label: "Home" },
    { href: "/updates", label: "Updates" },
  ];

  if (isLoading) {
    return (
      <nav className="border-b bg-background sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <Logo href="/" />
            <div className="animate-pulse h-8 w-20 bg-muted rounded" />
          </div>
        </div>
      </nav>
    );
  }

  return (
    <>
      <AuthModal
        defaultTab={authModalTab}
        open={isAuthModalOpen}
        onOpenChange={setIsAuthModalOpen}
      />
      <nav className="border-b bg-background sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Logo href={user ? getDashboardRoute() : "/"} />

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-4">
              {user ? (
                // Authenticated Navigation
                <>
                  <Link
                    href="/"
                    className="flex items-center gap-1 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
                  >
                    <Home className="h-4 w-4" />
                    Home
                  </Link>
                  <Link
                    href="/updates"
                    className="flex items-center gap-1 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
                  >
                    <Map className="h-4 w-4" />
                    Updates
                  </Link>

                  {/* Events Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="flex items-center gap-1"
                      >
                        <Calendar className="h-4 w-4" />
                        Events
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[300px]">
                      {upcomingEvents.length > 0 ? (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                            Upcoming & Ongoing Events
                          </div>
                          {upcomingEvents.slice(0, 5).map((event) => (
                            <div
                              key={event.id}
                              className="px-2 py-2 flex flex-col items-start"
                            >
                              <span className="font-medium">{event.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(event.startDateTime), "PPp")} •{" "}
                                {event.venueName}
                              </span>
                            </div>
                          ))}
                        </>
                      ) : (
                        <div className="px-2 py-4 text-sm text-center text-muted-foreground">
                          No upcoming events
                        </div>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Management Links for Admin/Moderator */}
                  {(user.role === "Administrator" ||
                    user.role === "Moderator") && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="flex items-center gap-1"
                        >
                          <LayoutDashboard className="h-4 w-4" />
                          Management
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[200px]">
                        {user.role === "Administrator" ? (
                          <>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                              Admin
                            </div>
                            <DropdownMenuItem asChild>
                              <Link href="/dashboard/admin/users">
                                <Users className="h-4 w-4 mr-2" />
                                User Management
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href="/dashboard/admin/analytics">
                                <BarChart3 className="h-4 w-4 mr-2" />
                                Analytics
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href="/dashboard/admin/events">
                                <Calendar className="h-4 w-4 mr-2" />
                                All Events
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href="/dashboard/admin/attendance">
                                <ClipboardCheck className="h-4 w-4 mr-2" />
                                All Attendances
                              </Link>
                            </DropdownMenuItem>
                          </>
                        ) : (
                          <>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                              Limited Actions
                            </div>
                            <DropdownMenuItem asChild>
                              <Link
                                href="/dashboard/admin/users"
                                className="flex items-start gap-2 text-sm"
                              >
                                <Users className="h-4 w-4 mt-0.5" />
                                <div className="flex flex-col">
                                  <span>User Management</span>
                                  <span className="text-xs text-muted-foreground">
                                    Read-only moderator access
                                  </span>
                                </div>
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link
                                href="/dashboard/admin/analytics"
                                className="flex items-start gap-2 text-sm"
                              >
                                <BarChart3 className="h-4 w-4 mt-0.5" />
                                <div className="flex flex-col">
                                  <span>Analytics</span>
                                  <span className="text-xs text-muted-foreground">
                                    Explore institutional trends
                                  </span>
                                </div>
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link
                                href="/dashboard/admin/events"
                                className="flex items-start gap-2 text-sm"
                              >
                                <Calendar className="h-4 w-4 mt-0.5" />
                                <div className="flex flex-col">
                                  <span>All Events</span>
                                  <span className="text-xs text-muted-foreground">
                                    Manage with moderator limits
                                  </span>
                                </div>
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link
                                href="/dashboard/admin/attendance"
                                className="flex items-start gap-2 text-sm"
                              >
                                <ClipboardCheck className="h-4 w-4 mt-0.5" />
                                <div className="flex flex-col">
                                  <span>All Attendances</span>
                                  <span className="text-xs text-muted-foreground">
                                    Monitor verifications
                                  </span>
                                </div>
                              </Link>
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  <ThemeToggle />

                  {/* Install App Button - Mobile Only */}
                  {isMobile && canInstall && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={install}
                      className="flex items-center gap-2"
                      title="Install app"
                    >
                      <Download className="h-4 w-4" />
                      Install
                    </Button>
                  )}

                  {/* User Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="flex items-center gap-2"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={user.profilePictureUrl ?? undefined}
                            alt={userFullName}
                          />
                          <AvatarFallback className="text-xs font-semibold uppercase">
                            {userInitials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{user.firstName}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <div className="px-2 py-1.5">
                        <p className="text-sm font-medium">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Role: <span className="font-medium">{user.role}</span>
                        </p>
                      </div>
                      <DropdownMenuSeparator />
                      {!isOnProfilePage && (
                        <DropdownMenuItem asChild>
                          <Link href="/profile" className="cursor-pointer">
                            <User className="h-4 w-4 mr-2" />
                            Profile
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {!shouldHideDashboardButton && (
                        <DropdownMenuItem asChild>
                          <Link
                            href={getDashboardRoute()}
                            className="cursor-pointer"
                          >
                            <LayoutDashboard className="h-4 w-4 mr-2" />
                            Dashboard
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleLogout}
                        className="cursor-pointer text-destructive"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                // Public Navigation
                <>
                  {publicNavLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  ))}
                  <ThemeToggle />
                  {/* Install App Button - Mobile Only for Public */}
                  {isMobile && canInstall && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={install}
                      className="flex items-center gap-2"
                      title="Install app"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  <AuthModalTrigger />
                </>
              )}
            </div>

            {/* Mobile Navigation */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  className="min-h-11 min-w-11"
                  aria-label="Toggle menu"
                >
                  {isOpen ? (
                    <X className="h-6 w-6" />
                  ) : (
                    <Menu className="h-6 w-6" />
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-full max-w-sm p-0 sm:max-w-md"
              >
                <SheetHeader className="border-b px-6 pb-6 pt-8">
                  <SheetTitle className="text-lg font-semibold">
                    Menu
                  </SheetTitle>
                  <SheetDescription>
                    {user
                      ? `Signed in as ${user.firstName} ${user.lastName}`
                      : "Navigate the platform and manage your account."}
                  </SheetDescription>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto px-6 py-6">
                  {user ? (
                    <div className="flex flex-col gap-8">
                      <section
                        aria-label="Account overview"
                        className="rounded-lg border bg-muted/40 px-4 py-3 shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage
                              src={user.profilePictureUrl ?? undefined}
                              alt={userFullName}
                            />
                            <AvatarFallback className="text-sm font-semibold uppercase">
                              {userInitials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-semibold">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground break-all">
                              {user.email}
                            </p>
                          </div>
                        </div>
                        <span className="mt-3 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                          {user.role}
                        </span>
                      </section>

                      <section aria-label="Quick access" className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Quick Access
                        </p>
                        <div className="grid gap-2">
                          {!shouldHideDashboardButton && (
                            <SheetClose asChild>
                              <Link
                                href={getDashboardRoute()}
                                className="flex items-center gap-3 rounded-md border border-border/60 px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
                              >
                                <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                                <span>Dashboard</span>
                              </Link>
                            </SheetClose>
                          )}
                          {!isOnProfilePage && (
                            <SheetClose asChild>
                              <Link
                                href="/profile"
                                className="flex items-center gap-3 rounded-md border border-border/60 px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
                              >
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span>Profile</span>
                              </Link>
                            </SheetClose>
                          )}
                          <SheetClose asChild>
                            <Link
                              href="/"
                              className="flex items-center gap-3 rounded-md border border-border/60 px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
                            >
                              <Home className="h-4 w-4 text-muted-foreground" />
                              <span>Home</span>
                            </Link>
                          </SheetClose>
                          <SheetClose asChild>
                            <Link
                              href="/updates"
                              className="flex items-center gap-3 rounded-md border border-border/60 px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
                            >
                              <Map className="h-4 w-4 text-muted-foreground" />
                              <span>Updates</span>
                            </Link>
                          </SheetClose>
                        </div>
                      </section>

                      {(user.role === "Moderator" ||
                        user.role === "Administrator") && (
                        <section
                          aria-label="Moderator tools"
                          className="space-y-3"
                        >
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            My Workflows
                          </p>
                        </section>
                      )}

                      {(user.role === "Administrator" ||
                        user.role === "Moderator") && (
                        <section aria-label="Management" className="space-y-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Management
                          </p>
                          <div className="grid gap-2">
                            <SheetClose asChild>
                              <Link
                                href="/dashboard/admin/users"
                                className="flex items-center gap-3 rounded-md border border-border/60 px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
                              >
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span>User Management</span>
                              </Link>
                            </SheetClose>
                            <SheetClose asChild>
                              <Link
                                href="/dashboard/admin/analytics"
                                className="flex items-center gap-3 rounded-md border border-border/60 px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
                              >
                                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                                <span>Analytics</span>
                              </Link>
                            </SheetClose>
                            <SheetClose asChild>
                              <Link
                                href="/dashboard/admin/events"
                                className="flex items-center gap-3 rounded-md border border-border/60 px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
                              >
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span>All Events</span>
                              </Link>
                            </SheetClose>
                            <SheetClose asChild>
                              <Link
                                href="/dashboard/admin/attendance"
                                className="flex items-center gap-3 rounded-md border border-border/60 px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
                              >
                                <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                                <span>All Attendances</span>
                              </Link>
                            </SheetClose>
                          </div>
                        </section>
                      )}

                      <section
                        aria-label="Upcoming events"
                        className="space-y-3"
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Upcoming Events
                        </p>
                        {upcomingEvents.length > 0 ? (
                          <ul className="space-y-2">
                            {upcomingEvents.slice(0, 3).map((event) => (
                              <li key={event.id}>
                                <div className="block rounded-md border border-border/60 px-3 py-2 text-sm text-foreground/80">
                                  <span className="font-medium">
                                    {event.name}
                                  </span>
                                  <span className="mt-1 block text-xs text-muted-foreground">
                                    {format(
                                      new Date(event.startDateTime),
                                      "PPp",
                                    )}{" "}
                                    • {event.venueName}
                                  </span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No upcoming events at the moment.
                          </p>
                        )}
                      </section>
                    </div>
                  ) : (
                    <div
                      className="flex flex-col gap-8"
                      aria-label="Public navigation"
                    >
                      <section aria-label="Browse" className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Browse
                        </p>
                        <div className="grid gap-2">
                          {publicNavLinks.map((link) => (
                            <SheetClose asChild key={link.href}>
                              <Link
                                href={link.href}
                                className="flex items-center gap-3 rounded-md border border-border/60 px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
                              >
                                <span>{link.label}</span>
                              </Link>
                            </SheetClose>
                          ))}
                        </div>
                      </section>

                      <section
                        aria-label="Upcoming events"
                        className="space-y-3"
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Upcoming Events
                        </p>
                        {upcomingEvents.length > 0 ? (
                          <ul className="space-y-2">
                            {upcomingEvents.slice(0, 3).map((event) => (
                              <li key={event.id}>
                                <div className="block rounded-md border border-border/60 px-3 py-2 text-sm text-foreground/80">
                                  <span className="font-medium">
                                    {event.name}
                                  </span>
                                  <span className="mt-1 block text-xs text-muted-foreground">
                                    {format(
                                      new Date(event.startDateTime),
                                      "PPp",
                                    )}{" "}
                                    • {event.venueName}
                                  </span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No upcoming events yet. Check back soon!
                          </p>
                        )}
                      </section>
                    </div>
                  )}
                </div>
                <SheetFooter className="border-t bg-muted/40 px-6 pb-6 pt-4">
                  {user ? (
                    <div className="flex w-full items-center justify-between gap-3">
                      <ThemeToggle />
                      {canInstall && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={install}
                          className="flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Install
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        onClick={handleLogout}
                        className="flex-1 flex items-center justify-center gap-2"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </Button>
                    </div>
                  ) : (
                    <div className="flex w-full flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">
                          Theme
                        </span>
                        <ThemeToggle />
                      </div>
                      {canInstall && (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={install}
                          title="Install app"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Install App
                        </Button>
                      )}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleAuthModalOpen("login")}
                        >
                          Login
                        </Button>
                        <Button
                          className="flex-1"
                          onClick={() => handleAuthModalOpen("register")}
                        >
                          Create Account
                        </Button>
                      </div>
                    </div>
                  )}
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
    </>
  );
}
