import React, { useState } from 'react';
import { carregarSessao, limparSessao } from './storage.js';
import Login from './components/Login.jsx';
import MotoristaScreen from './components/MotoristaScreen.jsx';
import GestorScreen from './components/GestorScreen.jsx';
import { G } from './gestorUI.jsx';

const NAV = [
  {
    label: 'Folhas de Medição',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/>
        <path d="M14 3v5h5"/>
        <line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/>
      </svg>
    ),
  },
  {
    label: 'Regras de Faturamento',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="4" y1="6" x2="20" y2="6"/><circle cx="9" cy="6" r="2"/>
        <line x1="4" y1="12" x2="20" y2="12"/><circle cx="15" cy="12" r="2"/>
        <line x1="4" y1="18" x2="20" y2="18"/><circle cx="7" cy="18" r="2"/>
      </svg>
    ),
  },
  {
    label: 'Boletim',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/>
        <line x1="9" y1="8" x2="15" y2="8"/><line x1="9" y1="12" x2="15" y2="12"/>
      </svg>
    ),
  },
  {
    label: 'Relatórios',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="20" x2="5" y2="12"/>
        <line x1="12" y1="20" x2="12" y2="8"/>
        <line x1="19" y1="20" x2="19" y2="15"/>
      </svg>
    ),
  },
  {
    label: 'Cadastros',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="7" height="7" rx="1.5"/>
        <rect x="13" y="4" width="7" height="7" rx="1.5"/>
        <rect x="4" y="13" width="7" height="7" rx="1.5"/>
        <rect x="13" y="13" width="7" height="7" rx="1.5"/>
      </svg>
    ),
  },
];

const RouteLogomark = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="18" r="2.2" fill="white" stroke="none"/>
    <circle cx="18" cy="6" r="2.2" fill="white" stroke="none"/>
    <path d="M6 18C6 10 10 6 18 6"/>
  </svg>
);

export default function App() {
  const [usuario, setUsuario] = useState(() => carregarSessao());
  const [aba, setAba] = useState(0);
  const [sidebarAberta, setSidebarAberta] = useState(true);

  function sair() { limparSessao(); setUsuario(null); }

  if (!usuario) return <Login onLogin={setUsuario} />;

  if (usuario.perfil === 'motorista') {
    return (
      <div style={{ fontFamily: 'Manrope, Space Grotesk, Inter, sans-serif', minHeight: '100vh', background: 'oklch(0.10 0.01 288)', color: 'oklch(0.97 0.01 288)' }}>
        <MotoristaScreen usuario={usuario} onSair={sair} />
      </div>
    );
  }

  const initials = (usuario.nome || 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const ab = sidebarAberta;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'Manrope, Space Grotesk, sans-serif', background: G.pageBg, color: G.text }}>

      {/* ── SIDEBAR ──────────────────────────────────────── */}
      <aside style={{
        width: ab ? 240 : 64, flexShrink: 0,
        background: G.surface,
        borderRight: `1px solid ${G.border}`,
        display: 'flex', flexDirection: 'column',
        padding: ab ? '22px 16px' : '22px 10px',
        boxSizing: 'border-box',
        transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1), padding 0.22s',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Logomark + App name + toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 26, minWidth: 0 }}>
          <div
            onClick={() => setSidebarAberta(o => !o)}
            title={ab ? 'Retrair menu' : 'Expandir menu'}
            style={{
              width: 32, height: 32, borderRadius: 9, background: G.accent, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', userSelect: 'none',
            }}
          >
            <RouteLogomark />
          </div>
          {ab && (
            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: 14, letterSpacing: '-0.01em', color: G.text }}>Medição Digital</div>
                <div style={{ fontSize: 10.5, color: G.muted, marginTop: 1 }}>Painel do gestor</div>
              </div>
              <button
                onClick={() => setSidebarAberta(false)}
                title="Retrair menu"
                style={{ flexShrink: 0, background: 'transparent', border: 'none', cursor: 'pointer', color: G.muted, padding: '4px 6px', borderRadius: 7, lineHeight: 1, fontSize: 16 }}
              >
                ‹
              </button>
            </div>
          )}
        </div>

        {/* MENU label */}
        {ab && (
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: G.muted, padding: '0 8px', marginBottom: 8 }}>
            Menu
          </div>
        )}

        {/* Nav items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {NAV.map((item, i) => {
            const active = aba === i;
            return (
              <button
                key={i}
                onClick={() => setAba(i)}
                title={!ab ? item.label : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: ab ? 10 : 0,
                  justifyContent: ab ? 'flex-start' : 'center',
                  border: 0,
                  background: active ? G.navDark : 'transparent',
                  color: active ? '#fff' : G.text,
                  padding: ab ? '8px 10px' : '8px',
                  borderRadius: 100,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: 'Manrope, sans-serif',
                  outline: 'none',
                  transition: 'background 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{
                  width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: active ? 'rgba(255,255,255,0.18)' : G.accentSoft,
                  color: active ? '#fff' : G.accent,
                }}>
                  {item.icon}
                </span>
                {ab && item.label}
              </button>
            );
          })}
        </div>

        {/* User + sair */}
        <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: `1px solid ${G.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: ab ? 9 : 0, justifyContent: ab ? 'flex-start' : 'center' }}>
            <div
              title={!ab ? `${usuario.nome} — clique para expandir` : undefined}
              onClick={!ab ? () => setSidebarAberta(true) : undefined}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                background: G.accentSoft,
                border: `1.5px solid ${G.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: G.accent, flexShrink: 0,
                fontFamily: 'Space Grotesk, sans-serif',
                cursor: !ab ? 'pointer' : 'default',
              }}
            >
              {initials}
            </div>
            {ab && (
              <>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: G.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{usuario.nome}</div>
                  <div style={{ fontSize: 10.5, color: G.muted }}>Gestor</div>
                </div>
                <button
                  onClick={sair}
                  title="Sair"
                  style={{ flexShrink: 0, background: 'transparent', border: `1px solid ${G.border}`, borderRadius: 8, padding: '5px 8px', color: G.muted, cursor: 'pointer', fontSize: 14, lineHeight: 1 }}
                >
                  ↩
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* ── MAIN ─────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px 40px 60px', boxSizing: 'border-box', transition: 'padding 0.22s' }}>

        {/* Utility bar — top right */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <span style={{ width: 36, height: 36, borderRadius: 100, background: G.surface, border: `1px solid ${G.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: G.muted, cursor: 'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="3.2"/>
              <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>
            </svg>
          </span>
          <span style={{ position: 'relative', width: 36, height: 36, borderRadius: 100, background: G.surface, border: `1px solid ${G.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: G.muted, cursor: 'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.7 21a2 2 0 0 1-3.4 0"/>
            </svg>
            <span style={{ position: 'absolute', top: 6, right: 7, width: 6, height: 6, borderRadius: '50%', background: G.red, boxShadow: `0 0 0 2px ${G.surface}` }} />
          </span>
          <span style={{ width: 36, height: 36, borderRadius: 100, background: G.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: 700, color: '#fff', fontFamily: 'Space Grotesk, sans-serif', boxShadow: `0 0 0 2px ${G.surface}, 0 0 0 3px ${G.border}` }}>
            {initials}
          </span>
        </div>

        <GestorScreen aba={aba} />
      </div>
    </div>
  );
}
