'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import type { ClusterSlug } from '@/lib/clusters';
import {
  getChatContactsAction,
  listConversationsAction,
  openDirectConversationAction,
  createGroupConversationAction,
  getConversationMessagesAction,
  sendMessageAction,
  type ChatMessageDTO,
  type ConversationSummary,
  type ChatContact,
} from '@/lib/chatActions';
import styles from './ChatWidget.module.css';

const POLL_CONVO_MS = 4000;
const POLL_LIST_MS = 8000;
const POLL_CLOSED_MS = 12000;
const CHAT_TITLE = 'MSMA Chat';

type View = 'list' | 'compose' | 'convo';

function timeLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return sameDay ? time : `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${time}`;
}

function Avatar({ photo, letter, size = 38 }: { photo: string | null; letter: string; size?: number }) {
  return (
    <span className={styles.avatar} style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" className={styles.avatarImg} />
      ) : (
        letter
      )}
    </span>
  );
}

export default function ChatWidget({ cluster, viewerId }: { cluster: ClusterSlug; viewerId: string }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('list');
  const [convos, setConvos] = useState<ConversationSummary[]>([]);
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState('');
  const [messages, setMessages] = useState<ChatMessageDTO[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  // Group creation state
  const [groupMode, setGroupMode] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [convoSearch, setConvoSearch] = useState('');
  const [showConvoSearch, setShowConvoSearch] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ open, view, activeId });
  stateRef.current = { open, view, activeId };

  const refreshConvos = useCallback(async () => {
    const result = await listConversationsAction(cluster);
    if (Array.isArray(result)) setConvos(result);
  }, [cluster]);

  const refreshMessages = useCallback(async (conversationId: string) => {
    const result = await getConversationMessagesAction(cluster, conversationId);
    if ('messages' in result) {
      setMessages(result.messages);
      setActiveTitle(result.title);
    }
  }, [cluster]);

  // One polling loop for everything; cadence depends on what's on screen
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function tick() {
      const s = stateRef.current;
      if (s.open && s.view === 'convo' && s.activeId) {
        await refreshMessages(s.activeId);
      } else {
        await refreshConvos();
      }
      if (cancelled) return;
      const delay = !s.open ? POLL_CLOSED_MS : s.view === 'convo' ? POLL_CONVO_MS : POLL_LIST_MS;
      timer = setTimeout(tick, delay);
    }

    tick();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [cluster, open, view, activeId, refreshConvos, refreshMessages]);

  // Stick to the bottom of the thread
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, view]);

  const loadContacts = useCallback(async () => {
    const result = await getChatContactsAction(cluster);
    if (Array.isArray(result)) setContacts(result);
  }, [cluster]);

  async function openConvo(id: string) {
    setActiveId(id);
    setMessages([]);
    setConvoSearch('');
    setShowConvoSearch(false);
    setView('convo');
    await refreshMessages(id);
    refreshConvos();
  }

  async function openCompose() {
    setGroupMode(false);
    setGroupName('');
    setGroupIds([]);
    setView('compose');
    loadContacts();
  }

  async function startDm(otherId: string) {
    const result = await openDirectConversationAction(cluster, otherId);
    if ('id' in result) await openConvo(result.id);
  }

  async function createGroup() {
    if (creating || !groupName.trim() || groupIds.length === 0) return;
    setCreating(true);
    const result = await createGroupConversationAction(cluster, groupName, groupIds);
    setCreating(false);
    if ('id' in result) await openConvo(result.id);
  }

  async function send() {
    const text = draft.trim();
    if (!text || sending || !activeId) return;
    setSending(true);
    setDraft('');
    const result = await sendMessageAction(cluster, activeId, text);
    if (result && 'id' in result) {
      setMessages((prev) => (prev.some((m) => m.id === result.id) ? prev : [...prev, result]));
    }
    setSending(false);
  }

  const totalUnread = convos.reduce((sum, c) => sum + c.unread, 0);
  const q = search.trim().toLowerCase();
  const filteredConvos = q ? convos.filter((c) => c.title.toLowerCase().includes(q)) : convos;
  // Members matching by full name OR nickname, to start a new chat from search
  const matchingContacts = q
    ? contacts.filter((p) => p.name.toLowerCase().includes(q) || p.nickname.toLowerCase().includes(q))
    : [];
  const cq = convoSearch.trim().toLowerCase();
  const visibleMessages = cq ? messages.filter((m) => m.text.toLowerCase().includes(cq)) : messages;
  const latest = convos[0] ?? null;
  const cardPreview = latest?.lastText
    ? `${latest.lastSender}: ${latest.lastText}`
    : 'Start a conversation';

  /* ── Closed: Messenger-style conversation card ── */
  if (!open) {
    return (
      <div className={styles.dock}>
        <button type="button" className={styles.convoCard} onClick={() => { setOpen(true); setView('list'); refreshConvos(); loadContacts(); }} aria-label="Open MSMA Chat">
          <span className={styles.convoAvatar}>
            <Image src="/logo.png" alt="MSMA" width={40} height={40} className={styles.convoAvatarImg} />
          </span>
          <span className={styles.convoBody}>
            <span className={`${styles.convoTitle} ${totalUnread > 0 ? styles.convoUnreadText : ''}`}>{CHAT_TITLE}</span>
            <span className={`${styles.convoPreview} ${totalUnread > 0 ? styles.convoUnreadText : ''}`}>
              {cardPreview}
              {latest?.lastAt ? ` · ${timeLabel(latest.lastAt)}` : ''}
            </span>
          </span>
          {totalUnread > 0 && <span className={styles.unreadBadge}>{totalUnread > 99 ? '99+' : totalUnread}</span>}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.dock}>
      <div className={styles.panel}>
        {/* Messenger-style header: banner click minimizes; back arrow inside views */}
        <div
          className={styles.header}
          onClick={() => setOpen(false)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setOpen(false)}
          title="Minimize chat"
        >
          {view !== 'list' && (
            <button
              type="button"
              className={styles.iconBtn}
              onClick={(e) => { e.stopPropagation(); setView('list'); setActiveId(null); refreshConvos(); }}
              aria-label="Back to conversations"
            >
              ‹
            </button>
          )}
          <span className={styles.headerTitle}>
            {view === 'convo' ? activeTitle || 'Chats' : view === 'compose' ? 'New message' : 'Chats'}
          </span>
          {view === 'list' && (
            <button
              type="button"
              className={styles.iconBtn}
              onClick={(e) => { e.stopPropagation(); openCompose(); }}
              title="New message or group"
              aria-label="New message"
            >
              ✎
            </button>
          )}
          {view === 'convo' && (
            <button
              type="button"
              className={`${styles.iconBtn} ${showConvoSearch ? styles.iconBtnActive : ''}`}
              onClick={(e) => { e.stopPropagation(); setShowConvoSearch((v) => !v); setConvoSearch(''); }}
              title="Search in conversation"
              aria-label="Search in conversation"
            >
              🔍
            </button>
          )}
          <button
            type="button"
            className={styles.iconBtn}
            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
            aria-label="Close chat"
          >
            ×
          </button>
        </div>

        {/* Search bar (inbox: chats + members) */}
        {view === 'list' && (
          <div className={styles.searchWrap} onClick={(e) => e.stopPropagation()}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              className={styles.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Chats"
            />
          </div>
        )}

        {/* Search bar (inside a conversation) */}
        {view === 'convo' && showConvoSearch && (
          <div className={styles.searchWrap} onClick={(e) => e.stopPropagation()}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              autoFocus
              className={styles.searchInput}
              value={convoSearch}
              onChange={(e) => setConvoSearch(e.target.value)}
              placeholder="Search in conversation"
            />
            {cq && <span className={styles.searchCount}>{visibleMessages.length}</span>}
          </div>
        )}

        {/* ── Inbox ── */}
        {view === 'list' && (
          <div className={styles.inbox}>
            {q && filteredConvos.length === 0 && matchingContacts.length === 0 && (
              <div className={styles.empty}>No chats or members match “{search}”.</div>
            )}
            {convos.length === 0 && (
              <div className={styles.empty}>
                No conversations yet.
                <button type="button" className={styles.emptyCta} onClick={openCompose}>Start one ✎</button>
              </div>
            )}
            {filteredConvos.map((c) => (
              <button key={c.id} type="button" className={styles.inboxRow} onClick={() => openConvo(c.id)}>
                {c.isGroup ? (
                  <span className={styles.avatar} style={{ width: 38, height: 38, fontSize: 17 }}>👥</span>
                ) : (
                  <Avatar photo={c.photo} letter={c.title[0] ?? '?'} />
                )}
                <span className={styles.inboxBody}>
                  <span className={`${styles.inboxTitle} ${c.unread > 0 ? styles.convoUnreadText : ''}`}>{c.title}</span>
                  <span className={`${styles.inboxPreview} ${c.unread > 0 ? styles.convoUnreadText : ''}`}>
                    {c.lastText ? `${c.lastSender}: ${c.lastText}` : 'No messages yet'}
                    {c.lastAt && c.lastText ? ` · ${timeLabel(c.lastAt)}` : ''}
                  </span>
                </span>
                {c.unread > 0 && <span className={styles.unreadBadge}>{c.unread > 99 ? '99+' : c.unread}</span>}
              </button>
            ))}

            {/* Members matching the search — start a new chat directly */}
            {matchingContacts.length > 0 && (
              <>
                <div className={styles.searchSection}>Members</div>
                {matchingContacts.map((p) => (
                  <button key={p.id} type="button" className={styles.inboxRow} onClick={() => startDm(p.id)}>
                    <Avatar photo={p.photo} letter={p.name[0]} size={32} />
                    <span className={styles.inboxBody}>
                      <span className={styles.inboxTitle}>{p.name}</span>
                      {p.nickname.trim() && <span className={styles.inboxPreview}>{p.nickname}</span>}
                    </span>
                  </button>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── Compose: pick a person or build a group ── */}
        {view === 'compose' && (
          <div className={styles.inbox}>
            <div className={styles.composeSwitch}>
              <button
                type="button"
                className={`${styles.composeTab} ${!groupMode ? styles.composeTabActive : ''}`}
                onClick={() => setGroupMode(false)}
              >
                Direct message
              </button>
              <button
                type="button"
                className={`${styles.composeTab} ${groupMode ? styles.composeTabActive : ''}`}
                onClick={() => setGroupMode(true)}
              >
                Create group
              </button>
            </div>

            {groupMode && (
              <input
                className={styles.groupNameInput}
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Group name…"
                maxLength={60}
              />
            )}

            {contacts.map((p) =>
              groupMode ? (
                <label key={p.id} className={styles.inboxRow}>
                  <input
                    type="checkbox"
                    className={styles.groupCheck}
                    checked={groupIds.includes(p.id)}
                    onChange={() =>
                      setGroupIds((ids) => (ids.includes(p.id) ? ids.filter((x) => x !== p.id) : [...ids, p.id]))
                    }
                  />
                  <Avatar photo={p.photo} letter={p.name[0]} size={32} />
                  <span className={styles.inboxTitle}>{p.name}</span>
                </label>
              ) : (
                <button key={p.id} type="button" className={styles.inboxRow} onClick={() => startDm(p.id)}>
                  <Avatar photo={p.photo} letter={p.name[0]} size={32} />
                  <span className={styles.inboxTitle}>{p.name}</span>
                </button>
              ),
            )}

            {groupMode && (
              <button
                type="button"
                className={styles.createGroupBtn}
                onClick={createGroup}
                disabled={creating || !groupName.trim() || groupIds.length === 0}
              >
                Create group ({groupIds.length} selected)
              </button>
            )}
          </div>
        )}

        {/* ── Conversation thread ── */}
        {view === 'convo' && (
          <>
            <div className={styles.list} ref={listRef}>
              {messages.length === 0 && <div className={styles.empty}>No messages yet — say hi! 👋</div>}
              {cq && visibleMessages.length === 0 && messages.length > 0 && (
                <div className={styles.empty}>No messages match “{convoSearch}”.</div>
              )}
              {visibleMessages.map((m, i) => {
                const mine = m.senderId === viewerId;
                const prev = visibleMessages[i - 1];
                const showMeta = !prev || prev.senderId !== m.senderId;
                return (
                  <div key={m.id} className={`${styles.msgRow} ${mine ? styles.msgRowMine : ''}`}>
                    {!mine && (
                      <span className={styles.msgAvatar}>
                        {m.senderPhoto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.senderPhoto} alt="" className={styles.msgAvatarImg} />
                        ) : (
                          m.senderName[0]
                        )}
                      </span>
                    )}
                    <div className={styles.msgBody}>
                      {!mine && showMeta && <div className={styles.msgName}>{m.senderName}</div>}
                      <div className={`${styles.bubble} ${mine ? styles.bubbleMine : ''}`} title={timeLabel(m.createdAt)}>
                        {m.text}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={styles.inputRow}>
              <input
                className={styles.input}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
                placeholder="Type a message…"
                maxLength={2000}
              />
              <button type="button" className={styles.sendBtn} onClick={send} disabled={sending || !draft.trim()}>
                ➤
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
