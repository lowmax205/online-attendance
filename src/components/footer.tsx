"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { SimpleIcon } from "@/components/ui/simple-icon";
import { AuthModal } from "@/components/auth/auth-modal";
import { useAuth } from "@/hooks/use-auth";
import { siGithub, siMeta } from "simple-icons";
import { useEffect, useState } from "react";

export function Footer() {
  const { user } = useAuth();
  const [currentYear, setCurrentYear] = useState(0);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="border-t bg-background mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="space-y-4">
            <Logo href="/" size="md" />
            <p className="text-sm text-muted-foreground">
              A modern event attendance tracking system for educational
              institutions.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/updates"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Updates
                </Link>
              </li>
              {!user && (
                <li>
                  <AuthModal
                    trigger={
                      <button className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left">
                        Login
                      </button>
                    }
                  />
                </li>
              )}
            </ul>
          </div>

          {/* Contact Developer */}
          <div>
            <h3 className="font-semibold mb-4">Contact Developer</h3>
            <div className="space-y-3">
              <a
                href="https://github.com/lowmax205"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <SimpleIcon icon={siGithub} size={16} />
                GitHub
              </a>
              <a
                href="https://www.facebook.com/tokitamo"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <SimpleIcon icon={siMeta} size={16} />
                Facebook
              </a>
            </div>
          </div>

          {/* About */}
          <div>
            <h3 className="font-semibold mb-4">About</h3>
            <p className="text-sm text-muted-foreground">
              Event Attendance System (EAS) is designed to streamline attendance
              tracking for events with QR code technology and real-time
              verification.
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground text-center md:text-left">
              © {currentYear || new Date().getFullYear()} Event Attendance
              System (EAS). All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
