import { getSession } from '../../../lib/session';
import JobClient from './JobClient';

export default async function JobPage() {
  const session = await getSession();
  return <JobClient />;
}
