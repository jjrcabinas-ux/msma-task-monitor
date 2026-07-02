import { NextRequest, NextResponse } from 'next/server';
import { CLUSTERS, isClusterSlug, clusterUnlockCookieName, type ClusterSlug } from '@/lib/clusters';

const SESSION_SECRET = process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET || 'msma-task-monitor-dev-secret';

// Must match SESSION_VERSION in src/lib/memberAuth.ts.
const SESSION_VERSION = 'v2';

function memberSessionCookieName(cluster: string): string {
  return `member_session_${cluster}`;
}

async function hmacHex(message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(SESSION_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${SESSION_VERSION}:${message}`));
  return Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function isValidMemberCookie(raw: string | undefined): Promise<boolean> {
  if (!raw) return false;
  const [employeeId, signature] = raw.split('.');
  if (!employeeId || !signature) return false;
  return (await hmacHex(employeeId)) === signature;
}

async function isValidAdminCookie(cluster: ClusterSlug, raw: string | undefined): Promise<boolean> {
  if (!raw) return false;
  const expectedPassword = process.env[CLUSTERS[cluster].passwordEnv];
  if (!expectedPassword) return false;
  const expectedToken = await hmacHex(`admin:${cluster}:${expectedPassword}`);
  return expectedToken === raw;
}

export async function proxy(request: NextRequest) {
  const cluster = request.nextUrl.pathname.split('/')[1];
  if (!cluster || !isClusterSlug(cluster)) return NextResponse.next();

  const adminCookie = request.cookies.get(clusterUnlockCookieName(cluster))?.value;
  if (await isValidAdminCookie(cluster, adminCookie)) return NextResponse.next();

  const memberCookie = request.cookies.get(memberSessionCookieName(cluster))?.value;
  if (await isValidMemberCookie(memberCookie)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = '/gate';
  url.search = `?cluster=${cluster}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: '/:path*',
};
