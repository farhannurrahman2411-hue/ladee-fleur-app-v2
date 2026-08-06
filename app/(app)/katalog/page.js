import React from 'react';
import { getSession } from '../../../lib/session';
import { redirect } from 'next/navigation';
import KatalogClient from './KatalogClient';

export default async function KatalogPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role !== 'owner') redirect('/pesanan');
  return React.createElement(KatalogClient);
}
