import type React from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "CodeReview - Share Code for Team Review",
  description:
    "Share JavaScript code with your team for review. Get shareable links and collaborate with line-by-line comments.",
  generator: "v0.app",
};

// This is used to suppress the cz-shortcut-listen warning
const removeShortcutAttribute = `
  (function() {
    if (typeof window !== 'undefined') {
      window.addEventListener('load', function() {
        document.body.removeAttribute('cz-shortcut-listen');
      });
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
        <script dangerouslySetInnerHTML={{ __html: removeShortcutAttribute }} />
      </body>
    </html>
  );
}