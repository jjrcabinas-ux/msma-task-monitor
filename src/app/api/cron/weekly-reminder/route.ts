import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getAllEmployeesForReminders } from '@/lib/data';

export const dynamic = 'force-dynamic';

const SUBJECT = 'Weekly task monitoring reminder';

function buildHtml(appUrl: string | undefined): string {
  return `
    <p>Hi team,</p>
    <p>Another week wrapped — and a good one. Thank you all for the work you put in. Whether it was a deadline met, a tricky problem solved, or just steady progress on the day-to-day, it adds up and it doesn't go unnoticed. Nice work, everyone.</p>
    <p>With that, one small housekeeping item to set us up for next week: please take a few minutes to update the${appUrl ? ` <a href="${appUrl}">task monitoring sheet</a>` : ' task monitoring sheet'} before you log off. Make sure your completed items are marked done and your tasks for next week are listed and current.</p>
    <p>Keeping it up to date helps all of us stay aligned and walk into Monday knowing exactly where things stand.</p>
    <p>Thanks again for a strong week. Enjoy the weekend!</p>
  `;
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

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.REMINDER_FROM_EMAIL || 'onboarding@resend.dev';
  const html = buildHtml(process.env.REMINDER_APP_URL);

  const results = await Promise.allSettled(
    employees.map((e) =>
      resend.emails.send({
        from,
        to: e.email,
        subject: SUBJECT,
        html,
      })
    )
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.length - sent;

  return NextResponse.json({ sent, failed, total: employees.length });
}
