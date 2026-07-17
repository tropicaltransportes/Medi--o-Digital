import React, { useState } from 'react';
import { supabase } from '../supabase.js';
import { salvarSessao } from '../storage.js';
import { s, C } from '../styles.js';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [entrando, setEntrando] = useState(false);

  const [tela, setTela] = useState('login'); // 'login' | 'esqueci' | 'temp'
  const [emailReset, setEmailReset] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [tempSenha, setTempSenha] = useState('');

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

  async function solicitarReset(e) {
    e.preventDefault();
    setErro('');
    setEnviando(true);

    const { data, error } = await supabase.rpc('redefinir_senha_temporaria', {
      email_input: emailReset.trim().toLowerCase(),
    });

    setEnviando(false);

    if (error) {
      setErro('Erro ao processar. Tente novamente.');
      return;
    }

    if (data?.temp_senha) {
      setTempSenha(data.temp_senha);
      setTela('temp');
    } else {
      setErro('Email não encontrado no sistema.');
    }
  }

  // ── TELA SENHA TEMPORÁRIA ────────────────────────────────────────────────────
  if (tela === 'temp') {
    return (
      <div style={s.loginPage}>
        <div style={s.loginCard}>
          <h1 style={s.loginTitle}>Medição de Rotas</h1>
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '18px 20px', marginBottom: 20 }}>
            <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: '0.95rem', color: '#166534' }}>Senha temporária gerada</p>
            <p style={{ margin: '0 0 14px', fontSize: '0.82rem', color: '#166534' }}>
              Use a senha abaixo para entrar. Recomendamos alterá-la após o login.
            </p>
            <div style={{
              background: '#fff', border: '1.5px solid #86efac', borderRadius: 8,
              padding: '12px 16px', textAlign: 'center',
              fontSize: '1.5rem', fontWeight: 800, letterSpacing: '0.18em', color: C.accent,
              fontFamily: 'monospace',
            }}>
              {tempSenha}
            </div>
          </div>
          <button
            style={{ ...s.btn, width: '100%', padding: '12px' }}
            onClick={() => {
              setEmail(emailReset);
              setSenha(tempSenha);
              setTela('login');
            }}
          >
            Ir para o login
          </button>
        </div>
      </div>
    );
  }

  // ── TELA ESQUECI A SENHA ─────────────────────────────────────────────────────
  if (tela === 'esqueci') {
    return (
      <div style={s.loginPage}>
        <div style={s.loginCard}>
          <h1 style={s.loginTitle}>Medição de Rotas</h1>
          <p style={{ ...s.subtitle, marginBottom: 24 }}>Informe seu email cadastrado para receber uma senha temporária.</p>

          <form onSubmit={solicitarReset}>
            <label style={s.label}>Email</label>
            <input
              required
              type="email"
              value={emailReset}
              onChange={(e) => setEmailReset(e.target.value)}
              style={{ ...s.input, marginBottom: 20 }}
              placeholder="seu@email.com"
              autoComplete="email"
              autoFocus
            />

            {erro && <p style={{ ...s.errorText, marginBottom: 12 }}>{erro}</p>}

            <button
              style={{ ...s.btn, width: '100%', padding: '12px', opacity: enviando ? 0.7 : 1 }}
              type="submit"
              disabled={enviando}
            >
              {enviando ? 'Processando...' : 'Gerar senha temporária'}
            </button>
          </form>

          <button
            style={{ width: '100%', marginTop: 12, background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: '0.875rem' }}
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
