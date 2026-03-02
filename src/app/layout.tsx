import type { Metadata } from "next";
import { Sora, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../contexts/AuthContext";
import { LocationProvider } from "../contexts/LocationContext";
import NavigationComponent from "../components/Navigation";
import { ToastProvider } from '../contexts/ToastContext';
import HtmlLangSync from "../components/HtmlLangSync";
import ServiceWorkerRegistration from "../components/ServiceWorkerRegistration";

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
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DespFamiliar",
  },
  formatDetection: {
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${sora.variable} ${jetbrainsMono.variable} antialiased`}>
        <ServiceWorkerRegistration />
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
