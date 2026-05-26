import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ServiPlus - Reportes Operativos",
  description: "Módulo analítico centralizado de reportes operativos de ServiPlus S.A.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
