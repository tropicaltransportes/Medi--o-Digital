import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase.js';
import { useG, getStyles, Selo } from '../gestorUI.jsx';

const TIPOS_VEICULO = ['RODOVIÁRIO', 'SEMI RODOVIÁRIO', 'URBANO', 'MICRO', 'VAN', 'PEQUENO PORTE'];
const ABAS = ['Contratos', 'Rotas', 'Veículos', 'Logins'];

export default function CadastrosScreen() {
  const G = useG();
  const { gCard, gLabel, gInput, gBtn, gBtnSec, gBtnGreen, gBtnDanger, gTh, gTd } = getStyles(G);
  const [aba, setAba] = useState(0);

  return (
    <div>
      {/* Header + Selo */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, marginBottom: 18 }}>
        <div>
          <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 22, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.01em', color: G.text }}>
            Cadastros
          </h1>
          <p style={{ margin: 0, fontSize: 13.5, color: G.muted }}>
            Contratos, rotas, veículos e usuários do sistema.
          </p>
        </div>
      </div>

      {/* Sub-abas */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: `1px solid ${G.border}` }}>
        {ABAS.map((nome, i) => (
          <button key={i} onClick={() => setAba(i)} style={{
            padding: '8px 18px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: 600, fontSize: '0.875rem',
            color: aba === i ? G.accent : G.muted,
            borderBottom: aba === i ? `2px solid ${G.accent}` : '2px solid transparent',
            marginBottom: -1,
            outline: 'none',
            fontFamily: 'Manrope, sans-serif',
          }}>
            {nome}
          </button>
        ))}
      </div>

      {aba === 0 && <ContratosSection />}
      {aba === 1 && <RotasSection />}
      {aba === 2 && <VeiculosSection />}
      {aba === 3 && <LoginsSection />}
    </div>
  );
}

