import { redirect } from 'next/navigation';
import { getSession } from '../../../lib/session';
import BahanClient from './BahanClient';

export default async function BahanPage() {
  const session = await getSession();
  if (!session || session.role !== 'owner') {
    redirect('/pesanan');
  }
  return <BahanClient />;
}
