import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lead Hunter — System Wyszukiwania i Kwalifikacji Leadów B2B",
  description: "Inteligentne wyszukiwanie firm z bazy KRS i BizRaport pod kątem punktów zaczepienia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body className="antialiased bg-slate-950 text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
