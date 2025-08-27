import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto',
});

export const metadata: Metadata = {
  title: "Rally Track - 試合結果管理サイト",
  description: "Rally Trackは、試合結果を簡単に管理するためのプラットフォームです。",
  authors: [{ name: "Rally Track Team" }],
  creator: "Rally Track Team",
  publisher: "Rally Track",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    title: 'Rally Track - 試合結果管理サイト',
    description: 'Rally Trackは、原卓会の公式サイトです。',
    siteName: 'Rally Track',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rally Track - 試合結果管理サイト',
    description: 'Rally Trackは、原卓会の公式サイトです。',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={roboto.variable}>
      <head>
        <meta name="theme-color" content="#1976d2" />
        <meta name="color-scheme" content="light" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/favicon.ico" />
        <meta name="msapplication-TileColor" content="#1976d2" />
      </head>
      <body className={roboto.className}>
        {children}
      </body>
    </html>
  );
}
