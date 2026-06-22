'use server';

import { revalidatePath } from 'next/cache';
import { del, put } from '@vercel/blob';
import { prisma } from './db';
import type { Status } from './types';

const ACCEPTED_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

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
  const employee = await prisma.employee.delete({ where: { id } });
  if (employee.photoPath) {
    await del(employee.photoPath).catch(() => {});
  }
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

export async function uploadPhotoAction(employeeId: string, formData: FormData): Promise<{ ok: true } | { error: string }> {
  const file = formData.get('file');
  if (!(file instanceof File)) return { error: 'No file provided.' };
  const ext = ACCEPTED_TYPES[file.type];
  if (!ext) return { error: 'Unsupported image type. Use PNG, JPEG, or WebP.' };
  if (file.size > 5 * 1024 * 1024) return { error: 'Image must be under 5MB.' };

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return { error: 'Employee not found.' };

  if (employee.photoPath) {
    await del(employee.photoPath).catch(() => {});
  }

  const filename = `${employeeId}-${Date.now()}.${ext}`;
  const blob = await put(filename, file, { access: 'public', addRandomSuffix: false });

  await prisma.employee.update({ where: { id: employeeId }, data: { photoPath: blob.url } });
  revalidateAll();
  return { ok: true };
}
