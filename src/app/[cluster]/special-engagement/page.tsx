export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/db';
import { getEngagementsAction } from '@/lib/engagementActions';
import type { ClusterSlug } from '@/lib/clusters';
import { isAdminUnlocked } from '@/lib/memberAuth';
import EngagementPageClient from '@/components/special-engagement/EngagementPageClient';

export default async function SpecialEngagementPage({
  params,
}: {
  params: Promise<{ cluster: ClusterSlug }>;
}) {
  const { cluster } = await params;

  // Admin-only area: requires the cluster password session
  if (!(await isAdminUnlocked(cluster))) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', padding: '2rem' }}>
        <div
          style={{
            background: '#fff',
            border: '1px solid #dbe1ea',
            borderRadius: 14,
            boxShadow: '0 2px 8px rgba(15,23,42,0.07)',
            padding: '40px 44px',
            maxWidth: 460,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 34, marginBottom: 10 }}>🔒</div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Access Restricted</h1>
          <p style={{ fontSize: '0.92rem', color: '#64748b', lineHeight: 1.6 }}>
            Special Engagement Monitoring is only available with cluster access.
            Please contact your direct supervisor if you need access.
          </p>
        </div>
      </div>
    );
  }

  const result = await getEngagementsAction(cluster);
  const engagements = Array.isArray(result) ? result : [];
  const employees = await prisma.employee.findMany({
    where: { cluster },
    select: { name: true },
    orderBy: { name: 'asc' },
  });

  return (
    <EngagementPageClient
      cluster={cluster}
      engagements={engagements}
      employees={employees.map((e) => e.name)}
    />
  );
}
