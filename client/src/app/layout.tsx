import type { Metadata, Viewport } from "next";
import { Mukta, Yatra_One } from "next/font/google";
import { AuthProvider } from "@/features/auth/AuthProvider";
import "./globals.css";

const mukta = Mukta({
  subsets: ["latin", "devanagari"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-mukta",
  display: "swap",
});

const yatra = Yatra_One({
  subsets: ["latin", "devanagari"],
  weight: "400",
  variable: "--font-yatra",
  display: "swap",
});

export const metadata: Metadata = {
  title: "UNO Nepal",
  description: "Play UNO with friends, wherever they are",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#7a1630",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${mukta.variable} ${yatra.variable} font-sans antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
