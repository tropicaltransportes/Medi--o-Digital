import React, { useState } from 'react';
import { USUARIOS } from '../storage.js';
import { s } from '../styles.js';

export default function Login({ onLogin }) {
  const [tipo, setTipo] = useState('motorista');
  const [nome, setNome] = useState(USUARIOS.motorista[0]);

  function trocarTipo(novoTipo) {
    setTipo(novoTipo);
    setNome(USUARIOS[novoTipo][0]);
  }

  return (
    <div style={s.loginPage}>
      <div style={s.loginCard}>
        <h1 style={s.loginTitle}>Medição de Rotas</h1>
        <p style={{ ...s.subtitle, marginBottom: 28 }}>Sistema de faturamento por rotas</p>

        <label style={s.label}>Perfil</label>
        <select
          value={tipo}
          onChange={(e) => trocarTipo(e.target.value)}
          style={{ ...s.input, marginBottom: 16 }}
        >
          <option value="motorista">Motorista</option>
          <option value="gestor">Gestor</option>
        </select>

        <label style={s.label}>Usuário</label>
        <select
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          style={{ ...s.input, marginBottom: 24 }}
        >
          {USUARIOS[tipo].map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>

        <button style={{ ...s.btn, width: '100%', padding: '12px' }} onClick={() => onLogin({ tipo, nome })}>
          Entrar
        </button>
      </div>
    </div>
  );
}
