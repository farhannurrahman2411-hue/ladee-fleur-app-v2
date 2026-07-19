import './globals.css';

export const metadata = {
  title: 'Ladee Fleur - Pemesanan & Nota',
  description: 'Aplikasi pemesanan dan nota Ladee Fleur',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="bg-fleur-50 min-h-screen text-gray-800">{children}</body>
    </html>
  );
}
