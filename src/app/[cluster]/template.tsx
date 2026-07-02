/* Re-mounts on every route change within the cluster, fading the new page in. */
export default function ClusterTemplate({ children }: { children: React.ReactNode }) {
  return <div className="pageFadeIn">{children}</div>;
}
