import { isAdminUnlocked } from '@/lib/memberAuth';
import { getAuditIndicesAction } from '@/lib/auditActions';
import type { ClusterSlug } from '@/lib/clusters';
import AuditPageClient from '@/components/audit/AuditPageClient';

export default async function AuditMonitoringPage({ params }: { params: Promise<{ cluster: ClusterSlug }> }) {
  const { cluster } = await params;
  const isAdmin = await isAdminUnlocked(cluster);
  const indices = await getAuditIndicesAction(cluster);

  return <AuditPageClient cluster={cluster} isAdmin={isAdmin} indices={indices} />;
}
