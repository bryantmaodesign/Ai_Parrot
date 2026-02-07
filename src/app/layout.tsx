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

const APP_NAME = "ParrotAi";
const APP_DESCRIPTION = "Shadow Japanese sentences with AI-generated cards and practice feedback.";
// Set your production URL here or via NEXT_PUBLIC_APP_URL environment variable
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://your-domain.com";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: { default: APP_NAME, template: `%s - ${APP_NAME}` },
  description: APP_DESCRIPTION,
  appleWebApp: { capable: true, statusBarStyle: "default", title: APP_NAME },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icon.png", sizes: "any" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: APP_URL,
    siteName: APP_NAME,
    title: APP_NAME,
    description: APP_DESCRIPTION,
    images: [
      {
        url: "/og-image.png", // 1200x630px recommended
        width: 1200,
        height: 630,
        alt: APP_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: APP_NAME,
    description: APP_DESCRIPTION,
    images: ["/og-image.png"], // 1200x630px recommended
  },
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
