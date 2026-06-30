'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { prisma } from './db';
import { CLUSTERS, clusterUnlockCookieName, type ClusterSlug } from './clusters';
import { isTaskLocked, todayISO } from './dates';
import {
  canEditEmployee,
  clearMemberSession,
  clusterPasswordToken,
  hashPassword,
  isAdminUnlocked,
  setMemberSession,
  verifyPassword,
} from './memberAuth';
import type { Status } from './types';

function revalidateAll() {
  revalidatePath('/', 'layout');
}

export async function unlockClusterAction(
  cluster: ClusterSlug,
  password: string
): Promise<{ ok: true } | { error: string }> {
  const expected = process.env[CLUSTERS[cluster].passwordEnv];
  if (!expected || password !== expected) {
    return { error: 'Incorrect password.' };
  }
  const cookieStore = await cookies();
  cookieStore.set(clusterUnlockCookieName(cluster), clusterPasswordToken(cluster)!, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
  return { ok: true };
}

export async function memberLoginAction(
  cluster: ClusterSlug,
  email: string,
  password: string
): Promise<{ id: string; name: string } | { error: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const plainPassword = password.trim();
  if (!normalizedEmail) return { error: 'Email is required.' };
  if (!plainPassword) return { error: 'Password is required.' };

  const employee = await prisma.employee.findFirst({
    where: { cluster, email: { equals: normalizedEmail, mode: 'insensitive' } },
  });
  if (!employee) return { error: 'No team member found with that email.' };

  if (!employee.password) {
    await prisma.employee.update({ where: { id: employee.id }, data: { password: hashPassword(plainPassword) } });
  } else if (!verifyPassword(plainPassword, employee.password)) {
    return { error: 'Incorrect password.' };
  }

  await setMemberSession(cluster, employee.id);
  return { id: employee.id, name: employee.name };
}

export async function memberRecoverWithClusterPasswordAction(
  cluster: ClusterSlug,
  email: string,
  clusterPassword: string,
  newPassword: string
): Promise<{ id: string; name: string } | { error: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const plainNewPassword = newPassword.trim();
  if (!normalizedEmail) return { error: 'Email is required.' };
  if (!plainNewPassword || plainNewPassword.length < 4) return { error: 'New password must be at least 4 characters.' };

  const expected = process.env[CLUSTERS[cluster].passwordEnv];
  if (!expected || clusterPassword !== expected) {
    return { error: 'Incorrect cluster password.' };
  }

  const employee = await prisma.employee.findFirst({
    where: { cluster, email: { equals: normalizedEmail, mode: 'insensitive' } },
  });
  if (!employee) return { error: 'No team member found with that email.' };

  await prisma.employee.update({ where: { id: employee.id }, data: { password: hashPassword(plainNewPassword) } });
  await setMemberSession(cluster, employee.id);
  return { id: employee.id, name: employee.name };
}

export async function memberLogoutAction(cluster: ClusterSlug): Promise<{ ok: true }> {
  await clearMemberSession(cluster);
  return { ok: true };
}

export async function memberSignupAction(
  cluster: ClusterSlug,
  input: {
    name: string;
    nickname: string;
    position: string;
    email: string;
    password: string;
    birthDate: string;
    contactNumber: string;
  }
): Promise<{ id: string; name: string } | { error: string }> {
  const name = input.name.trim();
  const nickname = input.nickname.trim();
  const position = input.position.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password.trim();
  const birthDate = input.birthDate.trim();
  const contactNumber = input.contactNumber.trim();

  if (!name) return { error: 'Name is required.' };
  if (!nickname) return { error: 'Nickname is required.' };
  if (!position) return { error: 'Position is required.' };
  if (!email) return { error: 'Email address is required.' };
  if (!password || password.length < 4) return { error: 'Password must be at least 4 characters.' };
  if (!birthDate) return { error: 'Birth date is required.' };
  if (!contactNumber) return { error: 'Contact number is required.' };

  const existingName = await prisma.employee.findUnique({ where: { cluster_name: { cluster, name } } });
  if (existingName) {
    return { error: 'Someone in this cluster already has that name. Log in instead, or contact your admin.' };
  }
  const existingEmail = await prisma.employee.findFirst({
    where: { cluster, email: { equals: email, mode: 'insensitive' } },
  });
  if (existingEmail) {
    return { error: 'An account with that email already exists in this cluster. Log in instead.' };
  }

  const created = await prisma.employee.create({
    data: { cluster, name, nickname, position, email, birthDate, contactNumber, password: hashPassword(password) },
  });
  await setMemberSession(cluster, created.id);
  revalidateAll();
  return { id: created.id, name: created.name };
}

export async function addEmployeeAction(
  cluster: ClusterSlug,
  input: {
    name: string;
    nickname: string;
    position: string;
    email: string;
    birthDate: string;
    contactNumber: string;
  }
): Promise<{ id: string } | { error: string }> {
  if (!(await isAdminUnlocked(cluster))) return { error: 'Admin access required.' };

  const name = input.name.trim();
  const nickname = input.nickname.trim();
  const position = input.position.trim();
  const email = input.email.trim();
  const birthDate = input.birthDate.trim();
  const contactNumber = input.contactNumber.trim();

  if (!name) return { error: 'Name is required.' };
  if (!nickname) return { error: 'Nickname is required.' };
  if (!position) return { error: 'Position is required.' };
  if (!email) return { error: 'Email address is required.' };
  if (!birthDate) return { error: 'Birth date is required.' };
  if (!contactNumber) return { error: 'Contact number is required.' };

  const existing = await prisma.employee.findUnique({ where: { cluster_name: { cluster, name } } });
  if (existing) {
    return { id: existing.id };
  }
  const created = await prisma.employee.create({
    data: { cluster, name, nickname, position, email, birthDate, contactNumber },
  });
  revalidateAll();
  return { id: created.id };
}

export async function updateEmployeeAction(
  id: string,
  cluster: ClusterSlug,
  input: {
    name: string;
    nickname: string;
    position: string;
    email: string;
    birthDate: string;
    contactNumber: string;
  }
): Promise<{ ok: true } | { error: string }> {
  if (!(await isAdminUnlocked(cluster))) return { error: 'Admin access required.' };

  const name = input.name.trim();
  const nickname = input.nickname.trim();
  const position = input.position.trim();
  const email = input.email.trim();
  const birthDate = input.birthDate.trim();
  const contactNumber = input.contactNumber.trim();

  if (!name) return { error: 'Name is required.' };
  if (!nickname) return { error: 'Nickname is required.' };
  if (!position) return { error: 'Position is required.' };
  if (!email) return { error: 'Email address is required.' };
  if (!birthDate) return { error: 'Birth date is required.' };
  if (!contactNumber) return { error: 'Contact number is required.' };

  const conflict = await prisma.employee.findUnique({ where: { cluster_name: { cluster, name } } });
  if (conflict && conflict.id !== id) {
    return { error: 'Another team member already has that name.' };
  }

  await prisma.employee.update({ where: { id }, data: { name, nickname, position, email, birthDate, contactNumber } });
  revalidateAll();
  return { ok: true };
}

export async function removeEmployeeAction(id: string, cluster: ClusterSlug): Promise<{ ok: true } | { error: string }> {
  if (!(await isAdminUnlocked(cluster))) return { error: 'Admin access required.' };
  const count = await prisma.employee.count({ where: { cluster } });
  if (count <= 1) return { error: 'At least one team member must remain.' };
  await prisma.employee.delete({ where: { id } });
  revalidateAll();
  return { ok: true };
}

export async function addTaskAction(
  employeeId: string,
  date: string | null = null,
  taskGeneral = ''
): Promise<{ id: string } | { error: string }> {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId }, select: { cluster: true } });
  if (!employee) return { error: 'Team member not found.' };
  if (!(await canEditEmployee(employee.cluster as ClusterSlug, employeeId))) {
    return { error: 'You can only add deliverables for yourself.' };
  }
  const task = await prisma.task.create({
    data: { employeeId, date, taskGeneral, taskDetails: '', status: 'Pending', helpNeeded: '' },
  });
  revalidateAll();
  return { id: task.id };
}

