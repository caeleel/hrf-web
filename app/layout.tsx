import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hurt Right Feet",
  description: "Bringing projects to life through code and physical media",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
