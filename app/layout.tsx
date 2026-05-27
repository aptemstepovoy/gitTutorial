import "./globals.css";
import type { Metadata, Viewport } from "next";
import Nav from "@/components/Nav";
import SyncProvider from "@/components/SyncProvider";
import QuickFab from "@/components/QuickFab";

export const metadata: Metadata = {
  title: "Reboot · 12 месяцев",
  description: "Из найма в продукт через Бали. Один экран — один следующий шаг.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Reboot" },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <SyncProvider />
        <div className="min-h-dvh max-w-3xl mx-auto px-4 pt-6 pb-28 safe-bottom">
          {children}
        </div>
        <QuickFab />
        <Nav />
      </body>
    </html>
  );
}
