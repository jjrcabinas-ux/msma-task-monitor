'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './audit.module.css';
import type { AuditIndexData } from './AuditPageClient';
import { PERM_FIELDS, PERM_SECTION_LIST, permMetaValue } from './permanentMeta';

/* ── Types ───────────────────────────────────────────────── */
type Section = AuditIndexData['sections'][number];

/* ── Helpers ──────────────────────────────────────────────── */
function numericItems(section: Section) {
  return section.items.filter((it) => /^\d+$/.test(it.refNum));
}

/* ── Tab Select Modal — pick which tabs go into the export ── */
export function TabSelectModal({
  sections,
  onConfirm,
  onClose,
}: {
  sections: Section[];
  onConfirm: (ids: string[]) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(sections.map((s) => s.id));
  const allSelected = selected.length === sections.length;

  function toggle(id: string) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  return createPortal(
    <div className={styles.namingOverlay} onClick={onClose}>
      <div className={styles.namingModal} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.modalCloseBtn} onClick={onClose}>×</button>

        <h2 className={styles.namingTitle}>Select Tabs to Include</h2>
        <p className={styles.namingSubtitle}>Choose which tabs will be included in the exported file.</p>

        <label className={`${styles.tabSelectRow} ${styles.tabSelectAllRow}`}>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() => setSelected(allSelected ? [] : sections.map((s) => s.id))}
          />
          <span>Select all</span>
        </label>

        <div className={styles.tabSelectList}>
          {sections.map((sec) => (
            <label key={sec.id} className={styles.tabSelectRow}>
              <input type="checkbox" checked={selected.includes(sec.id)} onChange={() => toggle(sec.id)} />
              <span>
                {sec.name}
                {sec.title && sec.title !== sec.name ? ` — ${sec.title}` : ''}
              </span>
            </label>
          ))}
        </div>

        <div className={styles.namingActions}>
          <button type="button" className={styles.namingCancel} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.namingProceed}
            disabled={selected.length === 0}
            onClick={() => onConfirm(selected)}
          >
            Continue
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ── Naming Convention Modal ──────────────────────────────── */
export function NamingConventionModal({
  exportType,
  prefill,
  onConfirm,
  onClose,
}: {
  exportType: 'excel' | 'pdf';
  prefill?: string;
  onConfirm: (filename: string) => void;
  onClose: () => void;
}) {
  const [filename, setFilename] = useState(prefill ?? '');

  return createPortal(
    <div className={styles.namingOverlay} onClick={onClose}>
      <div className={styles.namingModal} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.modalCloseBtn} onClick={onClose}>×</button>

        <div className={styles.namingIcon}>{exportType === 'excel' ? '📊' : '📄'}</div>
        <h2 className={styles.namingTitle}>
          Before Downloading — Naming Convention
        </h2>
        <p className={styles.namingSubtitle}>
          Please follow the standard file naming convention below before saving your{' '}
          {exportType === 'excel' ? 'Excel' : 'PDF'} file:
        </p>

        <div className={styles.namingConventionBox}>
          <div className={styles.namingConventionText}>
            File Index _ Company Name _ Period _ version _ owner
          </div>
        </div>

        <div className={styles.namingExample}>
          <strong>Example:</strong>&nbsp; File Index_ABC Corp_12312025_v1_JD
        </div>

        <label className={styles.namingLabel}>Enter your file name</label>
        <input
          className={styles.namingInput}
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
          placeholder="File Index_Company_Period_WPI_v1_Owner"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && filename.trim()) onConfirm(filename.trim());
          }}
        />

        <div className={styles.namingActions}>
          <button type="button" className={styles.namingCancel} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.namingProceed}
            disabled={!filename.trim()}
            onClick={() => onConfirm(filename.trim())}
          >
            {exportType === 'excel' ? 'Download Excel ↓' : 'Download PDF ↓'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ── PDF Page Preview ─────────────────────────────────────── */
function PdfPageView({
  section,
  metaCtx,
}: {
  section: Section;
  metaCtx: { clientName: string; cluster: string; year: number };
}) {
  const rows = numericItems(section);

  return (
    <div className={styles.pdfPage}>
      {section.name === 'Permanent' ? (
        <>
          <div className={styles.pdfPageTitle}>PERMANENT / SYSTEMS FILE INDEX</div>
          <div className={styles.pdfMetaFields}>
            {PERM_FIELDS.map((f) => (
              <div key={f.key} className={styles.pdfMetaRow}>
                <span className={styles.pdfMetaLabel}>{f.label}</span>
                <span className={styles.pdfMetaValue}>{permMetaValue(section, f.key, metaCtx)}</span>
              </div>
            ))}
          </div>
          <div className={styles.pdfSectionHeader}>Section A — Permanent</div>
          <table className={styles.pdfTable}>
            <thead>
              <tr>
                <th className={styles.pdfThRef}>Ref No.</th>
                <th className={styles.pdfThDesc}>Description</th>
              </tr>
            </thead>
            <tbody>
              {PERM_SECTION_LIST.map((it) => (
                <tr key={it.ref}>
                  <td className={styles.pdfTdRef}>{it.ref}</td>
                  <td>{it.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <>
          <div className={styles.pdfPageTitle}>{section.title || section.name}</div>
          {rows.length > 0 ? (
            <PdfTable rows={rows} />
          ) : (
            <p className={styles.pdfEmpty}>No items recorded.</p>
          )}
        </>
      )}
      <div className={styles.pdfPageFooter}>{section.name}</div>
    </div>
  );
}

function PdfTable({
  rows,
}: {
  rows: { refNum: string; description: string; initials: string; sourceDocument: string; isNA: boolean }[];
}) {
  return (
    <table className={styles.pdfTable}>
      <thead>
        <tr>
          <th className={styles.pdfThRef}>Ref No.</th>
          <th className={styles.pdfThDesc}>Description</th>
          <th className={styles.pdfThInit}>Initials</th>
          <th className={styles.pdfThSrc}>Source Document</th>
          <th className={styles.pdfThNa}>N/A</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((it) => (
          <tr key={it.refNum} className={it.isNA ? styles.pdfRowNa : ''}>
            <td className={styles.pdfTdRef}>{it.refNum}</td>
            <td>{it.description}</td>
            <td className={styles.pdfTdInit}>{it.initials}</td>
            <td className={styles.pdfTdSrc}>{it.sourceDocument}</td>
            <td className={styles.pdfTdNa}>{it.isNA ? 'N/A' : ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ── PDF Preview Modal ────────────────────────────────────── */
export function PdfPreviewModal({
  data,
  onClose,
  onDownload,
  renderSection,
}: {
  data: AuditIndexData;
  onClose: () => void;
  onDownload: () => void;
  /** When provided, pages render the live tab content instead of the built-in layout */
  renderSection?: (section: Section) => React.ReactNode;
}) {
  return createPortal(
    <div className={styles.pdfPreviewOverlay}>
      <div className={styles.pdfPreviewModal}>
        {/* Header */}
        <div className={styles.pdfPreviewHeader}>
          <div className={styles.pdfPreviewHeaderLeft}>
            <span className={styles.pdfPreviewTitle}>PDF Preview</span>
            <span className={styles.pdfPreviewSub}>
              {data.clientName} · {data.year} · {data.sections.length} page
              {data.sections.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className={styles.pdfPreviewHeaderRight}>
            <button type="button" className={styles.pdfDownloadBtn} onClick={onDownload}>
              ↓ Download PDF
            </button>
            <button type="button" className={styles.wpiCloseBtn} onClick={onClose}>
              ×
            </button>
          </div>
        </div>

        {/* Pages */}
        <div className={styles.pdfPreviewContent}>
          {data.sections.map((sec, i) => (
            <div key={sec.id} className={styles.pdfPageWrapper}>
              <div className={styles.pdfPageLabel}>
                Page {i + 1} — {sec.name}
              </div>
              {renderSection ? (
                renderSection(sec)
              ) : (
                <PdfPageView
                  section={sec}
                  metaCtx={{ clientName: data.clientName, cluster: data.cluster, year: data.year }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
