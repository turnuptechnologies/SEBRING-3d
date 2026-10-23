import type { Metadata, Viewport } from "next"
import { Archivo, Geist, Geist_Mono } from "next/font/google"

import { site } from "@/lib/site"
import "./globals.css"

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
})

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — Slot cars, parts & upgrades`,
    template: `%s · ${site.shortName}`,
  },
  description: site.description,
  applicationName: site.name,
  keywords: [
    "slot cars",
    "slot car parts",
    "1:32 slot cars",
    "1:24 slot cars",
    "slot car motors",
    "slot car tires",
    "slot car controllers",
    "slot car track",
    "Scalextric",
    "Carrera",
    "Slot.it",
    "NSR",
  ],
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: "en_US",
  },
  twitter: { card: "summary_large_image" },
}

export const viewport: Viewport = {
  themeColor: "#0b0b0f",
  colorScheme: "dark",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Skip the intro preloader before first paint once it has played this session. */}
        <script dangerouslySetInnerHTML={{ __html: `try{if(sessionStorage.getItem("sb-intro"))document.documentElement.dataset.intro="done"}catch(e){}` }} />
      </head>
      <body className="min-h-full bg-background text-foreground">{children}</body>
    </html>
  )
}
