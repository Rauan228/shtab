'use client';

import { useEffect, useState } from 'react';
import {
  getSubscription,
  requestUpgrade,
  type Subscription,
  type UpgradeRequest,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { NotifySettings } from './NotifySettings';

const MONTHS = [
  'январь',
  'февраль',
  'март',
  'апрель',
  'май',
  'июнь',
  'июль',
  'август',
  'сентябрь',
  'октябрь',
  'ноябрь',
  'декабрь',
];

function periodTitle(label: string): string {
  const [y, m] = label.split('-');
  const mi = Number(m) - 1;
  if (!y || mi < 0 || mi > 11) return label;
  return `${MONTHS[mi]} ${y}`;
}

function money(n: number): string {
  return `${n.toLocaleString('ru-RU')} ₸`;
}

/** Days left in the current month, in the business timezone. */
function daysLeftInMonth(): number {
  const now = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Almaty',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const [y, m, d] = now.split('-').map(Number);
  if (!y || !m || !d) return 0;
  return new Date(Date.UTC(y, m, 0)).getUTCDate() - d;
}

function Meter({ used, max, warnAt = 0.8 }: { used: number; max: number; warnAt?: number }) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((used / max) * 100));
  const tone = used >= max ? 'over' : used / max >= warnAt ? 'warn' : '';
  return (
    <div className="meter-wrap">
      <div className={`meter ${tone}`}>
        <i style={{ width: `${pct}%` }} />
      </div>
      <div className="meter-lbl mono">
        {used} / {max}
      </div>
    </div>
  );
}

const STATUS_TEXT: Record<UpgradeRequest['status'], string> = {
  new: 'на рассмотрении',
  done: 'выполнена',
  rejected: 'отклонена',
};

export function Plan() {
  const { token } = useAuth();
  const [data, setData] = useState<Subscription | null>(null);
  const [err, setErr] = useState('');

  // Upgrade request form
  const [want, setWant] = useState(100);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState('');
  const [reqErr, setReqErr] = useState('');

  const load = () => {
    if (!token) return;
    getSubscription(token)
      .then(setData)
      .catch((e) => setErr(e instanceof Error ? e.message : 'Не удалось загрузить тариф'));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (err) {
    return (
      <div className="err-box">
        <span className="err-dot" />
        {err}
      </div>
    );
  }
  if (!data) return <div className="skel" style={{ height: 180 }} />;

  const d = data.usage.dialogs;
  const p = data.usage.properties;
  const dialogLeft = Math.max(0, d.max - d.used);
  const propsLeft = Math.max(0, p.max - p.used);
  const daysLeft = daysLeftInMonth();
  const openRequest = data.requests.find((r) => r.status === 'new');

  const send = async () => {
    if (!token) return;
    setBusy(true);
    setReqErr('');
    setSent('');
    try {
      await requestUpgrade(token, {
        kind: 'dialogs',
        amount: want,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      });
      setSent('Заявка отправлена. Свяжемся с вами и поднимем лимит.');
      setComment('');
      load();
    } catch (e) {
      setReqErr(e instanceof Error ? e.message : 'Не удалось отправить заявку');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="set">
      <div className="card card-pad plan-hero">
        <div>
          <div className="kicker">Подписка · {periodTitle(data.period.label)}</div>
          <div style={{ fontSize: 22, fontWeight: 600, marginTop: 6 }}>{data.plan.name}</div>
          <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 4 }}>{data.plan.forWhom}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="mono" style={{ fontSize: 22, fontWeight: 600 }}>
            {money(data.plan.priceKzt)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>/ мес</div>
          <div className={`badge ${data.org.status === 'active' ? 'badge-ok' : 'badge-warn'}`} style={{ marginTop: 8 }}>
            {data.org.status === 'active' ? 'активна' : data.org.status}
          </div>
        </div>
      </div>

      <div className="g2">
        <div className="card card-pad">
          <div style={{ fontSize: 13, fontWeight: 600 }}>Объекты</div>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '6px 0 10px' }}>
            {propsLeft > 0
              ? `Свободно ${propsLeft} мест. Скрытые квартиры не считаются.`
              : 'Все места заняты — скройте лишнюю квартиру или поднимите тариф.'}
          </div>
          <Meter used={p.used} max={p.max} />
        </div>
        <div className="card card-pad">
          <div style={{ fontSize: 13, fontWeight: 600 }}>Диалоги</div>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '6px 0 10px' }}>
            Осталось {dialogLeft}. Новый диалог считается, если гость молчал {data.idleDays} дней.
          </div>
          <Meter used={d.used} max={d.max} />
          <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 8 }}>
            В тарифе {d.included}
            {d.extra > 0 ? ` + добавлено ${d.extra}` : ''} · до конца месяца{' '}
            {daysLeft === 0 ? 'меньше дня' : `${daysLeft} дн.`}
          </div>
        </div>
      </div>

      {/* Where reminders go: limits, and every payment detail sent to a guest. */}
      <NotifySettings
        token={token ?? ''}
        notify={data.notify}
        botUsername={data.botUsername}
        onChanged={load}
      />

      {/* No payment gateway yet, so raising a limit is a request, not a purchase. */}
      <div className="card card-pad">
        <div style={{ fontSize: 13, fontWeight: 600 }}>Нужно больше диалогов</div>
        <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 6, lineHeight: 1.5 }}>
          Оставьте заявку — мы свяжемся, примем оплату переводом и поднимем лимит в этом же
          кабинете. Обычно в течение дня.
        </div>

        {openRequest ? (
          <div
            className="card card-pad"
            style={{ marginTop: 12, background: 'var(--soft)', border: 'none' }}
          >
            <div style={{ fontSize: 13, fontWeight: 500 }}>
              Заявка отправлена
              {openRequest.amount ? ` · +${openRequest.amount} диалогов` : ''}
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 4 }}>
              Статус: {STATUS_TEXT[openRequest.status]} · от{' '}
              {new Date(openRequest.createdAt).toLocaleDateString('ru-RU')}
            </div>
          </div>
        ) : (
          <>
            <div className="nights-row" style={{ marginTop: 12 }}>
              {[50, 100, 300].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={want === n ? 'on' : ''}
                  onClick={() => setWant(n)}
                >
                  +{n}
                </button>
              ))}
            </div>
            <label className="field" style={{ marginTop: 12 }}>
              <span>Комментарий (необяз.)</span>
              <input
                className="inp"
                placeholder="Ожидаем поток на выходных"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </label>
            <button
              className="btn btn-primary"
              style={{ marginTop: 12 }}
              disabled={busy}
              onClick={() => void send()}
            >
              {busy ? '…' : `Отправить заявку на +${want} диалогов`}
            </button>
          </>
        )}

        {sent && <div style={{ fontSize: 13, color: 'var(--brand-deep)', marginTop: 10 }}>{sent}</div>}
        {reqErr && (
          <div className="err-box" style={{ marginTop: 10 }}>
            <span className="err-dot" />
            {reqErr}
          </div>
        )}

        {data.requests.filter((r) => r.status !== 'new').length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div className="lbl">История заявок</div>
            <ul className="plan-list">
              {data.requests
                .filter((r) => r.status !== 'new')
                .map((r) => (
                  <li key={r.id}>
                    {r.amount ? `+${r.amount} диалогов` : `тариф ${r.plan ?? ''}`} ·{' '}
                    {STATUS_TEXT[r.status]} · {new Date(r.createdAt).toLocaleDateString('ru-RU')}
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
