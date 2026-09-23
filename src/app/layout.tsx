import type { Metadata } from "next";
import "./globals.css";
import { DM_Sans, Source_Serif_4 } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import ToastProvider from "@/components/ToastProvider";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ContentForge AI",
  description: "Generative AI content platform with brand voice, repurposing and scheduling.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${sourceSerif.variable}`}>
      <body className="min-h-screen antialiased">
        <ClerkProvider>
          <ToastProvider>{children}</ToastProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
