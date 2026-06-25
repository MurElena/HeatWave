import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TopNav } from "@/components/layout/TopNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HeatWave — Translation Model Evaluation",
  description:
    "Modular platform for translation model evaluation — dataset creation, evaluation, and comparison.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-slate-50 font-sans text-slate-900">
        <TopNav />
        <main className="flex flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}
