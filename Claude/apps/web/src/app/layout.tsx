import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "ServiceLine AI — AI Phone System for HVAC & Plumbing",
  description:
    "Never miss a call. Book appointments 24/7. See exactly how much revenue your AI receptionist rescues.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("dark", "font-sans", geist.variable)}>
      <body
        className={`${dmSans.variable} ${jetbrainsMono.variable} antialiased`}
        style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
