export type ClusterSlug = 'ads' | 'rpm' | 'vcm';

type ClusterConfig = {
  slug: ClusterSlug;
  name: string;
  passwordEnv: string;
};

export const CLUSTERS: Record<ClusterSlug, ClusterConfig> = {
  ads: { slug: 'ads', name: 'MSMA ADS Cluster', passwordEnv: 'CLUSTER_ADS_PASSWORD' },
  rpm: { slug: 'rpm', name: 'MSMA RPM Cluster', passwordEnv: 'CLUSTER_RPM_PASSWORD' },
  vcm: { slug: 'vcm', name: 'MSMA VCM Cluster', passwordEnv: 'CLUSTER_VCM_PASSWORD' },
};

export const CLUSTER_SLUGS = Object.keys(CLUSTERS) as ClusterSlug[];

export function isClusterSlug(value: string): value is ClusterSlug {
  return value in CLUSTERS;
}

export function clusterName(slug: ClusterSlug): string {
  return CLUSTERS[slug].name;
}

export function clusterUnlockCookieName(cluster: ClusterSlug): string {
  return `cluster_unlock_${cluster}`;
}