/* ── CONTRATOS ─────────────────────────────────────────────────────────── */
function ContratosSection() {
  const [lista, setLista] = useState([]);
  const [form, setForm] = useState({ nome: '', cliente: '' });
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { carregar(); }, []);
  async function carregar() {
    const { data } = await supabase.from('contratos').select('id, nome, cliente').order('nome');
    setLista(data || []);
  }
  async function adicionar(e) {
    e.preventDefault();
    setSalvando(true);
    await supabase.from('contratos').insert({ nome: form.nome.trim(), cliente: form.cliente.trim() });
    setForm({ nome: '', cliente: '' });
    await carregar();
    setSalvando(false);
  }
  async function remover(id) {
    if (!confirm('Remover este contrato? As rotas vinculadas também serão removidas.')) return;
    await supabase.from('contratos').delete().eq('id', id);
    setLista(l => l.filter(x => x.id !== id));
  }

  return (
    <section style={gCard}>
      <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: '1rem', fontWeight: 700, color: G.text, fontFamily: 'Space Grotesk, sans-serif' }}>Contratos</h2>
      <form onSubmit={adicionar} style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={gLabel}>Nome do contrato</label>
          <input required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} style={{ ...gInput, width: 220 }} placeholder="Ex: BAYER - SITE" />
        </div>
        <div>
          <label style={gLabel}>Cliente</label>
          <input required value={form.cliente} onChange={e => setForm(f => ({ ...f, cliente: e.target.value }))} style={{ ...gInput, width: 220 }} placeholder="Ex: Bayer S.A." />
        </div>
        <button style={gBtnGreen} type="submit" disabled={salvando}>+ Adicionar</button>
      </form>
      <div style={{ overflowX: 'auto', marginTop: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead><tr><th style={thS}>Nome</th><th style={thS}>Cliente</th><th style={thS}></th></tr></thead>
          <tbody>
            {lista.map(c => (
              <tr key={c.id}>
                <td style={{ ...tdS, fontWeight: 600 }}>{c.nome}</td>
                <td style={tdS}>{c.cliente}</td>
                <td style={tdS}><button style={gBtnDanger} onClick={() => remover(c.id)}>Remover</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ── ROTAS ─────────────────────────────────────────────────────────────── */
function RotasSection() {
  const [lista, setLista] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [form, setForm] = useState({ contrato_id: '', nome: '', local: '' });
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregar();
    supabase.from('contratos').select('id, nome').order('nome').then(({ data }) => setContratos(data || []));
  }, []);
  async function carregar() {
    const { data } = await supabase.from('rotas').select('id, nome, local, contrato_id, contratos(nome)').order('nome');
    setLista(data || []);
  }
  async function adicionar(e) {
    e.preventDefault();
    setSalvando(true);
    await supabase.from('rotas').insert({ nome: form.nome.trim(), local: form.local.trim() || null, contrato_id: Number(form.contrato_id) });
    setForm(f => ({ ...f, nome: '', local: '' }));
    await carregar();
    setSalvando(false);
  }
  async function remover(id) {
    if (!confirm('Remover esta rota?')) return;
    await supabase.from('rotas').delete().eq('id', id);
    setLista(l => l.filter(x => x.id !== id));
  }
  async function salvarLocal(id, local) {
    await supabase.from('rotas').update({ local: local.trim() || null }).eq('id', id);
    setLista(l => l.map(x => x.id === id ? { ...x, local: local.trim() || null } : x));
  }

  return (
    <section style={gCard}>
      <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: '1rem', fontWeight: 700, color: G.text, fontFamily: 'Space Grotesk, sans-serif' }}>Rotas</h2>
      <form onSubmit={adicionar} style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={gLabel}>Contrato</label>
          <select required value={form.contrato_id} onChange={e => setForm(f => ({ ...f, contrato_id: e.target.value }))} style={{ ...gInput, width: 220 }}>
            <option value="">Selecione...</option>
            {contratos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div>
          <label style={gLabel}>Nome da rota</label>
          <input required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} style={{ ...gInput, width: 160 }} placeholder="Ex: M1" />
        </div>
        <div>
          <label style={gLabel}>Local</label>
          <input value={form.local} onChange={e => setForm(f => ({ ...f, local: e.target.value }))} style={{ ...gInput, width: 180 }} placeholder="Ex: PETROLINA" />
        </div>
        <button style={gBtnGreen} type="submit" disabled={salvando}>+ Adicionar</button>
      </form>
      <div style={{ overflowX: 'auto', marginTop: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead><tr><th style={thS}>Rota</th><th style={thS}>Local</th><th style={thS}>Contrato</th><th style={thS}></th></tr></thead>
          <tbody>
            {lista.map(r => (
              <tr key={r.id}>
                <td style={{ ...tdS, fontWeight: 600 }}>{r.nome}</td>
                <td style={tdS}>
                  <input
                    defaultValue={r.local || ''}
                    onBlur={e => salvarLocal(r.id, e.target.value)}
                    style={{ ...gInput, width: 160, padding: '3px 8px' }}
                    placeholder="—"
                  />
                </td>
                <td style={tdS}>{r.contratos?.nome || '—'}</td>
                <td style={tdS}><button style={gBtnDanger} onClick={() => remover(r.id)}>Remover</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ── VEÍCULOS ───────────────────────────────────────────────────────────── */
function VeiculosSection() {
  const [lista, setLista] = useState([]);
  const [form, setForm] = useState({ placa: '', descricao: '', configuracao: '' });
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { carregar(); }, []);
  async function carregar() {
    const { data } = await supabase.from('veiculos').select('id, placa, descricao, configuracao').order('placa');
    setLista(data || []);
  }
  async function adicionar(e) {
    e.preventDefault();
    setSalvando(true);
    await supabase.from('veiculos').insert({ placa: form.placa.trim().toUpperCase(), descricao: form.descricao.trim(), configuracao: form.configuracao || null });
    setForm({ placa: '', descricao: '', configuracao: '' });
    await carregar();
    setSalvando(false);
  }
  async function remover(id) {
    if (!confirm('Remover este veículo?')) return;
    await supabase.from('veiculos').delete().eq('id', id);
    setLista(l => l.filter(x => x.id !== id));
  }
  async function salvarConfig(id, configuracao) {
    await supabase.from('veiculos').update({ configuracao: configuracao || null }).eq('id', id);
    setLista(l => l.map(x => x.id === id ? { ...x, configuracao } : x));
  }

  return (
    <section style={gCard}>
      <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: '1rem', fontWeight: 700, color: G.text, fontFamily: 'Space Grotesk, sans-serif' }}>Veículos</h2>
      <form onSubmit={adicionar} style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={gLabel}>Placa</label>
          <input required value={form.placa} onChange={e => setForm(f => ({ ...f, placa: e.target.value }))} style={{ ...gInput, width: 130 }} placeholder="Ex: PEF7B61" maxLength={8} />
        </div>
        <div>
          <label style={gLabel}>Descrição</label>
          <input required value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} style={{ ...gInput, width: 180 }} placeholder="Ex: Ônibus" />
        </div>
        <div>
          <label style={gLabel}>Configuração</label>
          <select value={form.configuracao} onChange={e => setForm(f => ({ ...f, configuracao: e.target.value }))} style={{ ...gInput, width: 180 }}>
            <option value="">Sem configuração</option>
            {TIPOS_VEICULO.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <button style={gBtnGreen} type="submit" disabled={salvando}>+ Adicionar</button>
      </form>
      <div style={{ overflowX: 'auto', marginTop: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead><tr><th style={thS}>Placa</th><th style={thS}>Descrição</th><th style={thS}>Configuração</th><th style={thS}></th></tr></thead>
          <tbody>
            {lista.map(v => (
              <tr key={v.id}>
                <td style={{ ...tdS, fontWeight: 600 }}>{v.placa}</td>
                <td style={tdS}>{v.descricao}</td>
                <td style={tdS}>
                  <select value={v.configuracao || ''} onChange={e => salvarConfig(v.id, e.target.value)} style={{ ...gInput, width: 180, padding: '3px 8px' }}>
                    <option value="">Sem configuração</option>
                    {TIPOS_VEICULO.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </td>
                <td style={tdS}><button style={gBtnDanger} onClick={() => remover(v.id)}>Remover</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ── LOGINS ─────────────────────────────────────────────────────────────── */
function LoginsSection() {
  const [lista, setLista] = useState([]);
  const [form, setForm] = useState({ nome: '', email: '', senha: '', perfil: 'motorista' });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [senhaTemp, setSenhaTemp] = useState(null); // { nome, senha }

  useEffect(() => { carregar(); }, []);
  async function carregar() {
    const { data } = await supabase.from('usuarios').select('id, nome, email, perfil').order('nome');
    setLista(data || []);
  }
  async function adicionar(e) {
    e.preventDefault();
    setErro('');
    setSalvando(true);
    const { error } = await supabase.rpc('criar_usuario', {
      p_nome: form.nome.trim(),
      p_email: form.email.trim().toLowerCase(),
      p_senha: form.senha,
      p_perfil: form.perfil,
    });
    if (error) { setErro('Erro: ' + error.message); setSalvando(false); return; }
    setForm({ nome: '', email: '', senha: '', perfil: 'motorista' });
    await carregar();
    setSalvando(false);
  }
  async function remover(id) {
    if (!confirm('Remover este usuário?')) return;
    await supabase.from('usuarios').delete().eq('id', id);
    setLista(l => l.filter(x => x.id !== id));
  }
  async function redefinirSenha(u) {
    if (!confirm(`Redefinir a senha de ${u.nome}? Uma senha temporária será gerada.`)) return;
    const { data, error } = await supabase.rpc('redefinir_senha_temporaria', { email_input: u.email });
    if (error || !data?.temp_senha) {
      alert('Erro ao redefinir senha: ' + (error?.message || 'Tente novamente.'));
      return;
    }
    setSenhaTemp({ nome: u.nome, email: u.email, senha: data.temp_senha });
  }

  return (
    <section style={gCard}>
      <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: '1rem', fontWeight: 700, color: G.text, fontFamily: 'Space Grotesk, sans-serif' }}>Logins</h2>

      {/* Modal senha temporária */}
      {senhaTemp && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 28, maxWidth: 360, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '1rem' }}>Senha redefinida</h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: '#6b7280' }}>
              Passe esta senha para <strong>{senhaTemp.nome}</strong> por WhatsApp ou ligação.
            </p>
            <div style={{
              background: '#f5f3ff', border: '1.5px solid #c4b5fd', borderRadius: 10,
              padding: '14px 18px', textAlign: 'center',
              fontSize: '1.6rem', fontWeight: 800, letterSpacing: '0.2em', color: '#5b21b6',
              fontFamily: 'monospace', marginBottom: 18,
            }}>
              {senhaTemp.senha}
            </div>
            <p style={{ margin: '0 0 16px', fontSize: '0.78rem', color: '#9ca3af' }}>
              Login: {senhaTemp.email}
            </p>
            <button style={{ ...gBtn, width: '100%' }} onClick={() => setSenhaTemp(null)}>
              Fechar
            </button>
          </div>
        </div>
      )}

      <form onSubmit={adicionar} style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={gLabel}>Nome</label>
          <input required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} style={{ ...gInput, width: 180 }} placeholder="Ex: João Silva" />
        </div>
        <div>
          <label style={gLabel}>E-mail</label>
          <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={{ ...gInput, width: 200 }} placeholder="joao@empresa.com" />
        </div>
        <div>
          <label style={gLabel}>Senha</label>
          <input required type="password" minLength={4} value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} style={{ ...gInput, width: 150 }} placeholder="Mínimo 4 caracteres" />
        </div>
        <div>
          <label style={gLabel}>Perfil</label>
          <select value={form.perfil} onChange={e => setForm(f => ({ ...f, perfil: e.target.value }))} style={{ ...gInput, width: 140 }}>
            <option value="motorista">Motorista</option>
            <option value="gestor">Gestor</option>
          </select>
        </div>
        <button style={gBtnGreen} type="submit" disabled={salvando}>+ Adicionar</button>
      </form>
      {erro && <p style={{ color: '#dc2626', fontSize: '0.85rem', marginBottom: 8 }}>{erro}</p>}
      <div style={{ overflowX: 'auto', marginTop: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead><tr><th style={thS}>Nome</th><th style={thS}>E-mail</th><th style={thS}>Perfil</th><th style={thS}></th></tr></thead>
          <tbody>
            {lista.map(u => (
              <tr key={u.id}>
                <td style={{ ...tdS, fontWeight: 600 }}>{u.nome}</td>
                <td style={tdS}>{u.email}</td>
                <td style={tdS}>
                  <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600, background: u.perfil === 'gestor' ? '#dbeafe' : '#dcfce7', color: u.perfil === 'gestor' ? '#1d4ed8' : '#166534' }}>
                    {u.perfil === 'gestor' ? 'Gestor' : 'Motorista'}
                  </span>
                </td>
                <td style={{ ...tdS, whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={{ ...gBtnSec, padding: '3px 10px', fontSize: '0.78rem' }} onClick={() => redefinirSenha(u)}>
                      Redefinir senha
                    </button>
                    <button style={gBtnDanger} onClick={() => remover(u.id)}>Remover</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
