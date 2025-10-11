import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../contexts/AuthContext";
import { LocationProvider } from "../contexts/LocationContext";
import NavigationComponent from "../components/Navigation";
import FeedbackClientWrapper from '../components/FeedbackClientWrapper';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <LocationProvider>
          <AuthProvider>
            <NavigationComponent />
            {children}
            {/* Botão global de feedback */}
            <FeedbackClientWrapper />
          </AuthProvider>
        </LocationProvider>
      </body>
    </html>
  );
}
