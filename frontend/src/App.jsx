import React, { useState } from 'react';
import { carregarSessao, limparSessao } from './storage.js';
import Login from './components/Login.jsx';
import MotoristaScreen from './components/MotoristaScreen.jsx';
import GestorScreen from './components/GestorScreen.jsx';
import { C } from './styles.js';

const NAV = [
  { label: 'Folhas de Medição' },
  { label: 'Regras de Faturamento' },
  { label: 'Boletim' },
  { label: 'Relatórios' },
  { label: 'Cadastros' },
];

function NavIcon({ index, active }) {
  const color = active ? '#A39AEB' : 'rgba(255,255,255,0.38)';
  const p = { fill: 'none', stroke: color, strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' };
  const s = 16;
  const icons = [
    // grid
    <svg key={0} width={s} height={s} viewBox="0 0 24 24" {...p}>
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>,
    // clipboard
    <svg key={1} width={s} height={s} viewBox="0 0 24 24" {...p}>
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="1"/>
      <line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="12" y2="16"/>
    </svg>,
    // credit card
    <svg key={2} width={s} height={s} viewBox="0 0 24 24" {...p}>
      <rect x="2" y="5" width="20" height="14" rx="2"/>
      <line x1="2" y1="10" x2="22" y2="10"/>
    </svg>,
    // bar chart
    <svg key={3} width={s} height={s} viewBox="0 0 24 24" {...p}>
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>,
    // settings
    <svg key={4} width={s} height={s} viewBox="0 0 24 24" {...p}>
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>,
  ];
  return icons[index] || null;
}

const SB = '#14132B'; // sidebar bg

export default function App() {
  const [usuario, setUsuario] = useState(() => carregarSessao());
  const [aba, setAba] = useState(0);

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

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'Inter, Segoe UI, Arial, sans-serif' }}>

      {/* ── SIDEBAR ─────────────────────────────────────── */}
      <aside style={{ width: 228, flexShrink: 0, background: SB, display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.05)' }}>

        {/* Brand */}
        <div style={{ padding: '20px 18px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg, #5D52D1 0%, #8B7CF8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.25 }}>Medição</div>
            <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.32)', lineHeight: 1 }}>Tropical Transportes</div>
          </div>
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 14px 10px' }} />

        {/* Nav */}
        <nav style={{ flex: 1, padding: '2px 8px', overflowY: 'auto' }}>
          {NAV.map((item, i) => {
            const active = aba === i;
            return (
              <button key={i} onClick={() => setAba(i)} style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '8px 12px', marginBottom: 1,
                background: active ? 'rgba(93,82,209,0.2)' : 'transparent',
                border: 'none', borderRadius: 8, cursor: 'pointer',
                color: active ? '#B8B1F0' : 'rgba(255,255,255,0.42)',
                fontSize: '0.835rem', fontWeight: active ? 600 : 400,
                textAlign: 'left', lineHeight: 1.3,
                outline: 'none',
              }}>
                <NavIcon index={i} active={active} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User */}
        <div style={{ padding: '12px 14px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(93,82,209,0.3)', border: '1px solid rgba(163,154,235,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 700, color: '#A39AEB', flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{usuario.nome}</div>
              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.28)', marginTop: 1 }}>Gestor</div>
            </div>
            <button onClick={sair} title="Sair" style={{ flexShrink: 0, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 6, padding: '5px 7px', color: 'rgba(255,255,255,0.38)', cursor: 'pointer', fontSize: '0.75rem', lineHeight: 1 }}>↩</button>
          </div>
        </div>
      </aside>

      {/* ── MAIN ────────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: C.bg }}>

        {/* Top bar */}
        <header style={{ height: 56, flexShrink: 0, background: C.surface, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '0 28px', gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: C.text, letterSpacing: '-0.01em' }}>
            {NAV[aba].label}
          </h1>
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflow: 'auto', padding: '24px 28px 48px' }}>
          <GestorScreen aba={aba} />
        </main>
      </div>
    </div>
  );
}
