import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { getRoster } from '@/lib/data';
import { isClusterSlug, clusterName } from '@/lib/clusters';
import { todayISO, fmtShort, isoToParts } from '@/lib/dates';
import { prisma } from '@/lib/db';
import { displayName } from '@/lib/analytics';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ cluster: string }>;
}): Promise<Metadata> {
  const { cluster } = await params;
  if (!isClusterSlug(cluster)) return {};
  return {
    title: `${clusterName(cluster)} — Task Monitoring`,
    description: 'Employee task monitoring dashboard',
  };
}

export default async function ClusterLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ cluster: string }>;
}) {
  const { cluster: clusterParam } = await params;
  if (!isClusterSlug(clusterParam)) notFound();
  const cluster = clusterParam;

  const roster = await getRoster(cluster);
  const counts = await Promise.all(
    roster.map(async (e) => {
      const total = await prisma.task.count({ where: { employeeId: e.id } });
      const done = await prisma.task.count({ where: { employeeId: e.id, status: 'Done' } });
      return { id: e.id, name: displayName(e), completionPct: total ? Math.round((done / total) * 100) : 0 };
    })
  );

  const today = todayISO();
  const { y } = isoToParts(today);
  const todayLabel = `Today · ${fmtShort(today)}, ${y}`;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#eef1f5' }}>
      <Sidebar cluster={cluster} clusterLabel={clusterName(cluster)} todayLabel={todayLabel} employees={counts} />
      <main style={{ flex: 1, minWidth: 0, overflowX: 'hidden' }}>{children}</main>
    </div>
  );
}
