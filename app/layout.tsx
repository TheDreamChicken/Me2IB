import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "me2IB — your recruiting HQ",
    template: "%s · me2IB",
  },
  description:
    "Track contacts, applications, interviews, and deadlines. Get a personalized recruiting plan for finance, consulting, and beyond — all in one cozy hub.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // No h-full here: html must wrap the full document so the body's
      // page-length background gradient (globals.css) spans the whole page.
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      // The theme script below stamps data-theme before hydration; React
      // shouldn't warn about that attribute differing from the server HTML.
      suppressHydrationWarning
    >
      <body className="min-h-screen flex flex-col">
        {/* Apply the saved theme before paint to avoid a flash of the default */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("me2ib-theme");if(t&&t!=="lavender")document.documentElement.dataset.theme=t;}catch(e){}`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
