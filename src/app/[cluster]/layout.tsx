import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import ChatWidget from '@/components/chat/ChatWidget';
import { getRoster } from '@/lib/data';
import { isClusterSlug, clusterName } from '@/lib/clusters';
import { todayISO, fmtShort, isoToParts } from '@/lib/dates';
import { prisma } from '@/lib/db';
import { displayName } from '@/lib/analytics';
import { getMemberSession, isAdminUnlocked } from '@/lib/memberAuth';
import styles from './layout.module.css';

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
      return { id: e.id, name: displayName(e), photo: e.photo, completionPct: total ? Math.round((done / total) * 100) : 0 };
    })
  );

  const today = todayISO();
  const { y } = isoToParts(today);
  const todayLabel = `Today · ${fmtShort(today)}, ${y}`;

  const isAdmin = await isAdminUnlocked(cluster);
  const session = await getMemberSession(cluster);
  const viewer = session ? roster.find((e) => e.id === session.employeeId) || null : null;

  return (
    <div className={styles.shell}>
      <Sidebar
        cluster={cluster}
        clusterLabel={clusterName(cluster)}
        todayLabel={todayLabel}
        employees={counts}
        isAdmin={isAdmin}
        viewerName={viewer ? displayName(viewer) : null}
      />
      <main className={styles.main}>{children}</main>
      {/* MSMA Chat — piloting on ADS cluster only; needs a member identity */}
      {cluster === 'ads' && session && <ChatWidget cluster={cluster} viewerId={session.employeeId} />}
    </div>
  );
}
