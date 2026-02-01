"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PWAInstallContextType {
  canInstall: boolean;
  isMobile: boolean;
  isIOS: boolean;
  deferredPrompt: BeforeInstallPromptEvent | null;
  install: () => Promise<void>;
}

const PWAInstallContext = createContext<PWAInstallContextType | undefined>(
  undefined,
);

export function PWAInstallProvider({ children }: { children: ReactNode }) {
  const [canInstall, setCanInstall] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      return;
    }

    // Detect mobile
    const mobileCheck =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );
    setIsMobile(mobileCheck);

    if (!mobileCheck) {
      return;
    }

    // Detect iOS
    const iosCheck =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(iosCheck);

    if (iosCheck) {
      return;
    }

    // Handle beforeinstallprompt for Android/Chrome
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Check if app was installed
    const handleAppInstalled = () => {
      setCanInstall(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;

      if (choiceResult.outcome === "accepted") {
        console.log("[PWA] User accepted install prompt");
      } else {
        console.log("[PWA] User dismissed install prompt");
      }
    } catch (error) {
      console.error("[PWA] Install error:", error);
    } finally {
      setDeferredPrompt(null);
      setCanInstall(false);
    }
  };

  return (
    <PWAInstallContext.Provider
      value={{
        canInstall,
        isMobile,
        isIOS,
        deferredPrompt,
        install,
      }}
    >
      {children}
    </PWAInstallContext.Provider>
  );
}

export function usePWAInstall() {
  const context = useContext(PWAInstallContext);
  if (context === undefined) {
    throw new Error("usePWAInstall must be used within PWAInstallProvider");
  }
  return context;
}
