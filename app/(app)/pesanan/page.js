import { getSession } from '../../../lib/session';
import PesananClient from './PesananClient';

export default async function PesananPage() {
  const session = await getSession();
  return <PesananClient role={session?.role} />;
}
