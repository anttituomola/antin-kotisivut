import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Antti's Toolbox",
  description: "A collection of useful tools by Antti Tuomola",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
