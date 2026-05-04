import React, { useState } from 'react';
import { carregarSessao, limparSessao } from './storage.js';
import Login from './components/Login.jsx';
import MotoristaScreen from './components/MotoristaScreen.jsx';
import GestorScreen from './components/GestorScreen.jsx';
import { s } from './styles.js';

export default function App() {
  const [usuario, setUsuario] = useState(() => carregarSessao());

  function sair() {
    limparSessao();
    setUsuario(null);
  }

  if (!usuario) return <Login onLogin={setUsuario} />;

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div>
          <h1 style={s.h1}>Medição de Rotas</h1>
          <p style={s.subtitle}>
            {usuario.nome} · {usuario.perfil === 'gestor' ? 'Gestor' : 'Motorista'}
          </p>
        </div>
        <button style={s.btnSecondary} onClick={sair}>Sair</button>
      </header>

      <div style={s.content}>
        {usuario.perfil === 'motorista'
          ? <MotoristaScreen usuario={usuario} />
          : <GestorScreen />}
      </div>
    </div>
  );
}
