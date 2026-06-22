import { NextRequest, NextResponse } from 'next/server';
import { isClusterSlug, clusterUnlockCookieName } from '@/lib/clusters';

export function proxy(request: NextRequest) {
  const cluster = request.nextUrl.pathname.split('/')[1];
  if (!cluster || !isClusterSlug(cluster)) return NextResponse.next();

  const unlocked = request.cookies.get(clusterUnlockCookieName(cluster))?.value === '1';
  if (unlocked) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = '/gate';
  url.search = `?cluster=${cluster}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: '/:path*',
};
