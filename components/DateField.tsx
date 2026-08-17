'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  addMonths,
  formatDateRu,
  formatMonthYear,
  nightsBetween,
  startOfMonth,
  todayIso,
} from '../lib/api';
import { monthCells, WD_MON } from '../lib/cal';
import { CalendarIcon, ChevronLeft, ChevronRight, XIcon } from './icons';

function formatDateFull(iso: string): string {
  const y = new Date(`${iso}T12:00:00Z`).getUTCFullYear();
  return `${formatDateRu(iso)} ${y}`;
}

export function DateField({
  label,
  value,
  onChange,
  min,
  rangeFrom,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  min?: string;
  /** Paint a stay range from this check-in when picking checkout. */
  rangeFrom?: string;
}) {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [month, setMonth] = useState(() => startOfMonth(value || todayIso()));
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => setReady(true), []);

  useEffect(() => {
    if (!open) return;
    setMonth(startOfMonth(value || min || todayIso()));
    setHover(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      setOpen(false);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, value, min]);

  const today = todayIso();
  const cells = monthCells(month);
  const rangeTo =
    rangeFrom && hover && hover > rangeFrom ? hover : rangeFrom && value && value > rangeFrom ? value : '';
  const nights = rangeFrom && rangeTo ? nightsBetween(rangeFrom, rangeTo) : 0;

  const pick = (iso: string) => {
    if (min && iso < min) return;
    onChange(iso);
    setOpen(false);
  };

  return (
    <div className="field" style={{ flex: 1, minWidth: 0 }}>
      <span>{label}</span>
      <button
        type="button"
        className={`date-field-btn${open ? ' open' : ''}${value ? '' : ' empty'}`}
        onClick={() => setOpen(true)}
      >
        <span>{value ? formatDateRu(value) : 'дата'}</span>
        <CalendarIcon size={15} />
      </button>
      {ready &&
        open &&
        createPortal(
          <div className="dp-root">
            <button type="button" className="dp-scrim" aria-label="Закрыть календарь" onClick={() => setOpen(false)} />
            <div className="dp-pop" role="dialog" aria-label={label}>
              <div className="dp-head">
                <div>
                  <div className="dp-lbl">{label}</div>
                  <div className="dp-picked">{value ? formatDateFull(value) : 'Выберите день'}</div>
                </div>
                <button type="button" className="btn btn-icon" aria-label="Закрыть" onClick={() => setOpen(false)}>
                  <XIcon size={16} />
                </button>
              </div>
              <div className="dp-nav">
                <button type="button" className="btn btn-icon" aria-label="Предыдущий месяц" onClick={() => setMonth((m) => addMonths(m, -1))}>
                  <ChevronLeft />
                </button>
                <div className="dp-month">{formatMonthYear(month)}</div>
                <button type="button" className="btn btn-icon" aria-label="Следующий месяц" onClick={() => setMonth((m) => addMonths(m, 1))}>
                  <ChevronRight />
                </button>
                <button type="button" className="btn btn-xs" onClick={() => setMonth(startOfMonth(today))}>
                  Сегодня
                </button>
              </div>
              <div className="dp-wd">
                {WD_MON.map((w) => (
                  <div key={w}>{w}</div>
                ))}
              </div>
              <div className="dp-grid">
                {cells.map((cell) => {
                  const disabled = !!(min && cell.iso < min && cell.iso !== rangeFrom);
                  const isToday = cell.iso === today;
                  const isVal = cell.iso === value;
                  const hasRange = !!(rangeFrom && rangeTo && rangeTo > rangeFrom);
                  const isFrom = !!(rangeFrom && cell.iso === rangeFrom);
                  const inRange = !!(hasRange && cell.iso > rangeFrom && cell.iso < rangeTo);
                  const isRangeEnd = !!(hasRange && cell.iso === rangeTo);
                  return (
                    <button
                      key={cell.iso}
                      type="button"
                      disabled={disabled}
                      className={[
                        'dp-day',
                        cell.inMonth ? '' : ' out',
                        isToday ? ' today' : '',
                        isVal ? ' on' : '',
                        isFrom ? ' from' : '',
                        inRange ? ' in' : '',
                        isRangeEnd ? ' to' : '',
                        hasRange ? ' range' : '',
                      ].join('')}
                      onMouseEnter={() => setHover(cell.iso)}
                      onMouseLeave={() => setHover(null)}
                      onClick={() => pick(cell.iso)}
                    >
                      {cell.num}
                    </button>
                  );
                })}
              </div>
              <div className="dp-foot">
                {nights > 0
                  ? `${nights} ${nights === 1 ? 'ночь' : nights < 5 ? 'ночи' : 'ночей'}`
                  : 'Нажмите день, чтобы выбрать'}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
