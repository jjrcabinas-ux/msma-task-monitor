import { NextRequest, NextResponse } from 'next/server';
import { isClusterSlug, clusterUnlockCookieName } from '@/lib/clusters';

const SESSION_SECRET = process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET || 'msma-task-monitor-dev-secret';

function memberSessionCookieName(cluster: string): string {
  return `member_session_${cluster}`;
}

async function isValidMemberCookie(raw: string | undefined): Promise<boolean> {
  if (!raw) return false;
  const [employeeId, signature] = raw.split('.');
  if (!employeeId || !signature) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(SESSION_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(employeeId));
  const expected = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return expected === signature;
}

export async function proxy(request: NextRequest) {
  const cluster = request.nextUrl.pathname.split('/')[1];
  if (!cluster || !isClusterSlug(cluster)) return NextResponse.next();

  const adminUnlocked = request.cookies.get(clusterUnlockCookieName(cluster))?.value === '1';
  if (adminUnlocked) return NextResponse.next();

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
