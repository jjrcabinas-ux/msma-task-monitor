'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import type { ClusterSlug } from '@/lib/clusters';
import { getChatMessagesAction, sendChatMessageAction, type ChatMessageDTO } from '@/lib/chatActions';
import styles from './ChatWidget.module.css';

const POLL_OPEN_MS = 4000;
const POLL_CLOSED_MS = 10000;
const CHAT_TITLE = 'MSMA ADS Cluster';

function timeLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return sameDay ? time : `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${time}`;
}

export default function ChatWidget({
  cluster,
  viewerId,
  isAdmin,
}: {
  cluster: ClusterSlug;
  viewerId: string | null;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessageDTO[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [lastReadIso, setLastReadIso] = useState<string>('');
  const listRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(open);
  openRef.current = open;

  const readKey = `chat_last_read_${cluster}_${viewerId ?? 'admin'}`;

  function isMine(m: ChatMessageDTO) {
    if (viewerId) return m.senderId === viewerId;
    return isAdmin && m.senderId === null;
  }

  function markRead(msgs: ChatMessageDTO[]) {
    const newest = msgs[msgs.length - 1]?.createdAt;
    if (!newest) return;
    setLastReadIso((prev) => {
      const next = newest > prev ? newest : prev;
      try { localStorage.setItem(readKey, next); } catch {}
      return next;
    });
  }

  // Load stored read marker once
  useEffect(() => {
    try { setLastReadIso(localStorage.getItem(readKey) ?? ''); } catch {}
  }, [readKey]);

  // Single polling loop; faster while open. Runs even when closed so the
  // unread badge and preview stay current.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function tick() {
      const result = await getChatMessagesAction(cluster);
      if (cancelled) return;
      if (Array.isArray(result)) {
        setMessages(result);
        if (openRef.current) markRead(result);
      }
      timer = setTimeout(tick, openRef.current ? POLL_OPEN_MS : POLL_CLOSED_MS);
    }

    tick();
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cluster, open]);

  // Opening marks everything read; stick to the bottom on changes
  useEffect(() => {
    if (open) markRead(messages);
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, open]);

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft('');
    const result = await sendChatMessageAction(cluster, text);
    if (result && 'id' in result) {
      setMessages((prev) => (prev.some((m) => m.id === result.id) ? prev : [...prev, result]));
      markRead([result]);
    }
    setSending(false);
  }

  const unread = messages.filter((m) => !isMine(m) && m.createdAt > lastReadIso).length;
  const last = messages[messages.length - 1];
  const preview = last
    ? `${isMine(last) ? 'You' : last.senderName}: ${last.text}`
    : 'No messages yet';

  return (
    <div className={styles.dock}>
      {open ? (
        <div className={styles.panel}>
          <div className={styles.header}>
            <span className={styles.headerLogo}>
              <Image src="/logo.png" alt="MSMA" width={26} height={26} className={styles.headerLogoImg} />
            </span>
            <span className={styles.headerTitle}>{CHAT_TITLE}</span>
            <button type="button" className={styles.headerClose} onClick={() => setOpen(false)} aria-label="Close chat">
              ×
            </button>
          </div>

          <div className={styles.list} ref={listRef}>
            {messages.length === 0 && <div className={styles.empty}>No messages yet — say hi! 👋</div>}
            {messages.map((m, i) => {
              const mine = isMine(m);
              const prev = messages[i - 1];
              const showMeta = !prev || prev.senderId !== m.senderId || prev.senderName !== m.senderName;
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
        </div>
      ) : (
        <button type="button" className={styles.convoCard} onClick={() => setOpen(true)} aria-label="Open team chat">
          <span className={styles.convoAvatar}>
            <Image src="/logo.png" alt="MSMA" width={40} height={40} className={styles.convoAvatarImg} />
          </span>
          <span className={styles.convoBody}>
            <span className={`${styles.convoTitle} ${unread > 0 ? styles.convoUnread : ''}`}>{CHAT_TITLE}</span>
            <span className={`${styles.convoPreview} ${unread > 0 ? styles.convoUnread : ''}`}>
              {preview}
              {last ? ` · ${timeLabel(last.createdAt)}` : ''}
            </span>
          </span>
          {unread > 0 && <span className={styles.unreadBadge}>{unread > 99 ? '99+' : unread}</span>}
        </button>
      )}
    </div>
  );
}
