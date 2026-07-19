import { redirect } from 'next/navigation';
import { getSession } from '../../lib/session';
import NavBar from './NavBar';

export default async function AppLayout({ children }) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  return (
    <div>
      <NavBar session={session} />
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
