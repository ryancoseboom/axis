import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Axis",
  description: "A local Version Zero prototype of the Axis Today engine."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
