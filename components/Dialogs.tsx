'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CHANNEL_LABEL,
  listDialogs,
  todayIso,
  type Channel,
  type DialogFilter,
  type DialogListItem,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { useUi } from '../lib/ui';
import { DialogThread } from './DialogThread';

/** How often the open tab re-reads the server. Matches §3.5 of the spec. */
const POLL_MS = 4000;

const FILTERS: { id: DialogFilter; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'live', label: 'Живые' },
  { id: 'awaiting_pay', label: 'Ждут оплату' },
  { id: 'today', label: 'Сегодня' },
];

/** "14:22" today, "вчера", else "14.08" — the cabinet's usual date shorthand. */
export function shortTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Almaty',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
  const today = todayIso();
  if (day === today) {
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Asia/Almaty',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  }
  const yesterday = new Date(`${today}T12:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  if (day === yesterday.toISOString().slice(0, 10)) return 'вчера';
  return `${day.slice(8, 10)}.${day.slice(5, 7)}`;
}

/** Row label: the name we know, else the phone. */
export function dialogTitle(d: { guestName?: string; guestPhone: string }): string {
  return d.guestName?.trim() || d.guestPhone;
}

function initial(label: string): string {
  const ch = label.replace(/[^\p{L}\p{N}]/gu, '').charAt(0);
  return ch ? ch.toUpperCase() : '#';
}

/** Booking chip — same wording the calendar uses for the payment stage. */
function bookingChip(b: NonNullable<DialogListItem['booking']>): string | null {
  if (b.status === 'cancelled') return null;
  const today = todayIso();
  if (b.checkIn <= today && today < b.checkOut) return 'живёт';
  switch (b.paymentPhase) {
    case 'stay_paid':
      return 'подтверждена';
    case 'deposit_paid':
    case 'awaiting_stay':
    case 'stay_claimed':
      return 'полная оплата';
    default:
      return 'депозит';
  }
}

export function Dialogs({ chatId }: { chatId?: string }) {
  const { token } = useAuth();
  const { href } = useUi();
  const router = useRouter();

  const [items, setItems] = useState<DialogListItem[] | null>(null);
  const [filter, setFilter] = useState<DialogFilter>('all');
  const [channel, setChannel] = useState<Channel | null>(null);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');
  /**
   * Which channels this owner actually uses. The channel row only appears once
   * both are in play — a WhatsApp-only pilot shouldn't see a filter with one
   * option, or badges on every single row.
   */
  const [seenChannels, setSeenChannels] = useState<Set<Channel>>(new Set());

  // Keep the latest query in a ref so the poll interval never restarts (and the
  // list never flashes) just because the owner typed a character.
  const params = useRef({ q, filter, channel });
  params.current = { q, filter, channel };

  const load = useCallback(
    async (quiet: boolean) => {
      if (!token) return;
      try {
        const { q: query, filter: f, channel: ch } = params.current;
        const res = await listDialogs(token, {
          q: query,
          filter: f,
          ...(ch ? { channel: ch } : {}),
        });
        setItems(res.dialogs);
        // Remember channels ever seen, so filtering to one doesn't hide the row
        // that let you filter in the first place.
        setSeenChannels((prev) => {
          const next = new Set(prev);
          for (const d of res.dialogs) next.add(d.channel);
          if (ch) next.add(ch);
          return next.size === prev.size ? prev : next;
        });
        setErr('');
      } catch (e) {
        // A failed background tick must not blank a list the owner is reading.
        if (!quiet) setErr(e instanceof Error ? e.message : 'Не удалось загрузить диалоги');
      }
    },
    [token],
  );

  useEffect(() => {
    void load(false);
  }, [load, filter]);

  // Debounce search: one request after typing settles, not one per keystroke.
  useEffect(() => {
    const t = window.setTimeout(() => void load(false), 250);
    return () => window.clearTimeout(t);
  }, [q, load]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') void load(true);
    };
    const id = window.setInterval(tick, POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const selected = useMemo(
    () => items?.find((d) => d.chatId === chatId),
    [items, chatId],
  );

  const open = (id: string) => router.push(href(`/dialogs/${id}`));

  return (
    <div className={`dlg-split${chatId ? ' has-thread' : ''}`}>
      <aside className="dlg-list">
        <div className="dlg-list-h">
          <input
            className="inp dlg-search"
            placeholder="Поиск по имени или номеру"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="dlg-filters">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`fbtn${filter === f.id ? ' on' : ''}`}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
          {/* Only worth showing once the owner actually has both messengers. */}
          {seenChannels.size > 1 && (
            <div className="dlg-filters">
              <button
                type="button"
                className={`fbtn${channel === null ? ' on' : ''}`}
                onClick={() => setChannel(null)}
              >
                Все каналы
              </button>
              <button
                type="button"
                className={`fbtn${channel === 'whatsapp' ? ' on' : ''}`}
                onClick={() => setChannel('whatsapp')}
              >
                WhatsApp
              </button>
              <button
                type="button"
                className={`fbtn${channel === 'telegram' ? ' on' : ''}`}
                onClick={() => setChannel('telegram')}
              >
                Telegram
              </button>
            </div>
          )}
        </div>

        {err && (
          <div className="err-box" style={{ margin: 10 }}>
            <span className="err-dot" />
            {err}
          </div>
        )}

        <div className="dlg-rows">
          {items === null ? (
            Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="dlg-row">
                <div className="skel" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                <div style={{ flex: 1 }}>
                  <div className="skel" style={{ height: 11, width: '48%' }} />
                  <div className="skel" style={{ height: 10, width: '76%', marginTop: 7 }} />
                </div>
              </div>
            ))
          ) : items.length === 0 ? (
            <div className="dlg-empty">
              <b>Нет диалогов</b>
              <span>Как только гость напишет в WhatsApp агента — чат появится здесь</span>
            </div>
          ) : (
            items.map((d) => {
              const label = dialogTitle(d);
              const chip = d.booking ? bookingChip(d.booking) : null;
              return (
                <button
                  key={d.chatId}
                  type="button"
                  className={`dlg-row${d.chatId === chatId ? ' on' : ''}`}
                  onClick={() => open(d.chatId)}
                >
                  <span className="dlg-ava">{initial(label)}</span>
                  <span className="dlg-row-body">
                    <span className="dlg-row-top">
                      <span className="dlg-name trunc">{label}</span>
                      <span className="dlg-time mono">{shortTime(d.lastAt)}</span>
                    </span>
                    <span className="dlg-row-bot">
                      <span className="dlg-prev trunc">{d.lastPreview || '—'}</span>
                      {d.unread ? <span className="dlg-dot" aria-label="новое" /> : null}
                    </span>
                    {(seenChannels.size > 1 || chip) && (
                      <span className="dlg-tags">
                        {seenChannels.size > 1 ? (
                          <span className={`ch-chip ch-${d.channel}`}>
                            {CHANNEL_LABEL[d.channel]}
                          </span>
                        ) : null}
                        {chip ? <span className="chip">{chip}</span> : null}
                      </span>
                    )}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <section className="dlg-pane">
        {chatId ? (
          <DialogThread chatId={chatId} preloaded={selected} onBack={() => router.push(href('/dialogs'))} />
        ) : (
          <div className="dlg-none">
            <b>Выберите диалог слева</b>
            <span>Здесь будет переписка агента с гостем</span>
          </div>
        )}
      </section>
    </div>
  );
}
