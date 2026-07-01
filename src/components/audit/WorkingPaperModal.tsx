'use client';

import Image from 'next/image';
import { useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import {
  updateAuditItemAction,
  addAuditItemAction,
  deleteAuditItemAction,
  addAuditSectionAction,
} from '@/lib/auditActions';
import type { AuditIndexData } from './AuditPageClient';
import { NamingConventionModal, PdfPreviewModal } from './ExportModals';
import styles from './audit.module.css';

type Item = AuditIndexData['sections'][number]['items'][number];
type Section = AuditIndexData['sections'][number];

const PERM_FIELDS: { key: string; label: string }[] = [
  { key: 'CLIENT_REF', label: 'CLIENT / REFERENCE:' },
  { key: 'ACCT_DATE', label: 'ACCOUNTING REFERENCE DATE:' },
  { key: 'PARTNER', label: 'PARTNER:' },
  { key: 'SR_ASSOCIATE', label: 'SENIOR ASSOCIATE IN-CHARGE:' },
  { key: 'JR_ASSOCIATE', label: 'JUNIOR ASSOCIATE IN-CHARGE:' },
];

export default function WorkingPaperModal({
  indexData,
  employees,
  onClose,
  onUpdate,
}: {
  indexData: AuditIndexData;
  employees: string[];
  onClose: () => void;
  onUpdate: (updated: AuditIndexData) => void;
}) {
  const [data, setData] = useState<AuditIndexData>(indexData);
  const [activeTab, setActiveTab] = useState(0);
  const [showAddSection, setShowAddSection] = useState(false);
  const [showNaming, setShowNaming] = useState<null | 'excel' | 'pdf'>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [, startTransition] = useTransition();

  const currentSection = data.sections[activeTab];

  function mutate(updater: (d: AuditIndexData) => AuditIndexData) {
    setData((d) => {
      const next = updater(d);
      onUpdate(next);
      return next;
    });
  }

  function updateItem(sectionId: string, itemId: string, field: keyof Item, value: string | boolean) {
    mutate((d) => ({
      ...d,
      sections: d.sections.map((sec) =>
        sec.id !== sectionId
          ? sec
          : { ...sec, items: sec.items.map((it) => (it.id !== itemId ? it : { ...it, [field]: value })) },
      ),
    }));
    startTransition(async () => {
      await updateAuditItemAction(itemId, { [field]: value });
    });
  }

  function addItemToSection(sectionId: string) {
    const sec = data.sections.find((s) => s.id === sectionId);
    if (!sec) return;
    const numericItems = sec.items.filter((it) => /^\d+$/.test(it.refNum));
    const nextRef = String(numericItems.length + 1);
    startTransition(async () => {
      const newItem = await addAuditItemAction(sectionId, {
        refNum: nextRef,
        description: '',
        initials: '',
        sourceDocument: '',
        isNA: false,
      });
      mutate((d) => ({
        ...d,
        sections: d.sections.map((s) =>
          s.id !== sectionId ? s : { ...s, items: [...s.items, newItem as unknown as Item] },
        ),
      }));
    });
  }

  function removeItem(sectionId: string, itemId: string) {
    if (!confirm('Remove this row?')) return;
    mutate((d) => ({
      ...d,
      sections: d.sections.map((s) =>
        s.id !== sectionId ? s : { ...s, items: s.items.filter((it) => it.id !== itemId) },
      ),
    }));
    startTransition(async () => {
      await deleteAuditItemAction(itemId);
    });
  }

  /* ── Export helpers ───────────────────────────────────── */

  function buildFilenamePrefill() {
    const MONTHS: Record<string, string> = {
      january: '01', february: '02', march: '03', april: '04',
      may: '05', june: '06', july: '07', august: '08',
      september: '09', october: '10', november: '11', december: '12',
    };
    const permSec = data.sections.find((s) => s.name === 'Permanent');
    const acctDate = permSec?.items.find((it) => it.refNum === 'ACCT_DATE')?.description ?? '';
    let period = '';
    const m = acctDate.match(/(\w+)\s+(\d+),\s*(\d{4})/);
    if (m) {
      const mon = MONTHS[m[1].toLowerCase()] ?? '';
      const day = m[2].padStart(2, '0');
      period = `${mon}${day}${m[3]}`;
    }
    const company = (data.clientName || '').trim();
    return `File Index_${company}_${period}_WPI_v1_`;
  }

  function sectionNumericItems(sec: (typeof data.sections)[number]) {
    return sec.items.filter((it) => /^\d+$/.test(it.refNum));
  }

  function sectionItemDesc(sec: (typeof data.sections)[number], key: string) {
    return sec.items.find((it) => it.refNum === key)?.description || '';
  }

  async function doExcelExport(filename: string) {
    setIsExporting(true);
    try {
      const XLSX = (await import('xlsx')).default;
      const wb = XLSX.utils.book_new();

      for (const sec of data.sections) {
        const rows: (string | number | boolean)[][] = [];

        if (sec.name === 'Permanent') {
          rows.push(['PERMANENT / SYSTEMS FILE INDEX']);
          rows.push([]);
          rows.push(['CLIENT / REFERENCE:', sectionItemDesc(sec, 'CLIENT_REF')]);
          rows.push(['ACCOUNTING REFERENCE DATE:', sectionItemDesc(sec, 'ACCT_DATE')]);
          rows.push(['PARTNER:', sectionItemDesc(sec, 'PARTNER')]);
          rows.push(['SENIOR ASSOCIATE IN-CHARGE:', sectionItemDesc(sec, 'SR_ASSOCIATE')]);
          rows.push(['JUNIOR ASSOCIATE IN-CHARGE:', sectionItemDesc(sec, 'JR_ASSOCIATE')]);
          rows.push([]);
          rows.push(['Section A — Permanent']);
          rows.push([]);
          rows.push(['Ref No.', 'Description', 'Initials', 'Source Document', 'N/A']);
          for (const it of sectionNumericItems(sec)) {
            rows.push([it.refNum, it.description, it.initials, it.sourceDocument, it.isNA ? 'N/A' : '']);
          }
        } else {
          rows.push([sec.title || sec.name]);
          rows.push([]);
          rows.push(['Ref No.', 'Description', 'Initials', 'Source Document', 'N/A']);
          for (const it of sectionNumericItems(sec)) {
            rows.push([it.refNum, it.description, it.initials, it.sourceDocument, it.isNA ? 'N/A' : '']);
          }
        }

        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [{ wch: 30 }, { wch: 48 }, { wch: 14 }, { wch: 28 }, { wch: 5 }];
        ws['!pageSetup'] = { paperSize: 9, orientation: 'portrait' } as object;

        const sheetName = sec.name.replace(/[:\\\/\?\*\[\]]/g, '').substring(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }

      XLSX.writeFile(wb, `${filename}.xlsx`);
    } finally {
      setIsExporting(false);
      setShowNaming(null);
    }
  }

  async function doPdfExport(filename: string) {
    setIsExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      let firstPage = true;

      for (const sec of data.sections) {
        if (!firstPage) doc.addPage();
        firstPage = false;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);

        if (sec.name === 'Permanent') {
          doc.text('PERMANENT / SYSTEMS FILE INDEX', 105, 18, { align: 'center' });
          let y = 30;
          const metaFields = [
            ['CLIENT / REFERENCE:', sectionItemDesc(sec, 'CLIENT_REF')],
            ['ACCOUNTING REFERENCE DATE:', sectionItemDesc(sec, 'ACCT_DATE')],
            ['PARTNER:', sectionItemDesc(sec, 'PARTNER')],
            ['SENIOR ASSOCIATE IN-CHARGE:', sectionItemDesc(sec, 'SR_ASSOCIATE')],
            ['JUNIOR ASSOCIATE IN-CHARGE:', sectionItemDesc(sec, 'JR_ASSOCIATE')],
          ];
          doc.setFontSize(9);
          for (const [label, value] of metaFields) {
            doc.setFont('helvetica', 'bold');
            doc.text(label, 14, y);
            doc.setFont('helvetica', 'normal');
            doc.text(value, 80, y);
            doc.setDrawColor(180);
            doc.line(80, y + 1.2, 196, y + 1.2);
            y += 9;
          }
          y += 4;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.text('Section A — Permanent', 14, y);
          y += 4;
          const items = sectionNumericItems(sec);
          if (items.length > 0) {
            autoTable(doc, {
              startY: y,
              head: [['Ref No.', 'Description', 'Initials', 'Source Document', 'N/A']],
              body: items.map((it) => [it.refNum, it.description, it.initials, it.sourceDocument, it.isNA ? 'N/A' : '']),
              styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2 },
              headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
              columnStyles: { 0: { cellWidth: 14 }, 2: { cellWidth: 18 }, 3: { cellWidth: 32 }, 4: { cellWidth: 10 } },
            });
          }
        } else {
          doc.text(sec.title || sec.name, 105, 18, { align: 'center' });
          const items = sectionNumericItems(sec);
          if (items.length > 0) {
            autoTable(doc, {
              startY: 28,
              head: [['Ref No.', 'Description', 'Initials', 'Source Document', 'N/A']],
              body: items.map((it) => [it.refNum, it.description, it.initials, it.sourceDocument, it.isNA ? 'N/A' : '']),
              styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2 },
              headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
              columnStyles: { 0: { cellWidth: 14 }, 2: { cellWidth: 18 }, 3: { cellWidth: 32 }, 4: { cellWidth: 10 } },
            });
          } else {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(150);
            doc.text('No items recorded.', 14, 32);
            doc.setTextColor(0);
          }
        }

        // Page footer
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text(sec.name, 14, 285);
        doc.text(`${data.clientName} · ${data.year}`, 105, 285, { align: 'center' });
        doc.setTextColor(0);
      }

      doc.save(`${filename}.pdf`);
    } finally {
      setIsExporting(false);
      setShowNaming(null);
      setShowPdfPreview(false);
    }
  }

  function handleAddSection(sectionData: {
    name: string;
    title: string;
    sectionRef: string;
    items: { refNum: string; description: string; initials: string; sourceDocument: string; isNA: boolean }[];
  }) {
    startTransition(async () => {
      const newSec = await addAuditSectionAction(data.id, sectionData);
      mutate((d) => ({
        ...d,
        sections: [...d.sections, newSec as unknown as Section],
      }));
      setActiveTab(data.sections.length);
      setShowAddSection(false);
    });
  }

  const portal = (
    <div className={styles.wpiOverlay}>
      <div className={styles.wpiModal}>
        <div className={styles.wpiHeader}>
          <div className={styles.wpiHeaderLeft}>
            <div className={styles.wpiHeaderTitle}>Working Paper Index</div>
            <div className={styles.wpiHeaderSub}>
              {data.clientName || 'Unnamed Client'} · {data.year} ·{' '}
              {data.pfrsType === 'Full' ? 'Full PFRS' : 'Not Full PFRS'}
            </div>
          </div>
          <div className={styles.wpiHeaderRight}>
            <button
              type="button"
              className={styles.exportBtn}
              onClick={() => setShowNaming('excel')}
              disabled={isExporting}
              title="Export all tabs to Excel"
            >
              📊 Excel
            </button>
            <button
              type="button"
              className={styles.exportBtn}
              onClick={() => setShowPdfPreview(true)}
              disabled={isExporting}
              title="Preview and download PDF"
            >
              📄 PDF
            </button>
            <button type="button" className={styles.wpiCloseBtn} onClick={onClose}>×</button>
          </div>
        </div>

        <div className={styles.wpiTabs}>
          {data.sections.map((sec, i) => (
            <button
              key={sec.id}
              type="button"
              className={`${styles.wpiTab} ${activeTab === i ? styles.wpiTabActive : ''}`}
              onClick={() => setActiveTab(i)}
            >
              {sec.name}
            </button>
          ))}
          <button type="button" className={styles.wpiTabAdd} onClick={() => setShowAddSection(true)}>
            + Add More
          </button>
        </div>

        {currentSection && (
          <div className={styles.wpiContent}>
            {currentSection.name === 'Permanent' ? (
              <PermanentFileTab
                section={currentSection}
                clientName={data.clientName}
                cluster={data.cluster}
                year={data.year}
                employees={employees}
                onUpdateItem={(itemId, field, value) => updateItem(currentSection.id, itemId, field, value)}
              />
            ) : (
              <AnnualFileIndexTable
                section={currentSection}
                onUpdateItem={(itemId, field, value) => updateItem(currentSection.id, itemId, field, value)}
                onAddItem={() => addItemToSection(currentSection.id)}
                onRemoveItem={(itemId) => removeItem(currentSection.id, itemId)}
              />
            )}
          </div>
        )}
      </div>

      {showAddSection && (
        <AddSectionModal
          onClose={() => setShowAddSection(false)}
          onAdd={handleAddSection}
        />
      )}
    </div>
  );

  return (
    <>
      {createPortal(portal, document.body)}

      {/* Naming convention modal — Excel */}
      {showNaming === 'excel' && (
        <NamingConventionModal
          exportType="excel"
          prefill={buildFilenamePrefill()}
          onClose={() => setShowNaming(null)}
          onConfirm={(filename) => doExcelExport(filename)}
        />
      )}

      {/* Naming convention modal — PDF (triggered from preview) */}
      {showNaming === 'pdf' && (
        <NamingConventionModal
          exportType="pdf"
          prefill={buildFilenamePrefill()}
          onClose={() => setShowNaming(null)}
          onConfirm={(filename) => doPdfExport(filename)}
        />
      )}

      {/* PDF Preview modal */}
      {showPdfPreview && !showNaming && (
        <PdfPreviewModal
          data={data}
          onClose={() => setShowPdfPreview(false)}
          onDownload={() => setShowNaming('pdf')}
        />
      )}
    </>
  );
}

