import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { AuthProvider } from "@/contexts/auth-context";
import { RealtimeProvider } from "@/contexts/realtime-context";
import { getServerUser } from "@/lib/session.server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "COOKify - Recipe Sharing",
  description: "Discover, share, and discuss recipes filtered by what you have on hand.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const initialUser = await getServerUser();

  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-cream text-ink">
        <AuthProvider initialUser={initialUser}>
          <RealtimeProvider>
            <Header />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
            <Footer />
          </RealtimeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
