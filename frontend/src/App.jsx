import React, { useEffect, useRef, useState } from 'react';
import { carregarSessao, limparSessao } from './storage.js';
import { supabase } from './supabase.js';
import Login from './components/Login.jsx';
import MotoristaScreen from './components/MotoristaScreen.jsx';
import GestorScreen from './components/GestorScreen.jsx';
import { GL, GD, ThemeCtx } from './gestorUI.jsx';

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
  const [tema, setTema] = useState(() => localStorage.getItem('tema') || 'claro');
  const [notifAberta, setNotifAberta] = useState(false);
  const [avatarAberto, setAvatarAberto] = useState(false);
  const [notifs, setNotifs] = useState([]);  // [{ contrato, count }]
  const notifRef = useRef(null);
  const avatarRef = useRef(null);

  const G = tema === 'escuro' ? GD : GL;

  function toggleTema() {
    const novo = tema === 'claro' ? 'escuro' : 'claro';
    setTema(novo);
    localStorage.setItem('tema', novo);
  }

  // Fecha dropdowns ao clicar fora
  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifAberta(false);
      if (avatarRef.current && !avatarRef.current.contains(e.target)) setAvatarAberto(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Carrega notificações de registros pendentes de validação
  async function carregarNotifs() {
    const { data } = await supabase
      .from('registros')
      .select('id, rotas(contrato_id, contratos(nome))')
      .eq('status', 'completo')
      .eq('validado', false);

    if (!data) return;
    const agrupado = {};
    for (const r of data) {
      const nome = r.rotas?.contratos?.nome || 'Sem contrato';
      agrupado[nome] = (agrupado[nome] || 0) + 1;
    }
    setNotifs(Object.entries(agrupado).map(([contrato, count]) => ({ contrato, count })));
  }

  useEffect(() => {
    if (usuario?.perfil === 'gestor') carregarNotifs();
  }, [usuario]);

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
  const totalNotifs = notifs.reduce((s, n) => s + n.count, 0);

  return (
    <ThemeCtx.Provider value={tema}>
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
        <div style={{ flex: 1, overflow: 'auto', padding: '24px 40px 60px', boxSizing: 'border-box' }}>

          {/* Utility bar */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginBottom: 18 }}>

            {/* ── TEMA ── */}
            <button
              onClick={toggleTema}
              title={tema === 'claro' ? 'Mudar para tema escuro' : 'Mudar para tema claro'}
              style={{ width: 36, height: 36, borderRadius: 100, background: G.surface, border: `1px solid ${G.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: G.muted, cursor: 'pointer' }}
            >
              {tema === 'claro' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="3.2"/>
                  <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>

            {/* ── NOTIFICAÇÕES ── */}
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button
                onClick={() => { setNotifAberta(o => !o); setAvatarAberto(false); if (!notifAberta) carregarNotifs(); }}
                title="Notificações"
                style={{ position: 'relative', width: 36, height: 36, borderRadius: 100, background: G.surface, border: `1px solid ${G.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: G.muted, cursor: 'pointer' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.7 21a2 2 0 0 1-3.4 0"/>
                </svg>
                {totalNotifs > 0 && (
                  <span style={{ position: 'absolute', top: 5, right: 6, width: 8, height: 8, borderRadius: '50%', background: G.red, boxShadow: `0 0 0 2px ${G.surface}` }} />
                )}
              </button>

              {notifAberta && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 600,
                  background: G.surface, border: `1px solid ${G.border}`,
                  borderRadius: 14, boxShadow: '0 8px 32px rgba(60,40,120,0.14)',
                  minWidth: 280, maxWidth: 340,
                }}>
                  <div style={{ padding: '14px 16px 10px', borderBottom: `1px solid ${G.border}` }}>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: G.text, fontFamily: 'Space Grotesk, sans-serif' }}>Notificações</span>
                  </div>

                  {totalNotifs === 0 ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: G.muted, fontSize: '0.82rem' }}>
                      Nenhum registro pendente de validação.
                    </div>
                  ) : (
                    <>
                      <div style={{ padding: '8px 0' }}>
                        {notifs.map(n => (
                          <div
                            key={n.contrato}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 16px', gap: 12 }}
                          >
                            <div>
                              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: G.text }}>{n.contrato}</div>
                              <div style={{ fontSize: '0.75rem', color: G.muted, marginTop: 2 }}>registros pendentes de validação</div>
                            </div>
                            <span style={{
                              background: G.red, color: '#fff',
                              borderRadius: 20, padding: '2px 8px',
                              fontSize: '0.72rem', fontWeight: 700, flexShrink: 0,
                            }}>{n.count}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ padding: '10px 16px', borderTop: `1px solid ${G.border}` }}>
                        <button
                          onClick={() => { setAba(0); setNotifAberta(false); }}
                          style={{
                            width: '100%', border: 0, background: G.accent, color: '#fff',
                            borderRadius: 100, padding: '8px 0', fontWeight: 700,
                            fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'Manrope, sans-serif',
                          }}
                        >
                          Ver Folhas de Medição →
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* ── AVATAR ── */}
            <div ref={avatarRef} style={{ position: 'relative' }}>
              <button
                onClick={() => { setAvatarAberto(o => !o); setNotifAberta(false); }}
                title="Minha conta"
                style={{ width: 36, height: 36, borderRadius: 100, background: G.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: 700, color: '#fff', fontFamily: 'Space Grotesk, sans-serif', boxShadow: `0 0 0 2px ${G.surface}, 0 0 0 3px ${G.border}`, border: 'none', cursor: 'pointer' }}
              >
                {initials}
              </button>

              {avatarAberto && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 600,
                  background: G.surface, border: `1px solid ${G.border}`,
                  borderRadius: 14, boxShadow: '0 8px 32px rgba(60,40,120,0.14)',
                  minWidth: 220,
                }}>
                  {/* User info */}
                  <div style={{ padding: '16px 16px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: G.accentSoft, border: `1.5px solid ${G.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: G.accent, flexShrink: 0, fontFamily: 'Space Grotesk, sans-serif' }}>
                      {initials}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: G.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{usuario.nome}</div>
                      {usuario.email && <div style={{ fontSize: '0.75rem', color: G.muted, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{usuario.email}</div>}
                      <div style={{ marginTop: 4, display: 'inline-flex', alignItems: 'center', background: G.accentSoft, color: G.accent, fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: 20, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Gestor</div>
                    </div>
                  </div>

                  <div style={{ borderTop: `1px solid ${G.border}`, padding: '8px 8px' }}>
                    {/* Tema dentro do avatar também */}
                    <button
                      onClick={() => { toggleTema(); setAvatarAberto(false); }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', color: G.text, fontSize: '0.82rem', fontWeight: 500, fontFamily: 'Manrope, sans-serif', textAlign: 'left' }}
                    >
                      <span style={{ width: 28, height: 28, borderRadius: 8, background: G.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', color: G.accent, flexShrink: 0 }}>
                        {tema === 'claro' ? '🌙' : '☀️'}
                      </span>
                      {tema === 'claro' ? 'Tema escuro' : 'Tema claro'}
                    </button>

                    <div style={{ height: 1, background: G.border, margin: '6px 2px' }} />

                    <button
                      onClick={() => { sair(); setAvatarAberto(false); }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', color: G.red, fontSize: '0.82rem', fontWeight: 600, fontFamily: 'Manrope, sans-serif', textAlign: 'left' }}
                    >
                      <span style={{ width: 28, height: 28, borderRadius: 8, background: 'oklch(0.96 0.03 25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14 }}>↩</span>
                      Sair da conta
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

          <GestorScreen aba={aba} />
        </div>
      </div>
    </ThemeCtx.Provider>
  );
}
