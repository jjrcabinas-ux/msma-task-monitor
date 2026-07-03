'use client';

import { useEffect, useRef, useState } from 'react';
import type { ClusterSlug } from '@/lib/clusters';
import { getChatMessagesAction, sendChatMessageAction, type ChatMessageDTO } from '@/lib/chatActions';
import styles from './ChatWidget.module.css';

const POLL_MS = 4000;

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
  const listRef = useRef<HTMLDivElement>(null);
  const lastIsoRef = useRef<string | undefined>(undefined);

  function isMine(m: ChatMessageDTO) {
    if (viewerId) return m.senderId === viewerId;
    return isAdmin && m.senderId === null;
  }

  function appendNew(incoming: ChatMessageDTO[]) {
    if (incoming.length === 0) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const fresh = incoming.filter((m) => !seen.has(m.id));
      return fresh.length ? [...prev, ...fresh] : prev;
    });
    lastIsoRef.current = incoming[incoming.length - 1].createdAt;
  }

  // Load + poll while the panel is open
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function fetchMessages(initial: boolean) {
      const result = await getChatMessagesAction(cluster, initial ? undefined : lastIsoRef.current);
      if (cancelled || !Array.isArray(result)) return;
      if (initial) {
        setMessages(result);
        if (result.length) lastIsoRef.current = result[result.length - 1].createdAt;
      } else {
        appendNew(result);
      }
    }

    fetchMessages(true);
    const interval = setInterval(() => fetchMessages(false), POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [open, cluster]);

  // Stick to the bottom when messages change
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft('');
    const result = await sendChatMessageAction(cluster, text);
    if (result && 'id' in result) appendNew([result]);
    setSending(false);
  }

  return (
    <div className={styles.dock}>
      {open && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <span className={styles.headerTitle}>Team Chat</span>
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
      )}

      <button type="button" className={styles.fab} onClick={() => setOpen((v) => !v)} aria-label="Team chat">
        {open ? '×' : '💬'}
      </button>
    </div>
  );
}
