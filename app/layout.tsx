import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kabariya Parivar - Admin Control Panel",
  description: "Official administrative dashboard for Kabariya Parivar community directory & events management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="gu">
      <body>{children}</body>
    </html>
  );
}
