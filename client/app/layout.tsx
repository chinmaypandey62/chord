import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "../src/styles/globals.css";
import ClientProvider from "../src/components/ClientProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chord",
  description: "A simple app to manage your friends and their chords",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Standard Favicon */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        {/* Apple Touch Icon */}
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        {/* PNG Favicons (Optional but recommended) */}
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        {/* Remove or comment out the manifest line until you have the file */}
        {/* <link rel="manifest" href="/site.webmanifest" /> */}
        {/* Safari Pinned Tab */}
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#5bbad5" />
        {/* Microsoft Tiles */}
        <meta name="msapplication-TileColor" content="#da532c" />
        {/* Theme Color for Browser UI */}
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* ClientProvider handles all the client-side context providers */}
        <ClientProvider>
          {children}
        </ClientProvider>
      </body>
    </html>
  )
}
