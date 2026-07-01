export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/db';
import { getEngagementsAction } from '@/lib/engagementActions';
import type { ClusterSlug } from '@/lib/clusters';
import EngagementPageClient from '@/components/special-engagement/EngagementPageClient';

export default async function SpecialEngagementPage({
  params,
}: {
  params: Promise<{ cluster: ClusterSlug }>;
}) {
  const { cluster } = await params;
  const engagements = await getEngagementsAction(cluster);
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
