'use server';

import { prisma } from '@/lib/db';
import type { ClusterSlug } from '@/lib/clusters';

// Default section templates for Not Full PFRS
const NOT_FULL_PFRS_SECTIONS = [
  {
    name: 'Permanent',
    title: 'Permanent File',
    sectionRef: 'PF',
    items: [] as DefaultItem[],
  },
  {
    name: 'A1',
    title: 'Cash and Cash Equivalents',
    sectionRef: 'A',
    items: [
      { refNum: '1', description: 'Lead Schedule', initials: 'A', sourceDocument: 'FS Support', isNA: false },
      { refNum: '2', description: 'Audit Program', initials: 'Program', sourceDocument: 'FS Support', isNA: false },
      { refNum: '3', description: 'Summary of Cash in bank balances', initials: 'A.1 to A.6.1', sourceDocument: 'Supporting Documentation', isNA: false },
      { refNum: '4', description: 'Summary of GL', initials: 'GL', sourceDocument: 'FS Support', isNA: false },
      { refNum: '5', description: 'Forex Computation', initials: 'NA', sourceDocument: '', isNA: true },
      { refNum: '6', description: 'Proposed Adjusting Journal Entries (PAJEs)', initials: 'NA', sourceDocument: '', isNA: true },
      { refNum: '7', description: 'Bank Reconciliation as of December 31, 2025', initials: 'A.2 and A.2.1', sourceDocument: 'Supporting Documentation', isNA: false },
      { refNum: '8', description: 'Supporting Schedules - List of stale checks', initials: 'NA', sourceDocument: '', isNA: true },
      { refNum: '9', description: 'Supporting Schedules - List of outstanding checks', initials: 'A.6', sourceDocument: 'Supporting Documentation', isNA: false },
      { refNum: '10', description: 'Bank Confirmations', initials: 'A.2', sourceDocument: 'Supporting Documentation', isNA: false },
      { refNum: '11', description: 'Void / Cancelled Checks', initials: 'A.5.1', sourceDocument: 'Supporting Documentation', isNA: false },
      { refNum: '12', description: 'Summary of FS Misstatements', initials: 'NA', sourceDocument: '', isNA: true },
      { refNum: '13', description: 'Audit Findings and Comments', initials: 'NA', sourceDocument: '', isNA: true },
    ],
  },
  { name: 'A2', title: 'Trade and Other Receivables', sectionRef: 'A2', items: [] as DefaultItem[] },
  { name: 'A3', title: 'Inventories', sectionRef: 'A3', items: [] as DefaultItem[] },
  { name: 'Cover', title: 'Cover Page', sectionRef: 'CV', items: [] as DefaultItem[] },
  { name: 'PRA', title: 'Pre-engagement Risk Assessment', sectionRef: 'PRA', items: [] as DefaultItem[] },
  { name: 'SUP', title: 'Supplementary', sectionRef: 'SUP', items: [] as DefaultItem[] },
  { name: 'CR', title: 'Current Period Review', sectionRef: 'CR', items: [] as DefaultItem[] },
];

const FULL_PFRS_SECTIONS = [
  { name: 'Permanent', title: 'Permanent File', sectionRef: 'PF', items: [] as DefaultItem[] },
  { name: 'Cover', title: 'Cover Page', sectionRef: 'CV', items: [] as DefaultItem[] },
  { name: 'PRA', title: 'Pre-engagement Risk Assessment', sectionRef: 'PRA', items: [] as DefaultItem[] },
  { name: 'A', title: 'Cash and Cash Equivalents', sectionRef: 'A', items: [] as DefaultItem[] },
  { name: 'B', title: 'Trade and Other Receivables', sectionRef: 'B', items: [] as DefaultItem[] },
  { name: 'C', title: 'Inventories', sectionRef: 'C', items: [] as DefaultItem[] },
  { name: 'D', title: 'Other Current Assets', sectionRef: 'D', items: [] as DefaultItem[] },
  { name: 'E', title: 'Property, Plant and Equipment', sectionRef: 'E', items: [] as DefaultItem[] },
  { name: 'F', title: 'Intangible Assets', sectionRef: 'F', items: [] as DefaultItem[] },
  { name: 'G', title: 'Other Non-Current Assets', sectionRef: 'G', items: [] as DefaultItem[] },
  { name: 'H', title: 'Trade and Other Payables', sectionRef: 'H', items: [] as DefaultItem[] },
  { name: 'I', title: 'Borrowings', sectionRef: 'I', items: [] as DefaultItem[] },
  { name: 'J', title: 'Equity', sectionRef: 'J', items: [] as DefaultItem[] },
  { name: 'SUP', title: 'Supplementary', sectionRef: 'SUP', items: [] as DefaultItem[] },
  { name: 'CR', title: 'Current Period Review', sectionRef: 'CR', items: [] as DefaultItem[] },
];

