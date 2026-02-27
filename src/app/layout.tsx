import type { Metadata } from "next";
import { Sora, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../contexts/AuthContext";
import { LocationProvider } from "../contexts/LocationContext";
import NavigationComponent from "../components/Navigation";
import { ToastProvider } from '../contexts/ToastContext';
import HtmlLangSync from "../components/HtmlLangSync";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Controle de Despesas Familiar",
  description: "Aplicação para controle de despesas familiares com projeções financeiras",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${sora.variable} ${jetbrainsMono.variable} antialiased`}>
        <LocationProvider>
          <HtmlLangSync />
          <AuthProvider>
            <ToastProvider>
              <NavigationComponent />
              {children}
            </ToastProvider>
          </AuthProvider>
        </LocationProvider>
      </body>
    </html>
  );
}