export async function updateTaskAction(
  taskId: string,
  patch: Partial<{
    date: string | null;
    dueDate: string | null;
    taskGeneral: string;
    taskDetails: string;
    status: Status;
    helpNeeded: string;
  }>
): Promise<{ ok: true } | { error: string }> {
  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    select: { date: true, employeeId: true, employee: { select: { cluster: true } } },
  });
  if (!existing) return { error: 'Deliverable not found.' };
  if (!(await canEditEmployee(existing.employee.cluster as ClusterSlug, existing.employeeId))) {
    return { error: 'You can only edit your own deliverables.' };
  }
  if (isTaskLocked(existing.date, todayISO())) {
    const patchedKeys = Object.keys(patch);
    const disallowed = patchedKeys.some((key) => key !== 'status' && key !== 'helpNeeded');
    if (disallowed) {
      return {
        error: 'This deliverable is more than 2 weeks old — only its status and help needed can still be updated.',
      };
    }
  }
  await prisma.task.update({ where: { id: taskId }, data: patch });
  revalidateAll();
  return { ok: true };
}

export async function deleteTaskAction(taskId: string): Promise<{ ok: true } | { error: string }> {
  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    select: { date: true, employeeId: true, employee: { select: { cluster: true } } },
  });
  if (!existing) return { error: 'Deliverable not found.' };
  if (!(await canEditEmployee(existing.employee.cluster as ClusterSlug, existing.employeeId))) {
    return { error: 'You can only edit your own deliverables.' };
  }
  if (isTaskLocked(existing.date, todayISO())) {
    return { error: 'This deliverable is more than 2 weeks old and can no longer be edited.' };
  }
  await prisma.task.delete({ where: { id: taskId } });
  revalidateAll();
  return { ok: true };
}
