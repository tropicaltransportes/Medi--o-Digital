import React, { useState } from 'react';
import { supabase } from '../supabase.js';
import { salvarSessao } from '../storage.js';
import { s, C } from '../styles.js';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [entrando, setEntrando] = useState(false);

  const [tela, setTela] = useState('login'); // 'login' | 'esqueci'

  async function entrar(e) {
    e.preventDefault();
    setErro('');
    setEntrando(true);

    const { data, error } = await supabase.rpc('fazer_login', {
      email_input: email,
      senha_input: senha,
    });

    if (error || !data?.ok) {
      setErro(data?.erro || 'Erro ao conectar. Tente novamente.');
    } else {
      salvarSessao(data);
      onLogin(data);
    }

    setEntrando(false);
  }

  // ── TELA ESQUECI A SENHA ─────────────────────────────────────────────────────
  if (tela === 'esqueci') {
    return (
      <div style={s.loginPage}>
        <div style={s.loginCard}>
          <h1 style={s.loginTitle}>Medição de Rotas</h1>
          <div style={{ background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: 10, padding: '20px', marginBottom: 20, textAlign: 'center' }}>
            <p style={{ margin: '0 0 8px', fontSize: '1.5rem' }}>🔑</p>
            <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: '0.95rem', color: '#5b21b6' }}>Redefinição de senha</p>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280', lineHeight: 1.5 }}>
              Entre em contato com o administrador do sistema para receber uma nova senha temporária.
            </p>
          </div>
          <button
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: '0.875rem' }}
            onClick={() => { setTela('login'); setErro(''); }}
          >
            ← Voltar ao login
          </button>
        </div>
      </div>
    );
  }

  // ── TELA DE LOGIN ────────────────────────────────────────────────────────────
  return (
    <div style={s.loginPage}>
      <div style={s.loginCard}>
        <h1 style={s.loginTitle}>Medição de Rotas</h1>
        <p style={{ ...s.subtitle, marginBottom: 28 }}>Sistema de faturamento por rotas</p>

        <form onSubmit={entrar}>
          <label style={s.label}>Email</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ ...s.input, marginBottom: 14 }}
            placeholder="seu@email.com"
            autoComplete="email"
          />

          <label style={s.label}>Senha</label>
          <input
            required
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            style={{ ...s.input, marginBottom: 6 }}
            placeholder="••••••••"
            autoComplete="current-password"
          />

          <div style={{ textAlign: 'right', marginBottom: 18 }}>
            <button
              type="button"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.accent, fontSize: '0.82rem', padding: 0 }}
              onClick={() => { setTela('esqueci'); setEmailReset(email); setErro(''); }}
            >
              Esqueci a senha
            </button>
          </div>

          {erro && <p style={{ ...s.errorText, marginBottom: 12 }}>{erro}</p>}

          <button
            style={{ ...s.btn, width: '100%', padding: '12px', opacity: entrando ? 0.7 : 1 }}
            type="submit"
            disabled={entrando}
          >
            {entrando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
