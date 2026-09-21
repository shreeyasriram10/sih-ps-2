import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ConditionalLayout from "@/components/layout/ConditionalLayout";
import WavyBackground from "@/components/WavyBackground";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "AQUALENS — Ocean Satellite Intelligence Platform",
  description: "Deep-learning reconstruction of subsurface ocean temperature from multi-source satellite observations across the North Indian Ocean. Developed for SIH 2024.",
  keywords: "ocean intelligence, subsurface temperature, satellite embedding, deep learning, INCOIS, North Indian Ocean, ARGO validation, AQUALENS",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased relative min-h-screen`} style={{ background: '#e0f2fe', color: '#0c4a6e' }}>
        <WavyBackground />
        <div className="relative z-10">
          <ConditionalLayout>{children}</ConditionalLayout>
        </div>
      </body>
    </html>
  );
}
