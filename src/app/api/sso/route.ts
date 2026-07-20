import { NextRequest, NextResponse } from 'next/server';
import { X509Certificate, verify as verifySignature } from 'crypto';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { clusterPasswordToken, setMemberSession } from '@/lib/memberAuth';
import { clusterUnlockCookieName, isClusterSlug } from '@/lib/clusters';

// Single sign-on from MSMA Workspace (msma.work). The workspace posts the
// signed-in user's Firebase ID token; we verify it against Google's public
// certs, match the email to an Employee, and mint the same member session
// cookie the normal login flow sets. Anything invalid falls back to the
// cluster picker at / (the /gate page 404s without a cluster param).

const WORKSPACE_PROJECT_ID = 'msma-workspace';
const CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

// Workspace admins get a cluster-admin unlock (same cookie the password
// gate sets) instead of a member session.
const WORKSPACE_ADMIN_EMAILS = ['jjrcabinas@gmail.com'];

function decodePart(part: string): Record<string, unknown> | null {
  try {
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

async function verifyWorkspaceIdToken(token: string): Promise<string | null> {
  const [h, p, s] = token.split('.');
  if (!h || !p || !s) return null;
  const header = decodePart(h);
  const payload = decodePart(p);
  if (!header || !payload) return null;
  if (header.alg !== 'RS256' || typeof header.kid !== 'string') return null;
  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== WORKSPACE_PROJECT_ID) return null;
  if (payload.iss !== `https://securetoken.google.com/${WORKSPACE_PROJECT_ID}`) return null;
  if (typeof payload.exp !== 'number' || payload.exp <= now) return null;
  if (typeof payload.email !== 'string' || !payload.email) return null;
  const certs = (await fetch(CERTS_URL, { next: { revalidate: 3600 } }).then((r) => r.json())) as Record<string, string>;
  const pem = certs[header.kid];
  if (!pem) return null;
  const valid = verifySignature(
    'RSA-SHA256',
    Buffer.from(`${h}.${p}`),
    new X509Certificate(pem).publicKey,
    Buffer.from(s, 'base64url')
  );
  return valid ? payload.email.toLowerCase() : null;
}

export async function POST(request: NextRequest) {
  const home = () => NextResponse.redirect(new URL('/', request.url), 303);
  let token = '';
  let clusterHint = '';
  let name = '';
  try {
    const form = await request.formData();
    token = String(form.get('token') || '');
    clusterHint = String(form.get('cluster') || '').toLowerCase();
    name = String(form.get('name') || '').trim();
  } catch {
    return home();
  }
  if (!token) return home();
  const email = await verifyWorkspaceIdToken(token);
  if (!email) return home();

  // Workspace admin: unlock the requested cluster directly — no password,
  // no member session (a member session would drop admin privileges).
  if (WORKSPACE_ADMIN_EMAILS.includes(email) && isClusterSlug(clusterHint)) {
    const unlockToken = clusterPasswordToken(clusterHint);
    if (!unlockToken) return home();
    const cookieStore = await cookies();
    cookieStore.set(clusterUnlockCookieName(clusterHint), unlockToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8,
    });
    return NextResponse.redirect(new URL(`/${clusterHint}`, request.url), 303);
  }

  // 1) Email is the authoritative link.
  let employee = await prisma.employee.findFirst({
    where: { email: { equals: email, mode: 'insensitive' }, NOT: { email: '' } },
  });

  // No email link yet: the workspace Members registry already assigns this
  // email to a cluster, so 2) adopt an existing same-name record in that
  // cluster that has no email, else 3) provision a fresh employee record.
  // The hint only applies to unlinked accounts — a linked email always wins.
  if (!employee && isClusterSlug(clusterHint)) {
    if (name) {
      const unlinked = await prisma.employee.findFirst({
        where: {
          cluster: clusterHint,
          email: '',
          OR: [
            { name: { equals: name, mode: 'insensitive' } },
            { nickname: { equals: name, mode: 'insensitive' } },
          ],
        },
      });
      if (unlinked) {
        employee = await prisma.employee.update({ where: { id: unlinked.id }, data: { email } });
      }
    }
    if (!employee) {
      try {
        employee = await prisma.employee.create({
          data: { cluster: clusterHint, name: name || email.split('@')[0], email },
        });
      } catch {
        employee = null; // name collision in the cluster — fall through
      }
    }
  }

  const cluster = employee ? employee.cluster : '';
  if (!employee || !isClusterSlug(cluster)) return home();
  await setMemberSession(cluster, employee.id);
  return NextResponse.redirect(new URL(`/${cluster}`, request.url), 303);
}
