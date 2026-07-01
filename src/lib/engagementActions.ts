'use server';

import { prisma } from '@/lib/db';
import type { ClusterSlug } from '@/lib/clusters';

export async function getEngagementsAction(cluster: ClusterSlug) {
  return prisma.specialEngagement.findMany({
    where: { cluster },
    include: { tasks: { orderBy: { sortOrder: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createEngagementAction(
  cluster: ClusterSlug,
  data: {
    companyName: string;
    engagement: string;
    proposalDate: Date;
    dueDate: Date;
    seniorAssigned: string;
    juniorAssigned: string[];
  },
) {
  return prisma.specialEngagement.create({
    data: { cluster, ...data },
    include: { tasks: { orderBy: { sortOrder: 'asc' } } },
  });
}

export async function updateEngagementStatusAction(id: string, status: string) {
  return prisma.specialEngagement.update({ where: { id }, data: { status } });
}

export async function deleteEngagementAction(id: string) {
  await prisma.specialEngagement.delete({ where: { id } });
}

export async function addEngagementTaskAction(
  engagementId: string,
  data: {
    task: string;
    dueDate: Date | null;
    status: string;
    comments: string;
  },
) {
  const count = await prisma.engagementTask.count({ where: { engagementId } });
  return prisma.engagementTask.create({
    data: { engagementId, ...data, sortOrder: count },
  });
}

export async function updateEngagementTaskAction(
  id: string,
  data: Partial<{ task: string; dueDate: Date | null; status: string; comments: string }>,
) {
  return prisma.engagementTask.update({ where: { id }, data });
}

export async function deleteEngagementTaskAction(id: string) {
  await prisma.engagementTask.delete({ where: { id } });
}
