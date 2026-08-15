'use client';

export function BrandMark({
  size = 28,
  hero = false,
}: {
  size?: number;
  hero?: boolean;
}) {
  if (hero) {
    return (
      <img
        src="/amanai-word.png"
        alt="AmanAI"
        width={size}
        height={Math.round(size * (980 / 900))}
        className="logo-img logo-hero"
        draggable={false}
      />
    );
  }
  return (
    <img
      src="/amanai-mark.png"
      alt="AmanAI"
      width={size}
      height={size}
      className="logo-img"
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
