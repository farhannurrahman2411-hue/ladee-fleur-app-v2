'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function NavBar({ session }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const linkClass = (href) =>
    `flex items-center px-4 py-3 md:py-2.5 rounded-lg text-sm font-medium transition-colors ${
      pathname.startsWith(href)
        ? 'bg-fleur-600 text-white'
        : 'text-gray-600 hover:bg-fleur-50 hover:text-fleur-700'
    }`;

  const isOwner = session.role === 'owner';

  const asideClass =
    'no-print fixed inset-y-0 left-0 z-50 w-64 bg-white border-r flex flex-col transition-transform duration-200 md:static md:z-auto md:w-60 md:min-h-screen md:shrink-0 md:translate-x-0 ' +
    (open ? 'translate-x-0' : '-translate-x-full');

  return (
    <>
      <header className="no-print md:hidden sticky top-0 z-30 flex items-center justify-between bg-white border-b px-4 py-3">
        <span className="font-bold text-fleur-700 text-lg">Ladee Fleur</span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Buka menu"
          className="p-2 -mr-2 rounded-lg text-gray-600 hover:bg-gray-100"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 6h16" />
            <path d="M4 12h16" />
            <path d="M4 18h16" />
          </svg>
        </button>
      </header>

      {open && (
        <div
          className="no-print fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside className={asideClass}>
        <div className="px-5 py-5 border-b flex items-start justify-between">
          <div>
            <span className="font-bold text-fleur-700 text-lg">Ladee Fleur</span>
            <p className="text-xs text-gray-400 mt-0.5">
              {isOwner ? 'Owner' : 'Staff'} &middot; {session.full_name || session.username}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Tutup menu"
            className="md:hidden p-1 -mr-1 text-gray-500"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12" />
              <path d="M18 6L6 18" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <Link href="/pesanan" className={linkClass('/pesanan')}>
            Pesanan
          </Link>
          <Link href="/job" className={linkClass('/job')}>
            Job Perangkai Bouquet
          </Link>
          {isOwner && (
            <Link href="/bahan" className={linkClass('/bahan')}>
              Database Bahan
            </Link>
          )}
          {isOwner && (
            <Link href="/katalog" className={linkClass('/katalog')}>
              Katalog Bouquet
            </Link>
          )}
          {isOwner && (
            <Link href="/rekap" className={linkClass('/rekap')}>
              Rekap Penjualan
            </Link>
          )}
        </nav>

        <div className="px-3 py-4 border-t">
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-3 md:py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100"
          >
            Keluar
          </button>
        </div>
      </aside>
    </>
  );
}
