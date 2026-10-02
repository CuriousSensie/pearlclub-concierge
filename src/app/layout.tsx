import type { Metadata, Viewport } from "next";
import { Figtree, Instrument_Serif, Noto_Naskh_Arabic } from "next/font/google";
import { ToastProvider } from "@/components/Toaster";
import "./globals.css";

const display = Instrument_Serif({ variable: "--font-display", subsets: ["latin"], weight: "400" });
const body = Figtree({ variable: "--font-body", subsets: ["latin"] });
const arabic = Noto_Naskh_Arabic({ variable: "--font-arabic", subsets: ["arabic"] });

export const metadata: Metadata = {
  title: "Pearl Club Concierge",
  description: "An AI hotel concierge powered by local recommendations from Pearl Club.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${arabic.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
