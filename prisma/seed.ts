import { prisma } from '../src/lib/db';

function isoOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type SeedTask = {
  date: number;
  taskGeneral: string;
  taskDetails: string;
  status: 'Pending' | 'Ongoing' | 'Done';
  helpNeeded?: string;
};

const ROSTER: Record<string, SeedTask[]> = {
  Josh: [
    { date: -4, taskGeneral: 'Campaign Setup', taskDetails: 'Build June FB ad sets', status: 'Done' },
    { date: -3, taskGeneral: 'Creative Review', taskDetails: 'Approve 5 banner variants', status: 'Done' },
    { date: 0, taskGeneral: 'Performance Report', taskDetails: 'Compile weekly ROAS deck', status: 'Ongoing', helpNeeded: 'Need GA4 export access from analytics team' },
  ],
  Jelly: [
    { date: -4, taskGeneral: 'Keyword Research', taskDetails: 'Expand SKAG list for Q3', status: 'Done' },
    { date: -3, taskGeneral: 'Landing Page QA', taskDetails: 'Check mobile load speed', status: 'Ongoing' },
    { date: 0, taskGeneral: 'A/B Test', taskDetails: 'Launch headline test on LP', status: 'Pending' },
  ],
  Ivy: [
    { date: -4, taskGeneral: 'Client Sync', taskDetails: 'Prep agenda and notes', status: 'Done' },
    { date: 0, taskGeneral: 'Budget Pacing', taskDetails: 'Reallocate spend to top ad sets', status: 'Ongoing', helpNeeded: 'Waiting on finance sign-off for reallocation' },
  ],
  Jenny: [
    { date: -3, taskGeneral: 'Copywriting', taskDetails: 'Draft 10 ad headlines', status: 'Done' },
    { date: 0, taskGeneral: 'Asset Handoff', taskDetails: 'Send approved creatives to design', status: 'Pending' },
  ],
  Jonard: [
    { date: -4, taskGeneral: 'Tracking Setup', taskDetails: 'Install conversion pixels', status: 'Done' },
    { date: 0, taskGeneral: 'Pixel Audit', taskDetails: 'Review pixel firing on site', status: 'Ongoing', helpNeeded: 'Pixel not firing on checkout page' },
  ],
  Nice: [
    { date: -3, taskGeneral: 'Reporting', taskDetails: 'Update client dashboard', status: 'Done' },
    { date: 0, taskGeneral: 'Outreach', taskDetails: 'Schedule 3 discovery calls', status: 'Pending' },
  ],
  Ariane: [
    { date: -4, taskGeneral: 'Design Brief', taskDetails: 'Write brief for summer promo', status: 'Done' },
    { date: 0, taskGeneral: 'Social Calendar', taskDetails: 'Plan July content posts', status: 'Ongoing' },
  ],
  Gill: [
    { date: 0, taskGeneral: 'Onboarding', taskDetails: 'Set up new client workspace', status: 'Pending', helpNeeded: 'Missing brand guidelines from client' },
  ],
};

async function main() {
  const existing = await prisma.employee.count({ where: { cluster: 'ads' } });
  if (existing > 0) {
    console.log(`Cluster "ads" already has ${existing} employee(s) — skipping seed.`);
    return;
  }
  for (const name of Object.keys(ROSTER)) {
    await prisma.employee.create({
      data: {
        cluster: 'ads',
        name,
        tasks: {
          create: ROSTER[name].map((t) => ({
            date: isoOffset(t.date),
            taskGeneral: t.taskGeneral,
            taskDetails: t.taskDetails,
            status: t.status,
            helpNeeded: t.helpNeeded || '',
          })),
        },
      },
    });
  }
  console.log('Seeded MSMA ADS Cluster roster with sample data.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
