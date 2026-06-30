export type Status = 'Pending' | 'Ongoing' | 'Done';

export type TaskDTO = {
  id: string;
  employeeId: string;
  date: string | null;
  dueDate: string | null;
  taskGeneral: string;
  taskDetails: string;
  status: Status;
  helpNeeded: string;
};

export type EmployeeDTO = {
  id: string;
  name: string;
  nickname: string;
  position: string;
  email: string;
  birthDate: string | null;
  contactNumber: string;
  createdAt: string;
};

export type Period = 'week' | 'month' | 'year' | 'custom';
