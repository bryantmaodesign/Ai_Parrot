import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { SettingsButton } from "@/components/SettingsButton";
import { SettingsSheet } from "@/components/SettingsSheet";
import { InstallPrompt } from "@/components/InstallPrompt";
import { RecordingProvider } from "@/contexts/RecordingContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { CardQueueProvider } from "@/contexts/CardQueueContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_NAME = "Japanese Shadowing";
const APP_DESCRIPTION = "Shadow Japanese sentences with AI-generated cards and practice feedback.";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: { default: APP_NAME, template: `%s - ${APP_NAME}` },
  description: APP_DESCRIPTION,
  appleWebApp: { capable: true, statusBarStyle: "default", title: APP_NAME },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#fe3c72",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-white text-[#1a1a1a]`}
        suppressHydrationWarning
      >
        <RecordingProvider>
          <SettingsProvider>
            <CardQueueProvider>
              <main className="flex h-[100dvh] flex-col overflow-hidden pb-20">{children}</main>
              <SettingsButton />
              <SettingsSheet />
              <InstallPrompt />
              <Nav />
            </CardQueueProvider>
          </SettingsProvider>
        </RecordingProvider>
      </body>
    </html>
  );
}