type DefaultItem = {
  refNum: string;
  description: string;
  initials: string;
  sourceDocument: string;
  isNA: boolean;
};

export async function createAuditIndexAction(
  cluster: ClusterSlug,
  pfrsType: 'Full' | 'NotFull',
  clientName: string,
  year: number,
) {
  const templates = pfrsType === 'Full' ? FULL_PFRS_SECTIONS : NOT_FULL_PFRS_SECTIONS;

  const index = await prisma.auditIndex.create({
    data: {
      cluster,
      clientName,
      year,
      pfrsType,
      sections: {
        create: templates.map((sec, si) => ({
          name: sec.name,
          title: sec.title,
          sectionRef: sec.sectionRef,
          sortOrder: si,
          isCustom: false,
          items: {
            create: sec.items.map((item, ii) => ({
              refNum: item.refNum,
              description: item.description,
              initials: item.initials,
              sourceDocument: item.sourceDocument,
              isNA: item.isNA,
              sortOrder: ii,
            })),
          },
        })),
      },
    },
    include: {
      sections: {
        orderBy: { sortOrder: 'asc' },
        include: { items: { orderBy: { sortOrder: 'asc' } } },
      },
    },
  });

  return index;
}

export async function getAuditIndicesAction(cluster: ClusterSlug) {
  return prisma.auditIndex.findMany({
    where: { cluster },
    include: {
      sections: {
        orderBy: { sortOrder: 'asc' },
        include: { items: { orderBy: { sortOrder: 'asc' } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateAuditItemAction(
  itemId: string,
  data: { initials?: string; sourceDocument?: string; isNA?: boolean; description?: string },
) {
  await prisma.auditItem.update({ where: { id: itemId }, data });
}

export async function addAuditItemAction(
  sectionId: string,
  data: { refNum: string; description: string; initials: string; sourceDocument: string; isNA: boolean },
) {
  const count = await prisma.auditItem.count({ where: { sectionId } });
  return prisma.auditItem.create({
    data: { sectionId, ...data, sortOrder: count },
  });
}

export async function deleteAuditItemAction(itemId: string) {
  await prisma.auditItem.delete({ where: { id: itemId } });
}

export async function addAuditSectionAction(
  indexId: string,
  data: {
    name: string;
    title: string;
    sectionRef: string;
    items: { refNum: string; description: string; initials: string; sourceDocument: string; isNA: boolean }[];
  },
) {
  const count = await prisma.auditSection.count({ where: { indexId } });
  return prisma.auditSection.create({
    data: {
      indexId,
      name: data.name,
      title: data.title,
      sectionRef: data.sectionRef,
      sortOrder: count,
      isCustom: true,
      items: {
        create: data.items.map((item, i) => ({ ...item, sortOrder: i })),
      },
    },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  });
}

export async function deleteAuditIndexAction(indexId: string) {
  await prisma.auditIndex.delete({ where: { id: indexId } });
}

export async function updateAuditIndexAction(indexId: string, data: { clientName?: string; year?: number }) {
  await prisma.auditIndex.update({ where: { id: indexId }, data });
}
