'use server';

import { prisma } from './db';
import type { ClusterSlug } from './clusters';
import { getMemberSession } from './memberAuth';
import { displayName } from './analytics';

/* MSMA Chat — Messenger-style DMs and group chats, per cluster.
   All actions require a member session in the cluster; identity is
   always derived server-side from the session. */

export type ChatMessageDTO = {
  id: string;
  senderId: string | null;
  senderName: string;
  senderPhoto: string | null;
  text: string;
  createdAt: string;
};

export type ConversationSummary = {
  id: string;
  isGroup: boolean;
  title: string;
  photo: string | null;
  lastText: string | null;
  lastSender: string | null;
  lastMine: boolean;
  lastAt: string | null;
  unread: number;
  /** true = message request awaiting the viewer's accept/decline */
  pending: boolean;
};

export type ChatContact = { id: string; name: string; nickname: string; photo: string | null; cluster: string };

const MAX_TEXT = 2000;
const PAGE = 100;

async function getViewer(cluster: ClusterSlug) {
  const session = await getMemberSession(cluster);
  if (!session) return null;
  const emp = await prisma.employee.findUnique({
    where: { id: session.employeeId },
    select: { id: true, name: true, nickname: true, cluster: true, photo: true },
  });
  if (!emp || emp.cluster !== cluster) return null;
  return emp;
}

async function getMembership(conversationId: string, employeeId: string) {
  return prisma.conversationMember.findUnique({
    where: { conversationId_employeeId: { conversationId, employeeId } },
    include: { conversation: true },
  });
}

/* Roster of possible chat partners — all clusters (cross-cluster DMs start
   as message requests on the recipient's side). Same-cluster people first. */
export async function getChatContactsAction(cluster: ClusterSlug): Promise<ChatContact[] | { error: string }> {
  const viewer = await getViewer(cluster);
  if (!viewer) return { error: 'Chat unavailable.' };
  const employees = await prisma.employee.findMany({
    where: { id: { not: viewer.id } },
    orderBy: [{ cluster: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, nickname: true, photo: true, cluster: true },
  });
  // Full name displayed; nickname kept for search matching
  return employees
    .sort((a, b) => Number(b.cluster === cluster) - Number(a.cluster === cluster))
    .map((e) => ({ id: e.id, name: e.name, nickname: e.nickname, photo: e.photo, cluster: e.cluster }));
}

/* Inbox: all conversations the viewer belongs to, newest activity first */
export async function listConversationsAction(cluster: ClusterSlug): Promise<ConversationSummary[] | { error: string }> {
  const viewer = await getViewer(cluster);
  if (!viewer) return { error: 'Chat unavailable.' };

  const memberships = await prisma.conversationMember.findMany({
    where: { employeeId: viewer.id },
    include: {
      conversation: {
        include: {
          members: { include: { employee: { select: { id: true, name: true, nickname: true, photo: true } } } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      },
    },
  });

  const summaries = await Promise.all(
    memberships.map(async (m) => {
      const c = m.conversation;
      const others = c.members.filter((cm) => cm.employeeId !== viewer.id);
      // DMs display the other member's full name
      const title = c.isGroup
        ? c.name || 'Group chat'
        : others[0]
          ? others[0].employee.name
          : 'Conversation';
      const photo = c.isGroup ? null : (others[0]?.employee.photo ?? null);
      const last = c.messages[0] ?? null;
      const unread = await prisma.chatMessage.count({
        where: {
          conversationId: c.id,
          createdAt: { gt: m.lastReadAt },
          NOT: { senderId: viewer.id },
        },
      });
      return {
        id: c.id,
        isGroup: c.isGroup,
        title,
        photo,
        lastText: last?.text ?? null,
        lastSender: last ? (last.senderId === viewer.id ? 'You' : last.senderName) : null,
        lastMine: last?.senderId === viewer.id,
        lastAt: (last?.createdAt ?? c.lastMessageAt).toISOString(),
        unread,
        pending: !m.accepted,
        _sort: (last?.createdAt ?? c.lastMessageAt).getTime(),
      };
    }),
  );

  return summaries
    .sort((a, b) => b._sort - a._sort)
    .map(({ _sort, ...rest }) => rest);
}

/* Open (or create) the 1:1 conversation with another member */
export async function openDirectConversationAction(
  cluster: ClusterSlug,
  otherEmployeeId: string,
): Promise<{ id: string } | { error: string }> {
  const viewer = await getViewer(cluster);
  if (!viewer) return { error: 'Chat unavailable.' };
  const other = await prisma.employee.findUnique({ where: { id: otherEmployeeId }, select: { cluster: true } });
  if (!other || otherEmployeeId === viewer.id) return { error: 'Member not found.' };

  const existing = await prisma.conversation.findFirst({
    where: {
      isGroup: false,
      AND: [
        { members: { some: { employeeId: viewer.id } } },
        { members: { some: { employeeId: otherEmployeeId } } },
      ],
    },
    select: { id: true },
  });
  if (existing) return { id: existing.id };

  const created = await prisma.conversation.create({
    data: {
      cluster,
      isGroup: false,
      members: {
        create: [
          { employeeId: viewer.id },
          // Cross-cluster DMs land as a message request on the recipient's side
          { employeeId: otherEmployeeId, accepted: other.cluster === cluster },
        ],
      },
    },
    select: { id: true },
  });
  return { id: created.id };
}

/* Create a group chat with a name and selected members */
export async function createGroupConversationAction(
  cluster: ClusterSlug,
  name: string,
  memberIds: string[],
): Promise<{ id: string } | { error: string }> {
  const viewer = await getViewer(cluster);
  if (!viewer) return { error: 'Chat unavailable.' };
  const groupName = name.trim().slice(0, 60);
  if (!groupName) return { error: 'Group name is required.' };

  const uniqueIds = Array.from(new Set(memberIds.filter((id) => id !== viewer.id)));
  if (uniqueIds.length === 0) return { error: 'Select at least one member.' };
  const selected = await prisma.employee.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, cluster: true },
  });
  if (selected.length !== uniqueIds.length) return { error: 'Some selected members were not found.' };

  const created = await prisma.conversation.create({
    data: {
      cluster,
      isGroup: true,
      name: groupName,
      members: {
        create: [
          { employeeId: viewer.id },
          // Cross-cluster invitees get the group as a message request
          ...selected.map((e) => ({ employeeId: e.id, accepted: e.cluster === cluster })),
        ],
      },
    },
    select: { id: true },
  });
  return { id: created.id };
}

