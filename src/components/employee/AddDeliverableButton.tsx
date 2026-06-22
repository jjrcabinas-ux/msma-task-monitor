'use client';

import { useTransition } from 'react';
import { addTaskAction } from '@/lib/actions';
import { todayISO } from '@/lib/dates';

export default function AddDeliverableButton({
  employeeId,
  className,
  children,
}: {
  employeeId: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [pending, startTransition] = useTransition();

  function add() {
    startTransition(async () => {
      await addTaskAction(employeeId, todayISO());
    });
  }

  return (
    <button className={className} onClick={add} disabled={pending}>
      {children}
    </button>
  );
}
