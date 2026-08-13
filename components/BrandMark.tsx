'use client';

export function BrandMark({
  size = 28,
  hero = false,
}: {
  size?: number;
  hero?: boolean;
}) {
  return (
    <img
      src={hero ? '/amanai.png' : '/amanai-mark.jpg'}
      alt="AmanAI"
      width={size}
      height={size}
      className={`logo-img${hero ? ' logo-hero' : ''}`}
      draggable={false}
    />
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="wordmark">
      <span className="wm-aman">Aman</span>
      <span className="wm-ai">AI</span>
      {!compact && <span className="wm-sub">Кабинет владельца</span>}
    </div>
  );
}
