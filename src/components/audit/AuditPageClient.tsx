'use client';

import { useState, useTransition } from 'react';
import type { ClusterSlug } from '@/lib/clusters';
import { createAuditIndexAction, deleteAuditIndexAction } from '@/lib/auditActions';
import WorkingPaperModal from './WorkingPaperModal';
import styles from './audit.module.css';

type AuditItemData = {
  id: string;
  refNum: string;
  description: string;
  initials: string;
  sourceDocument: string;
  isNA: boolean;
  sortOrder: number;
};

type AuditSectionData = {
  id: string;
  name: string;
  title: string;
  sectionRef: string;
  sortOrder: number;
  isCustom: boolean;
  items: AuditItemData[];
};

export type AuditIndexData = {
  id: string;
  clientName: string;
  year: number;
  pfrsType: string;
  createdAt: Date;
  sections: AuditSectionData[];
};

export default function AuditPageClient({
  cluster,
  isAdmin,
  indices: initialIndices,
}: {
  cluster: ClusterSlug;
  isAdmin: boolean;
  indices: AuditIndexData[];
}) {
  const [indices, setIndices] = useState<AuditIndexData[]>(initialIndices);
  const [showPfrsModal, setShowPfrsModal] = useState(false);
  const [openIndex, setOpenIndex] = useState<AuditIndexData | null>(null);
  const [newForm, setNewForm] = useState({ clientName: '', year: new Date().getFullYear().toString() });
  const [newStep, setNewStep] = useState<'pfrs' | 'details'>('pfrs');
  const [pendingPfrs, setPendingPfrs] = useState<'Full' | 'NotFull' | null>(null);
  const [, startTransition] = useTransition();

  function openNew() {
    setNewForm({ clientName: '', year: new Date().getFullYear().toString() });
    setNewStep('pfrs');
    setPendingPfrs(null);
    setShowPfrsModal(true);
  }

  function selectPfrs(pfrs: 'Full' | 'NotFull') {
    setPendingPfrs(pfrs);
    setNewStep('details');
  }

  function createIndex() {
    if (!pendingPfrs) return;
    startTransition(async () => {
      const result = await createAuditIndexAction(
        cluster,
        pendingPfrs,
        newForm.clientName,
        Number(newForm.year),
      );
      setIndices((prev) => [result as unknown as AuditIndexData, ...prev]);
      setShowPfrsModal(false);
      setOpenIndex(result as unknown as AuditIndexData);
    });
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this Working Paper Index? This cannot be undone.')) return;
    startTransition(async () => {
      await deleteAuditIndexAction(id);
      setIndices((prev) => prev.filter((i) => i.id !== id));
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Audit Monitoring</h1>
          <p className={styles.pageSubtitle}>Manage audit engagements and working papers</p>
        </div>
        <button type="button" className={styles.newBtn} onClick={openNew}>
          + New Working Paper Index
        </button>
      </div>

      {/* Feature tabs */}
      <div className={styles.featureTabs}>
        <button type="button" className={`${styles.featureTab} ${styles.featureTabActive}`}>
          Working Paper Index
        </button>
      </div>

      {/* Index list */}
      <div className={styles.indexGrid}>
        {indices.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📋</div>
            <p className={styles.emptyTitle}>No working paper indices yet</p>
            <p className={styles.emptyDesc}>
              Click "New Working Paper Index" to create one.
            </p>
          </div>
        )}
        {indices.map((idx) => (
          <div key={idx.id} className={styles.indexCard} onClick={() => setOpenIndex(idx)}>
            <div className={styles.indexCardBadge}>{idx.pfrsType === 'Full' ? 'Full PFRS' : 'Not Full PFRS'}</div>
            <div className={styles.indexCardClient}>{idx.clientName || 'Unnamed Client'}</div>
            <div className={styles.indexCardYear}>{idx.year}</div>
            <div className={styles.indexCardMeta}>
              {idx.sections.length} sections · created {new Date(idx.createdAt).toLocaleDateString()}
            </div>
            {isAdmin && (
              <button
                type="button"
                className={styles.indexCardDelete}
                onClick={(e) => { e.stopPropagation(); handleDelete(idx.id); }}
                aria-label="Delete"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {/* PFRS type selector modal */}
      {showPfrsModal && (
        <div className={styles.overlay} onClick={() => setShowPfrsModal(false)}>
          <div
            className={styles.pfrsModal}
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className={styles.modalCloseBtn} onClick={() => setShowPfrsModal(false)}>×</button>

            {newStep === 'pfrs' && (
              <>
                <h2 className={styles.pfrsTitle}>New Working Paper Index</h2>
                <p className={styles.pfrsSubtitle}>Select the applicable financial reporting framework</p>
                <div className={styles.pfrsOptions}>
                  <button type="button" className={styles.pfrsOption} onClick={() => selectPfrs('Full')}>
                    <div className={styles.pfrsOptionIcon}>📑</div>
                    <div className={styles.pfrsOptionLabel}>Full PFRS</div>
                    <div className={styles.pfrsOptionDesc}>Philippine Financial Reporting Standards — full adoption</div>
                  </button>
                  <button type="button" className={styles.pfrsOption} onClick={() => selectPfrs('NotFull')}>
                    <div className={styles.pfrsOptionIcon}>📄</div>
                    <div className={styles.pfrsOptionLabel}>Not Full PFRS</div>
                    <div className={styles.pfrsOptionDesc}>PFRS for SMEs or simplified framework</div>
                  </button>
                </div>
              </>
            )}

            {newStep === 'details' && (
              <>
                <h2 className={styles.pfrsTitle}>Engagement Details</h2>
                <p className={styles.pfrsSubtitle}>{pendingPfrs === 'Full' ? 'Full PFRS' : 'Not Full PFRS'}</p>
                <div className={styles.detailsForm}>
                  <label className={styles.detailsLabel}>Client Name</label>
                  <input
                    type="text"
                    className={styles.detailsInput}
                    placeholder="e.g. ABC Corporation"
                    value={newForm.clientName}
                    onChange={(e) => setNewForm((f) => ({ ...f, clientName: e.target.value }))}
                    autoFocus
                  />
                  <label className={styles.detailsLabel}>Audit Year</label>
                  <input
                    type="number"
                    className={styles.detailsInput}
                    value={newForm.year}
                    onChange={(e) => setNewForm((f) => ({ ...f, year: e.target.value }))}
                    min={2000}
                    max={2099}
                  />
                </div>
                <div className={styles.detailsActions}>
                  <button type="button" className={styles.detailsBack} onClick={() => setNewStep('pfrs')}>
                    ← Back
                  </button>
                  <button
                    type="button"
                    className={styles.detailsCreate}
                    onClick={createIndex}
                    disabled={!newForm.clientName.trim()}
                  >
                    Create Index
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Full-screen Working Paper Modal */}
      {openIndex && (
        <WorkingPaperModal
          indexData={openIndex}
          onClose={() => setOpenIndex(null)}
          onUpdate={(updated) => {
            setIndices((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
            setOpenIndex(updated);
          }}
        />
      )}
    </div>
  );
}
