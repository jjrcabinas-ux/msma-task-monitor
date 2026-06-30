import { notFound } from 'next/navigation';
import MemberLoginForm from '@/components/MemberLoginForm';
import { isClusterSlug, clusterName } from '@/lib/clusters';

export default async function MemberLoginPage({ params }: { params: Promise<{ cluster: string }> }) {
  const { cluster } = await params;
  if (!isClusterSlug(cluster)) notFound();
  return <MemberLoginForm cluster={cluster} clusterLabel={clusterName(cluster)} />;
}
