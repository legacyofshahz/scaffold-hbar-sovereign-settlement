import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oracle-Guarded Sovereign Settlement",
  description: "Deterministic Hedera settlement guard with Supra, HCS, and Mirror verification.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
