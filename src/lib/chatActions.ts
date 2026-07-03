'use server';

import { prisma } from './db';
import type { ClusterSlug } from './clusters';
import { getMemberSession, isAdminUnlocked } from './memberAuth';
import { displayName } from './analytics';

export type ChatMessageDTO = {
  id: string;
  senderId: string | null;
  senderName: string;
  senderPhoto: string | null;
  text: string;
  createdAt: string;
};

const MAX_TEXT = 2000;
const PAGE = 100;

/* Chat is piloting on the ADS cluster only */
function chatEnabled(cluster: ClusterSlug) {
  return cluster === 'ads';
}

async function canUseChat(cluster: ClusterSlug): Promise<boolean> {
  if (!chatEnabled(cluster)) return false;
  if (await isAdminUnlocked(cluster)) return true;
  return !!(await getMemberSession(cluster));
}

function toDTO(m: {
  id: string;
  senderId: string | null;
  senderName: string;
  text: string;
  createdAt: Date;
  sender: { photo: string | null } | null;
}): ChatMessageDTO {
  return {
    id: m.id,
    senderId: m.senderId,
    senderName: m.senderName,
    senderPhoto: m.sender?.photo ?? null,
    text: m.text,
    createdAt: m.createdAt.toISOString(),
  };
}

export async function getChatMessagesAction(
  cluster: ClusterSlug,
  sinceIso?: string,
): Promise<ChatMessageDTO[] | { error: string }> {
  if (!(await canUseChat(cluster))) return { error: 'Chat unavailable.' };
  const messages = await prisma.chatMessage.findMany({
    where: {
      cluster,
      ...(sinceIso ? { createdAt: { gt: new Date(sinceIso) } } : {}),
    },
    include: { sender: { select: { photo: true } } },
    orderBy: { createdAt: 'desc' },
    take: PAGE,
  });
  return messages.reverse().map(toDTO);
}

export async function sendChatMessageAction(
  cluster: ClusterSlug,
  text: string,
): Promise<ChatMessageDTO | { error: string }> {
  if (!(await canUseChat(cluster))) return { error: 'Chat unavailable.' };
  const trimmed = text.trim().slice(0, MAX_TEXT);
  if (!trimmed) return { error: 'Message is empty.' };

  // Identity is derived server-side: member session first, else admin
  const session = await getMemberSession(cluster);
  let senderId: string | null = null;
  let senderName = 'Supervisor';
  if (session) {
    const emp = await prisma.employee.findUnique({
      where: { id: session.employeeId },
      select: { id: true, name: true, nickname: true, cluster: true },
    });
    if (emp && emp.cluster === cluster) {
      senderId = emp.id;
      senderName = displayName(emp);
    }
  }

  const created = await prisma.chatMessage.create({
    data: { cluster, senderId, senderName, text: trimmed },
    include: { sender: { select: { photo: true } } },
  });
  return toDTO(created);
}
