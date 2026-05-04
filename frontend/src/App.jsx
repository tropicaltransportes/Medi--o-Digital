import React, { useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import Login from './components/Login.jsx';
import MotoristaScreen from './components/MotoristaScreen.jsx';
import GestorScreen from './components/GestorScreen.jsx';
import { s } from './styles.js';

export default function App() {
  const [sessao, setSessao] = useState(null); // { user, perfil }
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        buscarPerfil(session.user).then((perfil) => {
          setSessao({ user: session.user, perfil });
          setCarregando(false);
        });
      } else {
        setCarregando(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session) {
          const perfil = await buscarPerfil(session.user);
          setSessao({ user: session.user, perfil });
        } else {
          setSessao(null);
        }
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  async function buscarPerfil(user) {
    const { data } = await supabase
      .from('perfis')
      .select('*')
      .eq('id', user.id)
      .single();
    return data;
  }

  function sair() {
    supabase.auth.signOut();
  }

  if (carregando) {
    return (
      <div style={{ ...s.loginPage, fontSize: '0.9rem', color: '#6b7280' }}>
        Carregando...
      </div>
    );
  }

  if (!sessao) return <Login />;

  const { perfil } = sessao;

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div>
          <h1 style={s.h1}>Medição de Rotas</h1>
          <p style={s.subtitle}>
            {perfil?.nome} · {perfil?.tipo === 'gestor' ? 'Gestor' : 'Motorista'}
          </p>
        </div>
        <button style={s.btnSecondary} onClick={sair}>Sair</button>
      </header>

      <div style={s.content}>
        {perfil?.tipo === 'motorista'
          ? <MotoristaScreen sessao={sessao} />
          : <GestorScreen />}
      </div>
    </div>
  );
}
