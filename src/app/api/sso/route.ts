import { NextRequest, NextResponse } from 'next/server';
import { X509Certificate, verify as verifySignature } from 'crypto';
import { prisma } from '@/lib/db';
import { setMemberSession } from '@/lib/memberAuth';
import { isClusterSlug } from '@/lib/clusters';

// Single sign-on from MSMA Workspace (msma.work). The workspace posts the
// signed-in user's Firebase ID token; we verify it against Google's public
// certs, match the email to an Employee, and mint the same member session
// cookie the normal login flow sets. Anything invalid falls back to the
// cluster picker at / (the /gate page 404s without a cluster param).

const WORKSPACE_PROJECT_ID = 'msma-workspace';
const CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

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
  const gate = () => NextResponse.redirect(new URL('/', request.url), 303);
  let token = '';
  try {
    token = String((await request.formData()).get('token') || '');
  } catch {
    return gate();
  }
  if (!token) return gate();
  const email = await verifyWorkspaceIdToken(token);
  if (!email) return gate();
  const employee = await prisma.employee.findFirst({
    where: { email: { equals: email, mode: 'insensitive' }, NOT: { email: '' } },
  });
  const cluster = employee ? employee.cluster : '';
  if (!employee || !isClusterSlug(cluster)) return gate();
  await setMemberSession(cluster, employee.id);
  return NextResponse.redirect(new URL(`/${cluster}`, request.url), 303);
}
