"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import type { UserSession } from "@/lib/types/user";

/**
 * Authentication Context
 * Provides global authentication state management
 * Optimized for reduced API calls and better performance
 */

interface AuthContextType {
  user: UserSession | null;
  isLoading: boolean;
  login: (user: UserSession) => void;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<UserSession>) => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session check interval: 5 minutes (increased from 2 minutes)
const SESSION_CHECK_INTERVAL = 5 * 60 * 1000;

// Debounce delay for visibility/focus events
const VISIBILITY_DEBOUNCE = 10 * 1000; // 10 seconds

/**
 * Authentication Provider Component
 * Wraps the app to provide auth state to all components
 *
 * Optimizations:
 * - Increased polling interval from 2 min to 5 min
 * - Added debouncing for visibility/focus events
 * - Uses cached session API response
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const userRef = useRef<UserSession | null>(null);
  const lastCheckRef = useRef<number>(0);
  const isCheckingRef = useRef<boolean>(false);

  // Keep ref in sync with state
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const checkSession = useCallback(async (force = false) => {
    // Prevent concurrent checks
    if (isCheckingRef.current) return;

    // Debounce: skip if checked recently (within 30 seconds) unless forced
    const now = Date.now();
    if (!force && now - lastCheckRef.current < 30000) {
      return;
    }

    isCheckingRef.current = true;
    lastCheckRef.current = now;

    try {
      const response = await fetch("/api/auth/session", {
        // Always fetch fresh session to prevent stale user data after logout/login
        cache: "no-store",
        headers: {
          "cache-control": "no-cache",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        // Session expired or invalid - clear user state and redirect
        if (userRef.current) {
          // Only redirect if user was previously logged in
          setUser(null);
          window.location.href = "/?error=session_expired";
        } else {
          setUser(null);
        }
      }
    } catch (error) {
      console.error("Session check failed:", error);
      if (userRef.current) {
        setUser(null);
        window.location.href = "/?error=session_expired";
      } else {
        setUser(null);
      }
    } finally {
      setIsLoading(false);
      isCheckingRef.current = false;
    }
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    checkSession(true);
  }, [checkSession]);

  // Periodic session validation - every 5 minutes (optimized from 2 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      if (user) {
        checkSession();
      }
    }, SESSION_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [user, checkSession]);

  // Debounced visibility/focus handlers
  useEffect(() => {
    let debounceTimeout: NodeJS.Timeout | null = null;

    const handleVisibilityOrFocus = () => {
      if (!user) return;

      // Clear existing debounce
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }

      // Debounce the check to prevent rapid-fire requests
      debounceTimeout = setTimeout(() => {
        checkSession();
      }, VISIBILITY_DEBOUNCE);
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        handleVisibilityOrFocus();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityOrFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
    };
  }, [user, checkSession]);

  function login(userData: UserSession) {
    setUser(userData);
    lastCheckRef.current = Date.now();
  }

  async function logout() {
    try {
      const { logout: logoutAction } = await import("@/actions/auth/logout");
      await logoutAction();
      setUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
      // Still clear local state even if server logout fails
      setUser(null);
    }
  }

  function updateUser(updates: Partial<UserSession>) {
    setUser((prev) => (prev ? { ...prev, ...updates } : null));
  }

  async function refreshSession() {
    await checkSession(true);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        updateUser,
        refreshSession,
      }}
    >
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

/**
 * useAuth Hook
 * Access authentication state and methods from any component
 *
 * @example
 * ```tsx
 * const { user, isLoading, logout, refreshSession } = useAuth();
 *
 * if (isLoading) return <Spinner />;
 * if (!user) return <LoginForm />;
 *
 * return <div>Welcome, {user.firstName}!</div>;
 * ```
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
