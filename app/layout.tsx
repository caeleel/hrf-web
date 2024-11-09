import type { Metadata } from "next";
import { Lacquer } from "next/font/google";
import "./globals.css";

const lacquer = Lacquer({
  weight: '400',
  subsets: ['latin'],
});

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
      <body className={`${lacquer.className} bg-[#7F29C1]`}>
        {children}
      </body>
    </html>
  );
}