/* Accept a message request */
export async function acceptConversationAction(
  cluster: ClusterSlug,
  conversationId: string,
): Promise<{ ok: true } | { error: string }> {
  const viewer = await getViewer(cluster);
  if (!viewer) return { error: 'Chat unavailable.' };
  const membership = await getMembership(conversationId, viewer.id);
  if (!membership) return { error: 'Conversation not found.' };
  await prisma.conversationMember.update({
    where: { conversationId_employeeId: { conversationId, employeeId: viewer.id } },
    data: { accepted: true },
  });
  return { ok: true };
}

/* Decline a message request: DMs are deleted entirely; group invites just
   remove the viewer's membership. */
export async function declineConversationAction(
  cluster: ClusterSlug,
  conversationId: string,
): Promise<{ ok: true } | { error: string }> {
  const viewer = await getViewer(cluster);
  if (!viewer) return { error: 'Chat unavailable.' };
  const membership = await getMembership(conversationId, viewer.id);
  if (!membership) return { error: 'Conversation not found.' };
  if (membership.accepted) return { error: 'Conversation already accepted.' };

  if (membership.conversation.isGroup) {
    await prisma.conversationMember.delete({
      where: { conversationId_employeeId: { conversationId, employeeId: viewer.id } },
    });
  } else {
    await prisma.conversation.delete({ where: { id: conversationId } });
  }
  return { ok: true };
}

/* Messages of one conversation; also marks it read for the viewer */
export async function getConversationMessagesAction(
  cluster: ClusterSlug,
  conversationId: string,
): Promise<{ title: string; isGroup: boolean; pending: boolean; messages: ChatMessageDTO[] } | { error: string }> {
  const viewer = await getViewer(cluster);
  if (!viewer) return { error: 'Chat unavailable.' };
  const membership = await getMembership(conversationId, viewer.id);
  if (!membership) return { error: 'Conversation not found.' };

  const [conversation, messages] = await Promise.all([
    prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { members: { include: { employee: { select: { id: true, name: true, nickname: true } } } } },
    }),
    prisma.chatMessage.findMany({
      where: { conversationId },
      include: { sender: { select: { photo: true } } },
      orderBy: { createdAt: 'desc' },
      take: PAGE,
    }),
  ]);
  if (!conversation) return { error: 'Conversation not found.' };

  await prisma.conversationMember.update({
    where: { conversationId_employeeId: { conversationId, employeeId: viewer.id } },
    data: { lastReadAt: new Date() },
  });

  const others = conversation.members.filter((m) => m.employeeId !== viewer.id);
  const title = conversation.isGroup
    ? conversation.name || 'Group chat'
    : others[0]
      ? others[0].employee.name
      : 'Conversation';

  return {
    title,
    isGroup: conversation.isGroup,
    pending: !membership.accepted,
    messages: messages.reverse().map((m) => ({
      id: m.id,
      senderId: m.senderId,
      senderName: m.senderName,
      senderPhoto: m.sender?.photo ?? null,
      text: m.text,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

export async function sendMessageAction(
  cluster: ClusterSlug,
  conversationId: string,
  text: string,
): Promise<ChatMessageDTO | { error: string }> {
  const viewer = await getViewer(cluster);
  if (!viewer) return { error: 'Chat unavailable.' };
  const membership = await getMembership(conversationId, viewer.id);
  if (!membership) return { error: 'Conversation not found.' };
  if (!membership.accepted) return { error: 'Accept the message request first.' };

  const trimmed = text.trim().slice(0, MAX_TEXT);
  if (!trimmed) return { error: 'Message is empty.' };

  const created = await prisma.chatMessage.create({
    data: {
      conversationId,
      senderId: viewer.id,
      senderName: displayName(viewer),
      text: trimmed,
    },
  });
  await Promise.all([
    prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: created.createdAt } }),
    prisma.conversationMember.update({
      where: { conversationId_employeeId: { conversationId, employeeId: viewer.id } },
      data: { lastReadAt: created.createdAt },
    }),
  ]);

  return {
    id: created.id,
    senderId: created.senderId,
    senderName: created.senderName,
    senderPhoto: viewer.photo,
    text: created.text,
    createdAt: created.createdAt.toISOString(),
  };
}
