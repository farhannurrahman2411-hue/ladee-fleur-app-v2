import { redirect } from 'next/navigation';
import { getSession } from '../../lib/session';
import NavBar from './NavBar';

export default async function AppLayout({ children }) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }
  return (
    <div className="flex min-h-screen bg-gray-50">
      <NavBar session={session} />
      <main className="flex-1 px-6 py-6 max-w-6xl mx-auto w-full">{children}</main>
    </div>
  );
}
