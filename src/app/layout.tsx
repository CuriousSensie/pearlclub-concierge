import type { Metadata, Viewport } from "next";
import { Cormorant, Karla, Noto_Naskh_Arabic, Space_Mono } from "next/font/google";
import { ToastProvider } from "@/components/Toaster";
import "./globals.css";

// Pearl Club's own type system: Karla for text, Space Mono for titles and labels,
// Cormorant italic for statements. Naskh covers Arabic and Urdu, which none of them include.
const body = Karla({ variable: "--font-body", subsets: ["latin", "latin-ext"] });
const mono = Space_Mono({
  variable: "--font-mono",
  weight: ["400", "700"],
  subsets: ["latin", "latin-ext"],
});
const display = Cormorant({
  variable: "--font-display",
  style: ["italic", "normal"],
  weight: ["500", "600"],
  subsets: ["latin", "latin-ext"],
});
const arabic = Noto_Naskh_Arabic({ variable: "--font-arabic", subsets: ["arabic"] });

export const metadata: Metadata = {
  title: "Concierge · Pearl Club",
  description: "An AI hotel concierge powered by local recommendations from Pearl Club.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${body.variable} ${mono.variable} ${display.variable} ${arabic.variable} h-full antialiased`}
    >
      <body id="pearlclub" className="min-h-full">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
