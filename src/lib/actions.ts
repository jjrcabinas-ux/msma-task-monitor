'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from './db';
import type { Status } from './types';

function revalidateAll() {
  revalidatePath('/', 'layout');
}

export async function addEmployeeAction(rawName: string): Promise<{ id: string } | { error: string }> {
  const name = rawName.trim();
  if (!name) return { error: 'Name is required.' };

  const existing = await prisma.employee.findUnique({ where: { name } });
  if (existing) {
    return { id: existing.id };
  }
  const created = await prisma.employee.create({ data: { name } });
  revalidateAll();
  return { id: created.id };
}

export async function removeEmployeeAction(id: string): Promise<{ ok: true } | { error: string }> {
  const count = await prisma.employee.count();
  if (count <= 1) return { error: 'At least one team member must remain.' };
  await prisma.employee.delete({ where: { id } });
  revalidateAll();
  return { ok: true };
}

export async function addTaskAction(employeeId: string): Promise<{ id: string }> {
  const task = await prisma.task.create({
    data: { employeeId, date: null, taskGeneral: '', taskDetails: '', status: 'Pending', helpNeeded: '' },
  });
  revalidateAll();
  return { id: task.id };
}

export async function updateTaskAction(
  taskId: string,
  patch: Partial<{ date: string | null; taskGeneral: string; taskDetails: string; status: Status; helpNeeded: string }>
): Promise<{ ok: true }> {
  await prisma.task.update({ where: { id: taskId }, data: patch });
  revalidateAll();
  return { ok: true };
}

export async function deleteTaskAction(taskId: string): Promise<{ ok: true }> {
  await prisma.task.delete({ where: { id: taskId } });
  revalidateAll();
  return { ok: true };
}
