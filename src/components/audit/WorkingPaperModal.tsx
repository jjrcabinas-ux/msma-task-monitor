'use client';

import { useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import {
  updateAuditItemAction,
  addAuditItemAction,
  deleteAuditItemAction,
  addAuditSectionAction,
} from '@/lib/auditActions';
import type { AuditIndexData } from './AuditPageClient';
import styles from './audit.module.css';

type Item = AuditIndexData['sections'][number]['items'][number];
type Section = AuditIndexData['sections'][number];

export default function WorkingPaperModal({
  indexData,
  isAdmin,
  onClose,
  onUpdate,
}: {
  indexData: AuditIndexData;
  isAdmin: boolean;
  onClose: () => void;
  onUpdate: (updated: AuditIndexData) => void;
}) {
  const [data, setData] = useState<AuditIndexData>(indexData);
  const [activeTab, setActiveTab] = useState(0);
  const [showAddSection, setShowAddSection] = useState(false);
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
    const nextRef = String(sec.items.length + 1);
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
        {/* Modal header */}
        <div className={styles.wpiHeader}>
          <div className={styles.wpiHeaderLeft}>
            <div className={styles.wpiHeaderTitle}>Working Paper Index</div>
            <div className={styles.wpiHeaderSub}>
              {data.clientName || 'Unnamed Client'} · {data.year} ·{' '}
              {data.pfrsType === 'Full' ? 'Full PFRS' : 'Not Full PFRS'}
            </div>
          </div>
          <button type="button" className={styles.wpiCloseBtn} onClick={onClose}>×</button>
        </div>

        {/* Tabs */}
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
          {isAdmin && (
            <button type="button" className={styles.wpiTabAdd} onClick={() => setShowAddSection(true)}>
              + Add More
            </button>
          )}
        </div>

        {/* Tab content */}
        {currentSection && (
          <div className={styles.wpiContent}>
            <AnnualFileIndexTable
              section={currentSection}
              isAdmin={isAdmin}
              onUpdateItem={(itemId, field, value) => updateItem(currentSection.id, itemId, field, value)}
              onAddItem={() => addItemToSection(currentSection.id)}
              onRemoveItem={(itemId) => removeItem(currentSection.id, itemId)}
            />
          </div>
        )}
      </div>

      {/* Add Section Modal */}
      {showAddSection && (
        <AddSectionModal
          onClose={() => setShowAddSection(false)}
          onAdd={handleAddSection}
        />
      )}
    </div>
  );

  return createPortal(portal, document.body);
}

/* ── Annual File Index Table ─────────────────────────────── */

function AnnualFileIndexTable({
  section,
  isAdmin,
  onUpdateItem,
  onAddItem,
  onRemoveItem,
}: {
  section: Section;
  isAdmin: boolean;
  onUpdateItem: (itemId: string, field: keyof Item, value: string | boolean) => void;
  onAddItem: () => void;
  onRemoveItem: (itemId: string) => void;
}) {
  return (
    <div className={styles.a4Paper}>
      {/* A4 Header */}
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

      {/* Table */}
      <table className={styles.a4Table}>
        <thead>
          <tr>
            <th className={`${styles.a4Th} ${styles.a4ThRef}`} colSpan={2}>
              REF: <span className={styles.a4ThSectionTitle}>{section.title}</span>
            </th>
            <th className={styles.a4Th}>Initials</th>
            <th className={styles.a4Th}>Source Document</th>
            {isAdmin && <th className={styles.a4Th} style={{ width: 28 }} />}
          </tr>
        </thead>
        <tbody>
          {section.items.map((item) => (
            <AuditItemRow
              key={item.id}
              item={item}
              isAdmin={isAdmin}
              onUpdate={onUpdateItem}
              onRemove={onRemoveItem}
            />
          ))}
          {section.items.length === 0 && (
            <tr>
              <td colSpan={isAdmin ? 5 : 4} className={styles.a4Empty}>
                No items yet. {isAdmin && 'Click "+ Add Row" to begin.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {isAdmin && (
        <button type="button" className={styles.a4AddRowBtn} onClick={onAddItem}>
          + Add Row
        </button>
      )}

      {/* Notes */}
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
  isAdmin,
  onUpdate,
  onRemove,
}: {
  item: Item;
  isAdmin: boolean;
  onUpdate: (itemId: string, field: keyof Item, value: string | boolean) => void;
  onRemove: (itemId: string) => void;
}) {
  return (
    <tr className={`${styles.a4Tr} ${item.isNA ? styles.a4TrNA : ''}`}>
      <td className={`${styles.a4Td} ${styles.a4TdNum}`}>{item.refNum}</td>
      <td className={styles.a4Td}>
        {isAdmin ? (
          <input
            className={styles.a4CellInput}
            value={item.description}
            onChange={(e) => onUpdate(item.id, 'description', e.target.value)}
            placeholder="Description"
          />
        ) : (
          item.description
        )}
      </td>
      <td className={`${styles.a4Td} ${styles.a4TdInitials}`}>
        {item.isNA ? (
          <span className={styles.a4NATag}>NA</span>
        ) : isAdmin ? (
          <input
            className={`${styles.a4CellInput} ${styles.a4InitialsInput}`}
            value={item.initials}
            onChange={(e) => onUpdate(item.id, 'initials', e.target.value)}
            placeholder="—"
          />
        ) : (
          <span className={styles.a4InitialsBox}>{item.initials || '—'}</span>
        )}
      </td>
      <td className={styles.a4Td}>
        {item.isNA ? null : isAdmin ? (
          <input
            className={styles.a4CellInput}
            value={item.sourceDocument}
            onChange={(e) => onUpdate(item.id, 'sourceDocument', e.target.value)}
            placeholder="Source Document"
          />
        ) : (
          item.sourceDocument
        )}
      </td>
      {isAdmin && (
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
      )}
    </tr>
  );
}

/* ── Add Section Modal (A4 style, 50% size) ─────────────── */

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
  const [items, setItems] = useState<
    { refNum: string; description: string; initials: string; sourceDocument: string; isNA: boolean }[]
  >([{ refNum: '1', description: '', initials: '', sourceDocument: '', isNA: false }]);

  function addRow() {
    setItems((prev) => [
      ...prev,
      { refNum: String(prev.length + 1), description: '', initials: '', sourceDocument: '', isNA: false },
    ]);
  }

  function updateRow(
    idx: number,
    field: 'description' | 'initials' | 'sourceDocument' | 'isNA',
    value: string | boolean,
  ) {
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

        {/* A4-style header */}
        <div className={styles.addSecA4Header}>
          <div className={styles.addSecA4Title}>ANNUAL FILE INDEX</div>
          <div className={styles.addSecA4Meta}>
            <div className={styles.addSecA4NA}>
              <span className={styles.a4NALabel}>NA</span>
              <span className={styles.a4NADesc}>Not Applicable</span>
            </div>
          </div>
        </div>

        {/* Section info inputs */}
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

        {/* Items table */}
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
                      title="Toggle N/A"
                    >
                      NA
                    </button>
                    <button
                      type="button"
                      className={styles.a4RowBtnDelete}
                      onClick={() => removeRow(idx)}
                      title="Remove row"
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
