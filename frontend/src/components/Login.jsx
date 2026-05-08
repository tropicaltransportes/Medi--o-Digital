import React, { useState } from 'react';
import { supabase } from '../supabase.js';
import { salvarSessao } from '../storage.js';
import { s } from '../styles.js';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [entrando, setEntrando] = useState(false);

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
            style={{ ...s.input, marginBottom: 20 }}
            placeholder="••••••••"
            autoComplete="current-password"
          />

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
