export const AVATAR_COLORS = ['#2563eb', '#0d9488', '#7c3aed', '#ea580c', '#db2777', '#0891b2', '#65a30d', '#dc2626'];

export function employeeColor(index: number): string {
  if (index < 0) index = 0;
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

export const STATUS_META = {
  Pending: { label: 'Pending', color: '#b45309', bg: '#fef3c7', dot: '#f59e0b' },
  Ongoing: { label: 'Ongoing', color: '#1d4ed8', bg: '#dbeafe', dot: '#3b82f6' },
  Done: { label: 'Done', color: '#15803d', bg: '#dcfce7', dot: '#16a34a' },
} as const;
