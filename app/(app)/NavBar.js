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
    `flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      pathname.startsWith(href)
        ? 'bg-fleur-600 text-white'
        : 'text-gray-600 hover:bg-fleur-50 hover:text-fleur-700'
    }`;

  return (
    <aside className="no-print w-60 shrink-0 bg-white border-r min-h-screen flex flex-col">
      <div className="px-5 py-5 border-b">
        <span className="font-bold text-fleur-700 text-lg">Ladee Fleur</span>
        <p className="text-xs text-gray-400 mt-0.5">
          {session.role === 'owner' ? 'Owner' : 'Staff'} &middot; {session.full_name || session.username}
        </p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
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
      </nav>

      <div className="px-3 py-4 border-t">
        <button
          onClick={handleLogout}
          className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100"
        >
          Keluar
        </button>
      </div>
    </aside>
  );
}
