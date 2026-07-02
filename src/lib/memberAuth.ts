import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { CLUSTERS, clusterUnlockCookieName, type ClusterSlug } from './clusters';

const SESSION_SECRET = process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET || 'msma-task-monitor-dev-secret';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24; // expires daily

export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(plain, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = scryptSync(plain, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

// Bump to force-invalidate ALL existing sessions (members and admin unlocks).
// Must match SESSION_VERSION in src/proxy.ts.
const SESSION_VERSION = 'v2';

function sign(value: string): string {
  return createHmac('sha256', SESSION_SECRET).update(`${SESSION_VERSION}:${value}`).digest('hex');
}

function memberSessionCookieName(cluster: ClusterSlug): string {
  return `member_session_${cluster}`;
}

export async function setMemberSession(cluster: ClusterSlug, employeeId: string): Promise<void> {
  const signature = sign(employeeId);
  const cookieStore = await cookies();
  cookieStore.set(memberSessionCookieName(cluster), `${employeeId}.${signature}`, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  // Logging in as a member drops any admin unlock — you are one or the other,
  // otherwise a member login would silently keep cluster-admin privileges.
  cookieStore.delete(clusterUnlockCookieName(cluster));
}

export async function clearMemberSession(cluster: ClusterSlug): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(memberSessionCookieName(cluster));
  // Log out resets the whole session, including any admin unlock
  cookieStore.delete(clusterUnlockCookieName(cluster));
}

export async function getMemberSession(cluster: ClusterSlug): Promise<{ employeeId: string } | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(memberSessionCookieName(cluster))?.value;
  if (!raw) return null;
  const [employeeId, signature] = raw.split('.');
  if (!employeeId || !signature) return null;
  if (sign(employeeId) !== signature) return null;
  return { employeeId };
}

export function clusterPasswordToken(cluster: ClusterSlug): string | null {
  const expected = process.env[CLUSTERS[cluster].passwordEnv];
  if (!expected) return null;
  return sign(`admin:${cluster}:${expected}`);
}

export async function isAdminUnlocked(cluster: ClusterSlug): Promise<boolean> {
  const token = clusterPasswordToken(cluster);
  if (!token) return false;
  const cookieStore = await cookies();
  return cookieStore.get(clusterUnlockCookieName(cluster))?.value === token;
}

export async function canEditEmployee(cluster: ClusterSlug, employeeId: string): Promise<boolean> {
  if (await isAdminUnlocked(cluster)) return true;
  const session = await getMemberSession(cluster);
  return session?.employeeId === employeeId;
}
