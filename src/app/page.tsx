import Image from 'next/image';
import Link from 'next/link';
import { CLUSTER_SLUGS, clusterName } from '@/lib/clusters';
import { APP_NAME } from '@/lib/config';
import styles from './page.module.css';

export default function ClusterPickerPage() {
  return (
    <div className={styles.page}>
      <div className={styles.heading}>
        <Image src="/logo.jpg" alt="MSMA" width={903} height={495} className={styles.logo} priority />
        <h1 className={styles.h1}>{APP_NAME}</h1>
        <div className={styles.subtitle}>Select a cluster to continue</div>
      </div>
      <div className={styles.grid}>
        {CLUSTER_SLUGS.map((slug) => (
          <Link key={slug} href={`/${slug}`} className={styles.card}>
            <div className={styles.cardName}>{clusterName(slug)}</div>
            <div className={styles.cardArrow}>→</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
