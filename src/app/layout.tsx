import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import { getRoster } from '@/lib/data';
import { todayISO, fmtShort, isoToParts } from '@/lib/dates';
import { TEAM_NAME } from '@/lib/config';
import { prisma } from '@/lib/db';
import { displayName } from '@/lib/analytics';

export const metadata: Metadata = {
  title: `${TEAM_NAME} — Task Monitoring`,
  description: 'Employee task monitoring dashboard',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const roster = await getRoster();
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
    <html lang="en">
      <body>
        <div style={{ display: 'flex', minHeight: '100vh', background: '#eef1f5' }}>
          <Sidebar teamName={TEAM_NAME} todayLabel={todayLabel} employees={counts} />
          <main style={{ flex: 1, minWidth: 0, overflowX: 'hidden' }}>{children}</main>
        </div>
      </body>
    </html>
  );
}
