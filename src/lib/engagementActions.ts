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

export async function updateEngagementAction(
  id: string,
  data: {
    companyName: string;
    engagement: string;
    proposalDate: Date;
    dueDate: Date;
    seniorAssigned: string;
  },
) {
  return prisma.specialEngagement.update({ where: { id }, data });
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
    assignedTo: string;
  },
) {
  const count = await prisma.engagementTask.count({ where: { engagementId } });
  let linkedTaskId: string | undefined;

  // If an associate is assigned, auto-create a matching deliverable for them
  if (data.assignedTo.trim()) {
    const engRec = await prisma.specialEngagement.findUnique({
      where: { id: engagementId },
      select: { cluster: true, companyName: true, engagement: true },
    });

    if (engRec) {
      const employee = await prisma.employee.findFirst({
        where: { cluster: engRec.cluster, name: data.assignedTo.trim() },
        select: { id: true },
      });

      if (employee) {
        const today = new Date().toISOString().split('T')[0];
        const dueDateStr = data.dueDate ? data.dueDate.toISOString().split('T')[0] : null;

        const linked = await prisma.task.create({
          data: {
            employeeId: employee.id,
            taskGeneral: `[SE] ${engRec.companyName} — ${engRec.engagement}`,
            taskDetails: data.task,
            date: today,
            dueDate: dueDateStr,
            status: data.status,
            helpNeeded: '',
          },
        });
        linkedTaskId = linked.id;
      }
    }
  }

  return prisma.engagementTask.create({
    data: {
      engagementId,
      task: data.task,
      dueDate: data.dueDate,
      status: data.status,
      comments: data.comments,
      sortOrder: count,
      assignedTo: data.assignedTo,
      ...(linkedTaskId ? { linkedTaskId } : {}),
    },
  });
}

export async function updateEngagementTaskAction(
  id: string,
  data: Partial<{ task: string; dueDate: Date | null; status: string; comments: string }>,
) {
  const updated = await prisma.engagementTask.update({ where: { id }, data });

  // Sync status to linked deliverable
  if (data.status && updated.linkedTaskId) {
    await prisma.task.update({
      where: { id: updated.linkedTaskId },
      data: { status: data.status },
    });
  }

  return updated;
}

export async function deleteEngagementTaskAction(id: string) {
  await prisma.engagementTask.delete({ where: { id } });
}

// Called from deliverable updateTaskAction to sync status back to SE
export async function syncEngagementTaskStatusAction(linkedTaskId: string, status: string) {
  await prisma.engagementTask.updateMany({
    where: { linkedTaskId },
    data: { status },
  });
}
