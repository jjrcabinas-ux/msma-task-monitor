'use server';

import { prisma } from '@/lib/db';
import type { ClusterSlug } from '@/lib/clusters';
import { isAdminUnlocked } from '@/lib/memberAuth';

const ADMIN_ERROR = { error: 'Admin access required.' } as const;

async function isAdminForEngagement(engagementId: string): Promise<boolean> {
  const eng = await prisma.specialEngagement.findUnique({
    where: { id: engagementId },
    select: { cluster: true },
  });
  if (!eng) return false;
  return isAdminUnlocked(eng.cluster as ClusterSlug);
}

async function isAdminForEngagementTask(taskId: string): Promise<boolean> {
  const task = await prisma.engagementTask.findUnique({
    where: { id: taskId },
    select: { engagement: { select: { cluster: true } } },
  });
  if (!task) return false;
  return isAdminUnlocked(task.engagement.cluster as ClusterSlug);
}

export async function getEngagementsAction(cluster: ClusterSlug) {
  if (!(await isAdminUnlocked(cluster))) return ADMIN_ERROR;

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
    signedProposal?: string | null;
    signedProposalName?: string | null;
  },
) {
  if (!(await isAdminUnlocked(cluster))) return ADMIN_ERROR;

  return prisma.specialEngagement.create({
    data: { cluster, ...data },
    include: { tasks: { orderBy: { sortOrder: 'asc' } } },
  });
}

export async function updateEngagementStatusAction(id: string, status: string) {
  if (!(await isAdminForEngagement(id))) return ADMIN_ERROR;
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
  if (!(await isAdminForEngagement(id))) return ADMIN_ERROR;
  return prisma.specialEngagement.update({ where: { id }, data });
}

export async function updateEngagementProposalAction(
  id: string,
  signedProposal: string | null,
  signedProposalName: string | null,
) {
  if (!(await isAdminForEngagement(id))) return ADMIN_ERROR;
  return prisma.specialEngagement.update({
    where: { id },
    data: { signedProposal, signedProposalName },
  });
}

export async function deleteEngagementAction(id: string) {
  if (!(await isAdminForEngagement(id))) return ADMIN_ERROR;
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
  if (!(await isAdminForEngagement(engagementId))) return ADMIN_ERROR;

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
  if (!(await isAdminForEngagementTask(id))) return ADMIN_ERROR;

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
  if (!(await isAdminForEngagementTask(id))) return ADMIN_ERROR;
  await prisma.engagementTask.delete({ where: { id } });
}

// Called from deliverable updateTaskAction to sync status back to SE.
// Intentionally unguarded: members update their own linked deliverables,
// and the status must flow back to the engagement task.
export async function syncEngagementTaskStatusAction(linkedTaskId: string, status: string) {
  await prisma.engagementTask.updateMany({
    where: { linkedTaskId },
    data: { status },
  });
}
