import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getAllEmployeesForReminders } from '@/lib/data';
import { addDays, fmtLongDate } from '@/lib/dates';

export const dynamic = 'force-dynamic';

function manilaTodayISO(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === 'year')!.value;
  const m = parts.find((p) => p.type === 'month')!.value;
  const d = parts.find((p) => p.type === 'day')!.value;
  return `${y}-${m}-${d}`;
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const employees = await getAllEmployeesForReminders();
  if (employees.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, total: 0 });
  }

  const todayIso = manilaTodayISO();
  const nextMonday = addDays(todayIso, 3);
  const nextFriday = addDays(todayIso, 7);
  const weekLabel = `${fmtLongDate(nextMonday)} – ${fmtLongDate(nextFriday)}`;
  const appUrl = process.env.REMINDER_APP_URL;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.REMINDER_FROM_EMAIL || 'onboarding@resend.dev';

  const results = await Promise.allSettled(
    employees.map((e) =>
      resend.emails.send({
        from,
        to: e.email,
        subject: `Reminder: add next week's deliverables (${weekLabel})`,
        html: `
          <p>Hi ${e.name},</p>
          <p>It's Friday — please open MSMA Task Monitoring and add your deliverables for next week (<strong>${weekLabel}</strong>).</p>
          ${appUrl ? `<p><a href="${appUrl}">Open MSMA Task Monitoring</a></p>` : ''}
          <p>This keeps the team's tracker up to date before the new week starts.</p>
        `,
      })
    )
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.length - sent;

  return NextResponse.json({ sent, failed, total: employees.length });
}
