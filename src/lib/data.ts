import { prisma } from './db';
import type { ClusterSlug } from './clusters';
import type { EmployeeDTO, Status, TaskDTO } from './types';

function toEmployeeDTO(e: {
  id: string;
  name: string;
  nickname: string;
  position: string;
  email: string;
  birthDate: string | null;
  contactNumber: string;
  createdAt: Date;
}): EmployeeDTO {
  return {
    id: e.id,
    name: e.name,
    nickname: e.nickname,
    position: e.position,
    email: e.email,
    birthDate: e.birthDate,
    contactNumber: e.contactNumber,
    createdAt: e.createdAt.toISOString(),
  };
}

export async function getRoster(cluster: ClusterSlug): Promise<EmployeeDTO[]> {
  const employees = await prisma.employee.findMany({ where: { cluster }, orderBy: { createdAt: 'asc' } });
  return employees.map(toEmployeeDTO);
}

export async function getRosterWithTasks(cluster: ClusterSlug): Promise<{ employee: EmployeeDTO; tasks: TaskDTO[] }[]> {
  const employees = await prisma.employee.findMany({
    where: { cluster },
    orderBy: { createdAt: 'asc' },
    include: { tasks: { orderBy: { createdAt: 'asc' } } },
  });
  return employees.map((e) => ({
    employee: toEmployeeDTO(e),
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

export async function getEmployeeWithTasks(id: string, cluster: ClusterSlug) {
  const e = await prisma.employee.findFirst({
    where: { id, cluster },
    include: { tasks: { orderBy: { createdAt: 'asc' } } },
  });
  if (!e) return null;
  return {
    employee: toEmployeeDTO(e),
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
