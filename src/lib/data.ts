import { prisma } from './db';
import type { EmployeeDTO, Status, TaskDTO } from './types';

export async function getRoster(): Promise<EmployeeDTO[]> {
  const employees = await prisma.employee.findMany({ orderBy: { createdAt: 'asc' } });
  return employees.map((e) => ({
    id: e.id,
    name: e.name,
    photoPath: e.photoPath,
    photoPosX: e.photoPosX,
    photoPosY: e.photoPosY,
    createdAt: e.createdAt.toISOString(),
  }));
}

export async function getRosterWithTasks(): Promise<{ employee: EmployeeDTO; tasks: TaskDTO[] }[]> {
  const employees = await prisma.employee.findMany({
    orderBy: { createdAt: 'asc' },
    include: { tasks: { orderBy: { createdAt: 'asc' } } },
  });
  return employees.map((e) => ({
    employee: {
      id: e.id,
      name: e.name,
      photoPath: e.photoPath,
      photoPosX: e.photoPosX,
      photoPosY: e.photoPosY,
      createdAt: e.createdAt.toISOString(),
    },
    tasks: e.tasks.map((t) => ({
      id: t.id,
      employeeId: t.employeeId,
      date: t.date,
      taskGeneral: t.taskGeneral,
      taskDetails: t.taskDetails,
      status: t.status as Status,
      helpNeeded: t.helpNeeded,
    })),
  }));
}

export async function getEmployeeWithTasks(id: string) {
  const e = await prisma.employee.findUnique({
    where: { id },
    include: { tasks: { orderBy: { createdAt: 'asc' } } },
  });
  if (!e) return null;
  return {
    employee: {
      id: e.id,
      name: e.name,
      photoPath: e.photoPath,
      photoPosX: e.photoPosX,
      photoPosY: e.photoPosY,
      createdAt: e.createdAt.toISOString(),
    } as EmployeeDTO,
    tasks: e.tasks.map((t) => ({
      id: t.id,
      employeeId: t.employeeId,
      date: t.date,
      taskGeneral: t.taskGeneral,
      taskDetails: t.taskDetails,
      status: t.status as Status,
      helpNeeded: t.helpNeeded,
    })) as TaskDTO[],
  };
}
