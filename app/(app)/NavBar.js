'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
export default function NavBar({ session }) {
  const pathname = usePathname();
  const router = useRouter();
  async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }
  const linkClass = (href) =>
    `px-3 py-2 rounded-lg text-sm font-medium ${
      pathname.startsWith(href)
        ? 'bg-fleur-600 text-white'
        : 'text-fleur-700 hover:bg-fleur-100'
    }`;
  return (
    <nav className="no-print bg-white border-b sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div>
          <span className="font-bold text-fleur-700 text-lg">Ladee Fleur</span>
          <span className="ml-2 text-xs text-gray-400">
            {session.role === 'owner' ? 'Owner' : 'Staff'} · {session.full_name || session.username}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Link href="/pesanan" className={linkClass('/pesanan')}>
            Pesanan
          </Link>
          <Link href="/job" className={linkClass('/job')}>
            Job Perangkai Bouquet
          </Link>
          {session.role === 'owner' && (
            <Link href="/bahan" className={linkClass('/bahan')}>
              Database Bahan
            </Link>
          )}
{session.role === 'owner' && (
            <Link href="/katalog" className={linkClass('/katalog')}>
              Katalog Bouquet
            </Link>
          )}
          {session.role === 'owner' && (
            <Link href="/rekap" className={linkClass('/rekap')}>
              Rekap Penjualan
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="ml-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100"
          >
            Keluar
          </button>
        </div>
      </div>
    </nav>
  );
}
