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

const PLAN_CHOICES = [
  { id: 'start', label: 'Старт · 4 квартиры' },
  { id: 'business', label: 'Бизнес · 15 квартир' },
  { id: 'pro', label: 'Про · 30 квартир' },
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

  const [wantPlan, setWantPlan] = useState('business');
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

  const p = data.usage.properties;
  const dialogsUsed = data.usage.dialogs.used;
  const unlimitedApts = p.max <= 0;
  const propsLeft = unlimitedApts ? 999 : Math.max(0, p.max - p.used);
  const trial = data.trial;
  const openRequest = data.requests.find((r) => r.status === 'new');

  const send = async () => {
    if (!token) return;
    setBusy(true);
    setReqErr('');
    setSent('');
    try {
      await requestUpgrade(token, {
        kind: 'plan',
        plan: wantPlan,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      });
      setSent('Заявка отправлена. Свяжемся с вами и сменим тариф.');
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

      {trial && (
        <div
          className="card card-pad"
          style={{
            borderColor: trial.expired ? 'oklch(0.7 0.12 25)' : 'var(--brand)',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {trial.expired ? 'Пробная неделя закончилась' : 'Пробный период'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 6, lineHeight: 1.5 }}>
            {trial.expired
              ? 'Агент больше не отвечает гостям. Выберите тариф ниже — подключим в течение дня.'
              : `Осталось ${trial.daysLeft ?? '—'} дн. Потом агент остановится, пока не выберете тариф. Квартиры на тесте без лимита.`}
          </div>
        </div>
      )}

      <div className="g2">
        <div className="card card-pad">
          <div style={{ fontSize: 13, fontWeight: 600 }}>Объекты</div>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '6px 0 10px' }}>
            {unlimitedApts
              ? 'На пробном тарифе число квартир не ограничено.'
              : propsLeft > 0
                ? `Свободно ${propsLeft} мест. Скрытые квартиры не считаются.`
                : 'Все места заняты — скройте лишнюю квартиру или поднимите тариф.'}
          </div>
          {unlimitedApts ? (
            <div className="mono" style={{ fontSize: 22, fontWeight: 600 }}>
              {p.used}
            </div>
          ) : (
            <Meter used={p.used} max={p.max} />
          )}
        </div>
        <div className="card card-pad">
          <div style={{ fontSize: 13, fontWeight: 600 }}>Диалоги</div>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '6px 0 10px' }}>
            Без лимита. Цена тарифа зависит только от числа квартир.
          </div>
          <div className="mono" style={{ fontSize: 22, fontWeight: 600 }}>
            {dialogsUsed}
          </div>
          <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 8 }}>
            гостей в этом месяце · новый диалог, если гость молчал {data.idleDays} дн.
          </div>
        </div>
      </div>

      <NotifySettings
        token={token ?? ''}
        notify={data.notify}
        botUsername={data.botUsername}
        onChanged={load}
      />

      <div className="card card-pad">
        <div style={{ fontSize: 13, fontWeight: 600 }}>Нужно больше квартир</div>
        <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 6, lineHeight: 1.5 }}>
          Оставьте заявку на тариф выше — подключим дополнительные объекты. Диалоги по-прежнему
          без лимита.
        </div>

        {openRequest ? (
          <div
            className="card card-pad"
            style={{ marginTop: 12, background: 'var(--soft)', border: 'none' }}
          >
            <div style={{ fontSize: 13, fontWeight: 500 }}>
              Заявка отправлена
              {openRequest.plan ? ` · тариф ${openRequest.plan}` : ''}
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 4 }}>
              Статус: {STATUS_TEXT[openRequest.status]} · от{' '}
              {new Date(openRequest.createdAt).toLocaleDateString('ru-RU')}
            </div>
          </div>
        ) : (
          <>
            <div className="nights-row" style={{ marginTop: 12 }}>
              {PLAN_CHOICES.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={wantPlan === n.id ? 'on' : ''}
                  onClick={() => setWantPlan(n.id)}
                >
                  {n.label}
                </button>
              ))}
            </div>
            <label className="field" style={{ marginTop: 12 }}>
              <span>Комментарий (необяз.)</span>
              <input
                className="inp"
                placeholder="Нужно 8 квартир"
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
              {busy ? '…' : 'Отправить заявку'}
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
                    {r.plan ? `тариф ${r.plan}` : r.amount ? `+${r.amount} диалогов` : 'заявка'} ·{' '}
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