/* ── Permanent / Systems File Index Tab ─────────────────── */

/* ── Member Autocomplete Input ───────────────────────────── */

function MemberAutocomplete({
  value,
  employees,
  onChange,
}: {
  value: string;
  employees: string[];
  onChange: (val: string) => void;
}) {
  const [inputVal, setInputVal] = useState(value);
  const [open, setOpen] = useState(false);

  const suggestions = inputVal
    ? employees.filter((e) => e.toLowerCase().includes(inputVal.toLowerCase()) && e !== inputVal)
    : employees;

  return (
    <div className={styles.acWrap}>
      <input
        className={styles.permFieldInput}
        value={inputVal}
        onChange={(e) => {
          setInputVal(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Type to search member..."
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div className={styles.acDropdown}>
          {suggestions.map((name) => (
            <div
              key={name}
              className={styles.acOption}
              onMouseDown={() => { setInputVal(name); onChange(name); setOpen(false); }}
            >
              {name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const CLUSTER_PARTNERS: Record<string, string> = {
  ads: 'Atty. Antonio Sanchez Jr., CPA',
  rpm: 'Atty. Rhenier Mora, CPA',
  vcm: 'Victorio Meñoza, CPA',
};

function PermanentFileTab({
  section,
  clientName,
  cluster,
  year,
  employees,
  onUpdateItem,
}: {
  section: Section;
  clientName: string;
  cluster: string;
  year: number;
  employees: string[];
  onUpdateItem: (itemId: string, field: keyof Item, value: string | boolean) => void;
}) {
  function getItem(key: string) {
    return section.items.find((it) => it.refNum === key);
  }

  const lastUpdatedItem = getItem('LAST_UPDATED');

  return (
    <div className={styles.permPaper}>
      <div className={styles.permInner}>
        {/* Left content column */}
        <div className={styles.permLeft}>
          <div className={styles.permTitle}>PERMANENT / SYSTEMS FILE INDEX</div>

          <div className={styles.permFields}>
            {PERM_FIELDS.map((field) => {
              const item = getItem(field.key);
              const fallback =
                field.key === 'CLIENT_REF' ? clientName :
                field.key === 'PARTNER' ? (CLUSTER_PARTNERS[cluster] ?? '') :
                field.key === 'ACCT_DATE' ? `December 31, ${year}` : '';
              const displayValue = item?.description || fallback;
              const isAssociate = field.key === 'SR_ASSOCIATE' || field.key === 'JR_ASSOCIATE';
              return (
                <div key={field.key} className={styles.permField}>
                  <div className={styles.permFieldLabel}>{field.label}</div>
                  {isAssociate ? (
                    <MemberAutocomplete
                      value={displayValue}
                      employees={employees}
                      onChange={(val) => item && onUpdateItem(item.id, 'description', val)}
                    />
                  ) : (
                    <input
                      className={styles.permFieldInput}
                      value={displayValue}
                      onChange={(e) => item && onUpdateItem(item.id, 'description', e.target.value)}
                      placeholder={fallback}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className={styles.permSectionHeader}>Section A - Permanent</div>
          <div className={styles.permSectionList}>
            <div className={styles.permSectionItem}>
              <span className={styles.permSectionRef}>A1</span>
              <span className={styles.permSectionDesc}>General matters</span>
            </div>
            <div className={styles.permSectionItem}>
              <span className={styles.permSectionRef}>A2</span>
              <span className={styles.permSectionDesc}>Documents and correspondence of a permanent nature</span>
            </div>
            <div className={styles.permSectionItem}>
              <span className={styles.permSectionRef}>A3</span>
              <span className={styles.permSectionDesc}>Statutory matters</span>
            </div>
          </div>

          <div className={styles.permFooter}>
            <div className={styles.permLogoBlock}>
              <Image src="/logo.png" alt="MSMA" width={120} height={66} className={styles.permLogo} />
              <div className={styles.permCompanyName}>
                MORA, SANCHEZ, MEÑOZA<br />AND ASSOCIATES
              </div>
            </div>
            <div className={styles.permUpdated}>
              <strong>Updated{' '}
                {lastUpdatedItem ? (
                  <input
                    className={styles.permUpdatedInput}
                    value={lastUpdatedItem.description}
                    onChange={(e) => onUpdateItem(lastUpdatedItem.id, 'description', e.target.value)}
                    placeholder="June 2026"
                  />
                ) : (
                  'June 2026'
                )}
              </strong>
            </div>
          </div>
        </div>

        {/* Right divider column */}
        <div className={styles.permRight} />
      </div>
    </div>
  );
}

/* ── Annual File Index Table ─────────────────────────────── */

function AnnualFileIndexTable({
  section,
  onUpdateItem,
  onAddItem,
  onRemoveItem,
}: {
  section: Section;
  onUpdateItem: (itemId: string, field: keyof Item, value: string | boolean) => void;
  onAddItem: () => void;
  onRemoveItem: (itemId: string) => void;
}) {
  const visibleItems = section.items.filter((it) => /^\d+$/.test(it.refNum));

  return (
    <div className={styles.a4Paper}>
      <div className={styles.a4Header}>
        <div className={styles.a4HeaderLeft}>
          <span className={styles.a4HeaderTitle}>ANNUAL FILE INDEX</span>
        </div>
        <div className={styles.a4HeaderRight}>
          <div className={styles.a4HeaderRef}>{section.sectionRef}</div>
          <div className={styles.a4HeaderNA}>
            <span className={styles.a4NALabel}>NA</span>
            <span className={styles.a4NADesc}>Not Applicable</span>
          </div>
        </div>
      </div>

      <table className={styles.a4Table}>
        <thead>
          <tr>
            <th className={`${styles.a4Th} ${styles.a4ThRef}`} colSpan={2}>
              REF: <span className={styles.a4ThSectionTitle}>{section.title}</span>
            </th>
            <th className={styles.a4Th}>Initials</th>
            <th className={styles.a4Th}>Source Document</th>
            <th className={styles.a4Th} style={{ width: 52 }} />
          </tr>
        </thead>
        <tbody>
          {visibleItems.map((item) => (
            <AuditItemRow
              key={item.id}
              item={item}
              onUpdate={onUpdateItem}
              onRemove={onRemoveItem}
            />
          ))}
          {visibleItems.length === 0 && (
            <tr>
              <td colSpan={5} className={styles.a4Empty}>
                No items yet. Click &ldquo;+ Add Row&rdquo; to begin.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <button type="button" className={styles.a4AddRowBtn} onClick={onAddItem}>
        + Add Row
      </button>

      <div className={styles.a4Notes}>
        <strong>Notes:</strong>
        <div className={styles.a4NotesSub}>Please see Supporting Documentation (RR Folder)</div>
      </div>
    </div>
  );
}

/* ── Single editable row ─────────────────────────────── */

function AuditItemRow({
  item,
  onUpdate,
  onRemove,
}: {
  item: Item;
  onUpdate: (itemId: string, field: keyof Item, value: string | boolean) => void;
  onRemove: (itemId: string) => void;
}) {
  return (
    <tr className={`${styles.a4Tr} ${item.isNA ? styles.a4TrNA : ''}`}>
      <td className={`${styles.a4Td} ${styles.a4TdNum}`}>{item.refNum}</td>
      <td className={styles.a4Td}>
        <input
          className={styles.a4CellInput}
          value={item.description}
          onChange={(e) => onUpdate(item.id, 'description', e.target.value)}
          placeholder="Description"
        />
      </td>
      <td className={`${styles.a4Td} ${styles.a4TdInitials}`}>
        {item.isNA ? (
          <span className={styles.a4NATag}>NA</span>
        ) : (
          <input
            className={`${styles.a4CellInput} ${styles.a4InitialsInput}`}
            value={item.initials}
            onChange={(e) => onUpdate(item.id, 'initials', e.target.value)}
            placeholder="—"
          />
        )}
      </td>
      <td className={styles.a4Td}>
        {!item.isNA && (
          <input
            className={styles.a4CellInput}
            value={item.sourceDocument}
            onChange={(e) => onUpdate(item.id, 'sourceDocument', e.target.value)}
            placeholder="Source Document"
          />
        )}
      </td>
      <td className={styles.a4Td}>
        <div className={styles.a4RowActions}>
          <button
            type="button"
            className={`${styles.a4RowBtn} ${item.isNA ? styles.a4RowBtnActive : ''}`}
            title={item.isNA ? 'Mark applicable' : 'Mark N/A'}
            onClick={() => onUpdate(item.id, 'isNA', !item.isNA)}
          >
            NA
          </button>
          <button
            type="button"
            className={styles.a4RowBtnDelete}
            onClick={() => onRemove(item.id)}
            title="Delete row"
          >
            ×
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ── Add Section Modal ────────────────────────────────────── */

function AddSectionModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (data: {
    name: string;
    title: string;
    sectionRef: string;
    items: { refNum: string; description: string; initials: string; sourceDocument: string; isNA: boolean }[];
  }) => void;
}) {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [sectionRef, setSectionRef] = useState('');
  const [items, setItems] = useState([
    { refNum: '1', description: '', initials: '', sourceDocument: '', isNA: false },
  ]);

  function addRow() {
    setItems((prev) => [
      ...prev,
      { refNum: String(prev.length + 1), description: '', initials: '', sourceDocument: '', isNA: false },
    ]);
  }

  function updateRow(idx: number, field: string, value: string | boolean) {
    setItems((prev) => prev.map((it, i) => (i !== idx ? it : { ...it, [field]: value })));
  }

  function removeRow(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx).map((it, i) => ({ ...it, refNum: String(i + 1) })));
  }

  function submit() {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), title: title.trim(), sectionRef: sectionRef.trim(), items });
  }

  return (
    <div className={styles.addSecOverlay} onClick={onClose}>
      <div className={styles.addSecModal} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.addSecClose} onClick={onClose}>×</button>

        <div className={styles.addSecA4Header}>
          <div className={styles.addSecA4Title}>ANNUAL FILE INDEX</div>
          <div className={styles.addSecA4Meta}>
            <div className={styles.addSecA4NA}>
              <span className={styles.a4NALabel}>NA</span>
              <span className={styles.a4NADesc}>Not Applicable</span>
            </div>
          </div>
        </div>

        <div className={styles.addSecFields}>
          <div className={styles.addSecFieldRow}>
            <label className={styles.addSecFieldLabel}>Tab Name</label>
            <input
              className={styles.addSecInput}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. A4, B1, INV"
              autoFocus
            />
          </div>
          <div className={styles.addSecFieldRow}>
            <label className={styles.addSecFieldLabel}>Section Title</label>
            <input
              className={styles.addSecInput}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Investments in Securities"
            />
          </div>
          <div className={styles.addSecFieldRow}>
            <label className={styles.addSecFieldLabel}>Reference Letter</label>
            <input
              className={styles.addSecInput}
              value={sectionRef}
              onChange={(e) => setSectionRef(e.target.value)}
              placeholder="e.g. A4"
              style={{ maxWidth: 100 }}
            />
          </div>
        </div>

        <table className={styles.a4Table} style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th className={`${styles.a4Th} ${styles.a4ThRef}`} colSpan={2}>
                REF: <span className={styles.a4ThSectionTitle}>{title || '—'}</span>
              </th>
              <th className={styles.a4Th}>Initials</th>
              <th className={styles.a4Th}>Source Document</th>
              <th className={styles.a4Th} style={{ width: 52 }} />
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className={`${styles.a4Tr} ${item.isNA ? styles.a4TrNA : ''}`}>
                <td className={`${styles.a4Td} ${styles.a4TdNum}`}>{item.refNum}</td>
                <td className={styles.a4Td}>
                  <input
                    className={styles.a4CellInput}
                    value={item.description}
                    onChange={(e) => updateRow(idx, 'description', e.target.value)}
                    placeholder="Description"
                  />
                </td>
                <td className={`${styles.a4Td} ${styles.a4TdInitials}`}>
                  {item.isNA ? (
                    <span className={styles.a4NATag}>NA</span>
                  ) : (
                    <input
                      className={`${styles.a4CellInput} ${styles.a4InitialsInput}`}
                      value={item.initials}
                      onChange={(e) => updateRow(idx, 'initials', e.target.value)}
                      placeholder="—"
                    />
                  )}
                </td>
                <td className={styles.a4Td}>
                  {!item.isNA && (
                    <input
                      className={styles.a4CellInput}
                      value={item.sourceDocument}
                      onChange={(e) => updateRow(idx, 'sourceDocument', e.target.value)}
                      placeholder="Source Document"
                    />
                  )}
                </td>
                <td className={styles.a4Td}>
                  <div className={styles.a4RowActions}>
                    <button
                      type="button"
                      className={`${styles.a4RowBtn} ${item.isNA ? styles.a4RowBtnActive : ''}`}
                      onClick={() => updateRow(idx, 'isNA', !item.isNA)}
                    >
                      NA
                    </button>
                    <button
                      type="button"
                      className={styles.a4RowBtnDelete}
                      onClick={() => removeRow(idx)}
                    >
                      ×
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button type="button" className={styles.a4AddRowBtn} onClick={addRow}>
          + Add Row
        </button>

        <div className={styles.addSecFooter}>
          <button type="button" className={styles.addSecCancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={styles.addSecSubmitBtn} onClick={submit} disabled={!name.trim()}>
            Add Tab
          </button>
        </div>
      </div>
    </div>
  );
}
