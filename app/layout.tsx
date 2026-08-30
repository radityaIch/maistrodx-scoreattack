import type { Metadata } from "next";
import { Geist, Geist_Mono, Russo_One } from "next/font/google";
import "./globals.css";
import { NavSession } from "@/components/NavSession";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const russoOne = Russo_One({
  variable: "--font-russo-one",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "maistrodx score attack",
  description: "Community maimai score-attack tournament platform",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${russoOne.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NavSession />
        <main className="flex-1 flex flex-col">{children}</main>
        <footer className="border-t border-[color:var(--color-border)] py-6 text-center text-xs text-[color:var(--color-muted-foreground)]">
          maistrodx score attack · built for the community
        </footer>
      </body>
    </html>
  );
}
