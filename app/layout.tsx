import type { Metadata } from "next";
import "./globals.css";
import { Lato } from "next/font/google";

const questrial = Lato({
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Regex app",
  description: "Compiladores :)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${questrial.className} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
