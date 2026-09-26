import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AudioProvider } from "@/lib/audio-context";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vibes — Music Player",
  description:
    "Next.js music player with YouTube downloader, playlists, and dark themes.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#06070a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} theme-violet`}
    >
      <body
        suppressHydrationWarning
        className="min-h-screen bg-[var(--bg-base)] text-[var(--text-main)] flex flex-col antialiased selection:bg-[var(--accent-primary)] selection:text-white"
      >
        <AudioProvider>
          {children}
          <Toaster
            position="bottom-right"
            theme="dark"
            richColors
            closeButton
            toastOptions={{
              className: "border border-white/10 bg-[#0d121c] text-white backdrop-blur-xl",
            }}
          />
        </AudioProvider>
      </body>
    </html>
  );
}
