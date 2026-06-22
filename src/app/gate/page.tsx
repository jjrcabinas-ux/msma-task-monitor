import { notFound } from 'next/navigation';
import ClusterGate from '@/components/ClusterGate';
import { isClusterSlug, clusterName } from '@/lib/clusters';

export default async function GatePage({
  searchParams,
}: {
  searchParams: Promise<{ cluster?: string }>;
}) {
  const { cluster } = await searchParams;
  if (!cluster || !isClusterSlug(cluster)) notFound();
  return <ClusterGate cluster={cluster} clusterLabel={clusterName(cluster)} />;
}
