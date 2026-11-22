import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { ToastProvider } from "@/components/ui/Toast";
import { SidebarStateProvider } from "@/components/layout/SidebarState";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "CDRRMD Onboarding Management System",
    template: "%s | CDRRMD DMS",
  },
  description: "New Hire Onboarding Management System for the Butuan City Disaster Risk Reduction and Management Office.",
  other: {
    "page-type": "software",
    "site-kind": "software",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-type="software"
      data-site-kind="software"
      data-radius="soft"
      data-motion="ui"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="stylesheet" href="/assets/motion/motion.css" />
      </head>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <SidebarStateProvider>
            <ToastProvider>
              <Suspense fallback={null}>{children}</Suspense>
            </ToastProvider>
          </SidebarStateProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
