'use client';

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import {
  dialogMediaSrc,
  formatDateRu,
  formatKzt,
  getDialog,
  markDialogSeen,
  type Channel,
  type DialogListItem,
  type DialogMessage,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { useUi } from '../lib/ui';
import { dialogTitle } from './Dialogs';

const POLL_MS = 4000;

/** Clock inside a bubble — always Almaty, so it matches the guest's WhatsApp. */
function clock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Asia/Almaty',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Almaty',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

const URL_RE = /(https?:\/\/[^\s<>"']+)/g;

/** Render text with clickable links. WhatsApp `*bold*` is left as the guest saw it. */
function withLinks(text: string) {
  return text.split(URL_RE).map((part, i) =>
    URL_RE.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="bbl-link">
        {part}
      </a>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

function PayCard({ meta }: { meta: NonNullable<DialogMessage['meta']> }) {
  if (!meta.url) return null;
  return (
    <a className="pay-card" href={meta.url} target="_blank" rel="noopener noreferrer">
      <span className="pay-t">
        Kaspi · {meta.kind === 'stay' ? 'остаток за проживание' : 'депозит / бронь'}
      </span>
      {typeof meta.amount === 'number' ? <span className="pay-a">{formatKzt(meta.amount)}</span> : null}
      <span className="pay-u trunc">{meta.url.replace(/^https?:\/\//, '')}</span>
      <span className="pay-go">открыть ссылку</span>
    </a>
  );
}

export function DialogThread({
  chatId,
  preloaded,
  onBack,
}: {
  chatId: string;
  preloaded?: DialogListItem | undefined;
  onBack: () => void;
}) {
  const { token } = useAuth();
  const { openDrawer } = useUi();

  const [messages, setMessages] = useState<DialogMessage[] | null>(null);
  const [chat, setChat] = useState<{
    channel?: Channel;
    guestName?: string;
    guestUsername?: string;
    guestPhone: string;
    booking?: DialogListItem['booking'];
  } | null>(preloaded ? { ...preloaded } : null);
  const [err, setErr] = useState('');
  const [lightbox, setLightbox] = useState<{ items: string[]; index: number } | null>(null);

  const scroller = useRef<HTMLDivElement | null>(null);
  /** Stick to the bottom only when the owner is already there (WhatsApp rule). */
  const atBottom = useRef(true);
  const lastCount = useRef(0);

  const load = useCallback(
    async (quiet: boolean) => {
      if (!token) return;
      try {
        const res = await getDialog(token, chatId);
        setMessages(res.messages);
        setChat(res.chat);
        setErr('');
      } catch (e) {
        if (!quiet) setErr(e instanceof Error ? e.message : 'Не удалось открыть диалог');
      }
    },
    [token, chatId],
  );

  useEffect(() => {
    setMessages(null);
    atBottom.current = true;
    lastCount.current = 0;
    void load(false);
    if (token) void markDialogSeen(token, chatId).catch(() => {});
  }, [load, token, chatId]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load(true);
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  // Anchor to the newest message on open and on genuinely new arrivals — but
  // never yank the view while the owner is reading back through history.
  useEffect(() => {
    const el = scroller.current;
    if (!el || !messages) return;
    const grew = messages.length > lastCount.current;
    const first = lastCount.current === 0;
    lastCount.current = messages.length;
    if (first || (grew && atBottom.current)) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  };

  // Lightbox arrows, plus Esc to close.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowRight') {
        setLightbox((s) => (s ? { ...s, index: (s.index + 1) % s.items.length } : s));
      }
      if (e.key === 'ArrowLeft') {
        setLightbox((s) => (s ? { ...s, index: (s.index - 1 + s.items.length) % s.items.length } : s));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  const booking = chat?.booking;
  const title = chat ? dialogTitle({ ...chat, guestPhone: chat.guestPhone }) : chatId;

  let lastDay = '';

  return (
    <div className="dlg-thread">
      <header className="dlg-head">
        <button type="button" className="dlg-back" onClick={onBack} aria-label="Назад к списку">
          ‹
        </button>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="dlg-head-n trunc">{title}</div>
          <div className="dlg-head-s mono trunc">
            {/* On Telegram guestPhone is really the @username — we never learn
                the number, so labelling the channel keeps it honest. */}
            {chat?.channel === 'telegram' ? 'TG · ' : ''}
            {chat?.guestPhone ?? ''}
            {booking ? ` · ${formatDateRu(booking.checkIn)} – ${formatDateRu(booking.checkOut)}` : ''}
          </div>
        </div>
        {booking ? (
          <button
            className="btn btn-xs"
            onClick={() =>
              openDrawer({
                mode: 'edit',
                propertyId: '',
                checkIn: booking.checkIn,
                checkOut: booking.checkOut,
                eventId: booking.id,
                kind: 'booking',
              })
            }
          >
            Открыть бронь
          </button>
        ) : null}
      </header>

      {err && (
        <div className="err-box" style={{ margin: 12 }}>
          <span className="err-dot" />
          {err}
        </div>
      )}

      <div className="dlg-feed" ref={scroller} onScroll={onScroll}>
        <div className="dlg-feed-in">
          {messages === null ? (
            Array.from({ length: 4 }, (_, i) => (
              <div
                key={i}
                className="skel"
                style={{
                  height: 34,
                  width: i % 2 ? '52%' : '64%',
                  borderRadius: 12,
                  alignSelf: i % 2 ? 'flex-end' : 'flex-start',
                }}
              />
            ))
          ) : messages.length === 0 ? (
            <div className="dlg-none">
              <b>Пока пусто</b>
            </div>
          ) : (
            messages.map((m) => {
              const day = dayKey(m.at);
              const newDay = day && day !== lastDay;
              if (newDay) lastDay = day;

              const photos = m.media?.items.map((i) => dialogMediaSrc(i.url, token ?? '')) ?? [];
              const caption = m.media?.items.find((i) => i.caption)?.caption;
              const isGuest = m.role === 'guest';

              return (
                <Fragment key={m.id}>
                  {newDay ? <div className="dlg-day">{formatDateRu(day)}</div> : null}

                  {m.meta?.type === 'dialog_split' ? (
                    <div className="dlg-sys">Новый диалог · {formatDateRu(day)}</div>
                  ) : m.role === 'system' ? (
                    m.text ? <div className="dlg-sys">{m.text}</div> : null
                  ) : (
                    <div
                      className={`bbl ${isGuest ? 'bbl-in' : 'bbl-out'}${
                        m.role === 'owner' ? ' bbl-owner' : ''
                      }`}
                    >
                      {photos.length > 0 ? (
                        <>
                          {caption ? <div className="bbl-cap">{caption}</div> : null}
                          <div className={`bbl-photos${photos.length > 1 ? ' multi' : ''}`}>
                            {photos.map((src, i) => (
                              <button
                                key={src}
                                type="button"
                                className="bbl-ph"
                                onClick={() => setLightbox({ items: photos, index: i })}
                              >
                                {/* Plain <img>: these are remote/auth'd URLs, not
                                    build-time assets, so next/image adds nothing. */}
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={src}
                                  alt=""
                                  loading="lazy"
                                  // A photo deleted from the apartment since it
                                  // was sent shouldn't leave a broken-icon box.
                                  onError={(e) => {
                                    e.currentTarget.closest('.bbl-ph')?.classList.add('gone');
                                  }}
                                  // An image finishing after render grows the
                                  // feed; re-anchor so the newest message stays
                                  // in view instead of sliding below the fold.
                                  onLoad={() => {
                                    const el = scroller.current;
                                    if (el && atBottom.current) el.scrollTop = el.scrollHeight;
                                  }}
                                />
                              </button>
                            ))}
                          </div>
                        </>
                      ) : null}

                      {(() => {
                        const t = m.text?.trim();
                        if (!t) return null;
                        // Don't repeat the caption above its own photos, and
                        // don't print the raw URL above the payment card that
                        // already shows it.
                        if (photos.length > 0 && t === caption?.trim()) return null;
                        // Inbound photos arrive as "[гость прислал фото] <caption>";
                        // the caption is already shown above the image.
                        if (photos.length > 0 && caption) {
                          const stripped = t.replace(/^\[.*?\]\s*/, '').trim();
                          if (stripped === caption.trim()) return null;
                        }
                        const body =
                          m.meta?.type === 'pay_link' && m.meta.url
                            ? t.replace(m.meta.url, '').replace(/[\s:—-]+$/, '').trim()
                            : t;
                        return body ? <div className="bbl-tx">{withLinks(body)}</div> : null;
                      })()}

                      {m.meta?.type === 'pay_link' ? <PayCard meta={m.meta} /> : null}

                      <div className="bbl-t mono">{clock(m.at)}</div>
                    </div>
                  )}
                </Fragment>
              );
            })
          )}
        </div>
      </div>

      {lightbox ? (
        <div className="lb" onClick={() => setLightbox(null)} role="presentation">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox.items[lightbox.index]} alt="" onClick={(e) => e.stopPropagation()} />
          {lightbox.items.length > 1 ? (
            <>
              <button
                type="button"
                className="lb-nav l"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((s) =>
                    s ? { ...s, index: (s.index - 1 + s.items.length) % s.items.length } : s,
                  );
                }}
              >
                ‹
              </button>
              <button
                type="button"
                className="lb-nav r"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((s) => (s ? { ...s, index: (s.index + 1) % s.items.length } : s));
                }}
              >
                ›
              </button>
            </>
          ) : null}
          <button type="button" className="lb-x" onClick={() => setLightbox(null)}>
            ×
          </button>
        </div>
      ) : null}
    </div>
  );
}
