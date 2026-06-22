export type Status = 'Pending' | 'Ongoing' | 'Done';

export type TaskDTO = {
  id: string;
  employeeId: string;
  date: string | null;
  taskGeneral: string;
  taskDetails: string;
  status: Status;
  helpNeeded: string;
};

export type EmployeeDTO = {
  id: string;
  name: string;
  createdAt: string;
};

export type Period = 'week' | 'month' | 'year' | 'custom';
