import React, { useState } from 'react';
import Login from './components/Login.jsx';
import MotoristaScreen from './components/MotoristaScreen.jsx';
import GestorScreen from './components/GestorScreen.jsx';
import { s } from './styles.js';

export default function App() {
  const [sessao, setSessao] = useState(null);

  if (!sessao) return <Login onLogin={setSessao} />;

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div>
          <h1 style={s.h1}>Medição de Rotas</h1>
          <p style={s.subtitle}>
            {sessao.nome} · {sessao.tipo === 'gestor' ? 'Gestor' : 'Motorista'}
          </p>
        </div>
        <button style={s.btnSecondary} onClick={() => setSessao(null)}>Sair</button>
      </header>

      <div style={s.content}>
        {sessao.tipo === 'motorista'
          ? <MotoristaScreen sessao={sessao} />
          : <GestorScreen />}
      </div>
    </div>
  );
}
