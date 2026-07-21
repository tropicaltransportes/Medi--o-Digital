import React from 'react';

// Design tokens — gestor light theme (violet, oklch)
export const G = {
  pageBg:      'oklch(0.965 0.004 292)',
  surface:     'oklch(1 0 0)',
  surfaceAlt:  'oklch(0.96 0.007 292)',
  text:        'oklch(0.22 0.02 292)',
  muted:       'oklch(0.55 0.015 292)',
  border:      'oklch(0.91 0.008 292)',
  accent:      'oklch(0.6 0.19 292)',
  accentDk:    'oklch(0.4 0.16 292)',
  accentSoft:  'oklch(0.94 0.035 292)',
  navDark:     'oklch(0.22 0.02 292)',
  green:       'oklch(0.4 0.12 152)',
  greenSoft:   'oklch(0.95 0.04 152)',
  greenBorder: 'oklch(0.75 0.09 152)',
  navy:        'oklch(0.32 0.08 288)',
  navyBorder:  'oklch(0.65 0.06 288)',
  red:         'oklch(0.58 0.19 25)',
};

export const gCard = {
  background: G.surface,
  borderRadius: 16,
  padding: 20,
  border: `1px solid ${G.border}`,
  boxShadow: '0 1px 4px rgba(60,40,120,0.06)',
};

export const gLabel = {
  display: 'block',
  marginBottom: 5,
  fontWeight: 700,
  fontSize: '0.78rem',
  color: G.muted,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

export const gInput = {
  border: `1.5px solid ${G.border}`,
  borderRadius: 10,
  padding: '8px 12px',
  fontSize: '0.875rem',
  background: G.surfaceAlt,
  color: G.text,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'Manrope, sans-serif',
};

export const gTh = {
  background: G.accentSoft,
  padding: '9px 12px',
  textAlign: 'left',
  fontWeight: 700,
  fontSize: '0.72rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: G.accentDk,
  borderBottom: `1px solid ${G.border}`,
  whiteSpace: 'nowrap',
};

export const gTd = {
  padding: '9px 12px',
  borderBottom: `1px solid ${G.border}`,
  verticalAlign: 'top',
  color: G.text,
  fontSize: '0.875rem',
};

export const gBtn = {
  border: 0,
  background: G.accent,
  color: '#fff',
  padding: '9px 18px',
  borderRadius: 100,
  fontWeight: 700,
  cursor: 'pointer',
  fontSize: '0.875rem',
  fontFamily: 'Manrope, sans-serif',
};

export const gBtnSec = {
  border: `1px solid ${G.border}`,
  background: G.surface,
  color: G.text,
  padding: '7px 16px',
  borderRadius: 100,
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '0.875rem',
  fontFamily: 'Manrope, sans-serif',
};

export const gBtnGreen = {
  border: 0,
  background: G.green,
  color: '#fff',
  padding: '7px 16px',
  borderRadius: 100,
  fontWeight: 700,
  cursor: 'pointer',
  fontSize: '0.875rem',
  fontFamily: 'Manrope, sans-serif',
};

export const gBtnDanger = {
  border: `1px solid oklch(0.82 0.12 25)`,
  background: 'transparent',
  color: G.red,
  padding: '4px 10px',
  borderRadius: 8,
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '0.78rem',
  fontFamily: 'Manrope, sans-serif',
};

// Custom pill dropdown — replaces native <select> everywhere
export function PillDD({ label, open, onToggle, onBlur, options, onSelect, fullWidth, minWidth }) {
  return (
    <div style={{ position: 'relative', ...(fullWidth ? { width: '100%' } : {}), ...(minWidth ? { minWidth } : {}) }}>
      <button
        type="button"
        onClick={onToggle}
        onBlur={onBlur}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          border: `1px solid ${G.border}`, borderRadius: 100,
          background: G.surface, color: G.text,
          padding: '7px 14px', fontSize: 13, fontWeight: 500,
          cursor: 'pointer', outline: 'none',
          width: fullWidth ? '100%' : undefined,
          boxSizing: 'border-box',
          fontFamily: 'Manrope, sans-serif',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 500,
          background: G.surface, border: `1px solid ${G.border}`,
          borderRadius: 14, boxShadow: '0 8px 32px rgba(60,40,120,0.14)',
          minWidth: '100%', overflow: 'hidden',
        }}>
          {options.map(opt => (
            <div
              key={opt.value}
              onMouseDown={() => onSelect(opt.value)}
              style={{
                padding: '9px 16px', fontSize: 13, cursor: 'pointer',
                color: opt.active ? G.accent : G.text,
                fontWeight: opt.active ? 700 : 400,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = G.accentSoft; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Metric badge next to section H1
export function Selo({ num, label }) {
  return (
    <div style={{ background: G.accentSoft, borderRadius: 12, padding: '10px 16px', textAlign: 'center', flexShrink: 0, minWidth: 80 }}>
      <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: 22, color: G.accent, lineHeight: 1.15 }}>{num}</div>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: G.muted, marginTop: 2 }}>{label}</div>
    </div>
  );
}

// Route track motif — dashed divider + colored progress bar
// labelLeft/labelRight: shown above the bar
// trailingText: shown inline after the right dot
export function RotaMotif({ pct, color, labelLeft, labelRight, trailingText }) {
  const safeColor = color || G.accent;
  const safePct = Math.min(100, Math.max(0, pct || 0));
  return (
    <div style={{ position: 'relative', marginTop: 16, borderTop: `1.5px dashed ${G.border}`, paddingTop: 14 }}>
      <span style={{ position: 'absolute', left: -20, top: -5, width: 10, height: 10, borderRadius: '50%', background: G.pageBg }} />
      <span style={{ position: 'absolute', right: -20, top: -5, width: 10, height: 10, borderRadius: '50%', background: G.pageBg }} />
      {(labelLeft !== undefined || labelRight !== undefined) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 11.5, color: G.muted, marginBottom: 8 }}>
          <span style={{ flex: 1, minWidth: 0 }}>{labelLeft}</span>
          {labelRight && <span style={{ fontWeight: 700, color: G.text, fontFamily: 'Space Grotesk, sans-serif', whiteSpace: 'nowrap', flexShrink: 0 }}>{labelRight}</span>}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: G.accent, flexShrink: 0 }} />
        <div style={{ flex: 1, height: 4, borderRadius: 100, background: G.border, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, width: `${safePct}%`, background: safeColor, borderRadius: 100 }} />
        </div>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: safeColor, flexShrink: 0 }} />
        {trailingText && <span style={{ fontSize: 11.5, fontWeight: 700, color: safeColor, whiteSpace: 'nowrap' }}>{trailingText}</span>}
      </div>
    </div>
  );
}
