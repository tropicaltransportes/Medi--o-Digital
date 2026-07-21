import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase.js';
import { G, gCard, gLabel, gInput, gBtn, gBtnSec, gBtnGreen, gBtnDanger, gTh, gTd, PillDD, Selo } from '../gestorUI.jsx';

const TIPOS_VEICULO = ['RODOVIÁRIO', 'SEMI RODOVIÁRIO', 'URBANO', 'MICRO', 'VAN', 'PEQUENO PORTE'];

export default function RegrasScreen() {
  const [contratos, setContratos] = useState([]);
  const [contratoId, setContratoId] = useState('');
  const [regra, setRegra] = useState(null);
  const [valores, setValores] = useState([]);
  const [form, setForm] = useState({ dias_mes: '', km_franquia_mensal: '' });
  const [novaConfig, setNovaConfig] = useState({ configuracao: '', valor_mensal: '', valor_turno_normal: '', valor_turno_extra: '', valor_km_extra_normal: '', valor_km_extra_turno_extra: '' });
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState('');
  const [ddAberto, setDdAberto] = useState(false);

  useEffect(() => {
    supabase.from('contratos').select('id, nome').order('nome')
      .then(({ data }) => setContratos(data || []));
  }, []);

  useEffect(() => {
    if (!contratoId) { setRegra(null); setValores([]); setForm({ dias_mes: '', km_franquia_mensal: '' }); return; }
    carregarRegra(Number(contratoId));
  }, [contratoId]);

  async function carregarRegra(cid) {
    const { data: r } = await supabase.from('regras_contrato').select('*').eq('contrato_id', cid).maybeSingle();
    if (r) {
      setRegra(r);
      setForm({ dias_mes: String(r.dias_mes), km_franquia_mensal: String(r.km_franquia_mensal) });
      const { data: v } = await supabase.from('valores_veiculo').select('*').eq('regra_id', r.id).order('configuracao');
      setValores(v || []);
    } else {
      setRegra(null);
      setValores([]);
      setForm({ dias_mes: '', km_franquia_mensal: '' });
    }
  }

  async function salvarRegra(e) {
    e.preventDefault();
    setSalvando(true);
    setMsg('');
    const payload = { contrato_id: Number(contratoId), dias_mes: Number(form.dias_mes), km_franquia_mensal: Number(form.km_franquia_mensal) };
    if (regra) {
      await supabase.from('regras_contrato').update(payload).eq('id', regra.id);
    } else {
      await supabase.from('regras_contrato').insert(payload).select().single();
    }
    await carregarRegra(Number(contratoId));
    setMsg('Regra salva!');
    setSalvando(false);
    setTimeout(() => setMsg(''), 2000);
  }

  async function adicionarConfig(e) {
    e.preventDefault();
    if (!regra) return;
    setSalvando(true);
    await supabase.from('valores_veiculo').insert({
      regra_id: regra.id,
      configuracao: novaConfig.configuracao.trim(),
      valor_mensal: Number(novaConfig.valor_mensal),
      valor_turno_normal: Number(novaConfig.valor_turno_normal) || 0,
      valor_turno_extra: Number(novaConfig.valor_turno_extra) || 0,
      valor_km_extra_normal: Number(novaConfig.valor_km_extra_normal) || 0,
      valor_km_extra_turno_extra: Number(novaConfig.valor_km_extra_turno_extra) || 0,
    });
    setNovaConfig({ configuracao: '', valor_mensal: '', valor_turno_normal: '', valor_turno_extra: '', valor_km_extra_normal: '', valor_km_extra_turno_extra: '' });
    const { data: v } = await supabase.from('valores_veiculo').select('*').eq('regra_id', regra.id).order('configuracao');
    setValores(v || []);
    setSalvando(false);
  }

  async function removerConfig(id) {
    await supabase.from('valores_veiculo').delete().eq('id', id);
    setValores(v => v.filter(x => x.id !== id));
  }

  async function editarCampo(id, campo, valor) {
    await supabase.from('valores_veiculo').update({ [campo]: Number(valor) }).eq('id', id);
    setValores(v => v.map(x => x.id === id ? { ...x, [campo]: Number(valor) } : x));
  }

  const kmDia = form.dias_mes && form.km_franquia_mensal
    ? Math.ceil(Number(form.km_franquia_mensal) / Number(form.dias_mes))
    : '—';

  const contratoNome = contratos.find(c => c.id === Number(contratoId))?.nome || '';

  return (
    <div style={{ maxWidth: 980 }}>

      {/* Header + Selo */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, marginBottom: 22 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 22, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.01em', color: G.text }}>
            Regras de Faturamento
          </h1>
          <p style={{ margin: 0, fontSize: 13.5, color: G.muted }}>
            Franquia mensal e valores por configuração de veículo, por contrato.
          </p>
        </div>
        <Selo num={contratos.length} label="Contratos" />
      </div>

      {/* Seleção de contrato */}
      <div style={gCard}>
        <label style={gLabel}>Contrato</label>
        <PillDD
          label={contratoNome || 'Selecione um contrato...'}
          open={ddAberto}
          onToggle={() => setDdAberto(o => !o)}
          onBlur={() => setTimeout(() => setDdAberto(false), 150)}
          options={contratos.map(c => ({ value: String(c.id), label: c.nome, active: String(c.id) === contratoId }))}
          onSelect={v => { setContratoId(v); setDdAberto(false); }}
          minWidth={320}
        />
      </div>

      {contratoId && (
        <>
          {/* Franquia mensal */}
          <div style={{ ...gCard, marginTop: 16 }}>
            <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: '1rem', fontWeight: 700, color: G.text, fontFamily: 'Space Grotesk, sans-serif' }}>
              Franquia mensal — {contratoNome}
            </h2>
            <form onSubmit={salvarRegra}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, alignItems: 'end' }}>
                <div>
                  <label style={gLabel}>Dias no mês</label>
                  <input required type="number" min="1" max="31" value={form.dias_mes}
                    onChange={e => setForm(f => ({ ...f, dias_mes: e.target.value }))}
                    style={{ ...gInput, width: '100%' }} placeholder="Ex: 26" />
                </div>
                <div>
                  <label style={gLabel}>KM franquia mensal</label>
                  <input required type="number" min="0" value={form.km_franquia_mensal}
                    onChange={e => setForm(f => ({ ...f, km_franquia_mensal: e.target.value }))}
                    style={{ ...gInput, width: '100%' }} placeholder="Ex: 5000" />
                </div>
                <div>
                  <label style={gLabel}>KM / dia (calculado)</label>
                  <div style={{ ...gInput, background: G.surfaceAlt, fontWeight: 700, display: 'flex', alignItems: 'center', color: G.text }}>
                    {kmDia}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
                  <button style={{ ...gBtn, opacity: salvando ? 0.7 : 1 }} type="submit" disabled={salvando}>
                    {salvando ? 'Salvando...' : regra ? 'Atualizar' : 'Salvar franquia'}
                  </button>
                  {msg && <span style={{ color: G.green, fontWeight: 600, fontSize: '0.875rem' }}>{msg}</span>}
                </div>
              </div>
            </form>
          </div>

          {/* Valores por configuração de veículo */}
          {regra && (
            <div style={{ ...gCard, marginTop: 16 }}>
              <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: '1rem', fontWeight: 700, color: G.text, fontFamily: 'Space Grotesk, sans-serif' }}>
                Valor mensal por configuração de veículo
              </h2>

              {valores.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr>
                        <th style={gTh}>Configuração</th>
                        <th style={gTh}>Valor mensal</th>
                        <th style={gTh}>Turno Normal</th>
                        <th style={gTh}>Turno Extra</th>
                        <th style={gTh}>KM Extra Normal</th>
                        <th style={gTh}>KM Extra T. Extra</th>
                        <th style={gTh}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {valores.map(v => (
                        <tr key={v.id}>
                          <td style={{ ...gTd, fontWeight: 700 }}>{v.configuracao}</td>
                          {['valor_mensal', 'valor_turno_normal', 'valor_turno_extra', 'valor_km_extra_normal', 'valor_km_extra_turno_extra'].map(campo => (
                            <td key={campo} style={gTd}>
                              <input type="number" min="0" step="0.01" defaultValue={v[campo] ?? 0}
                                onBlur={e => editarCampo(v.id, campo, e.target.value)}
                                style={{ ...gInput, width: 110, padding: '4px 8px', fontSize: '0.82rem' }} />
                            </td>
                          ))}
                          <td style={gTd}>
                            <button style={gBtnDanger} onClick={() => removerConfig(v.id)}>
                              Remover
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <form onSubmit={adicionarConfig}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginTop: 16, alignItems: 'flex-end' }}>
                  <div>
                    <label style={gLabel}>Configuração</label>
                    <select required value={novaConfig.configuracao}
                      onChange={e => setNovaConfig(n => ({ ...n, configuracao: e.target.value }))}
                      style={{ ...gInput, width: '100%' }}>
                      <option value="">Selecione...</option>
                      {TIPOS_VEICULO.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  {[
                    ['valor_mensal', 'Mensal (R$)'],
                    ['valor_turno_normal', 'Turno Normal'],
                    ['valor_turno_extra', 'Turno Extra'],
                    ['valor_km_extra_normal', 'KM Extra Normal'],
                    ['valor_km_extra_turno_extra', 'KM Extra T.Extra'],
                  ].map(([campo, label]) => (
                    <div key={campo}>
                      <label style={gLabel}>{label}</label>
                      <input required type="number" min="0" step="0.01" value={novaConfig[campo]}
                        onChange={e => setNovaConfig(n => ({ ...n, [campo]: e.target.value }))}
                        style={{ ...gInput, width: '100%' }} placeholder="0,00" />
                    </div>
                  ))}
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button style={gBtnGreen} type="submit" disabled={salvando}>+ Adicionar</button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {!regra && (
            <p style={{ color: G.muted, fontSize: '0.875rem', marginTop: 8 }}>
              Salve a franquia mensal primeiro para depois adicionar configurações de veículo.
            </p>
          )}
        </>
      )}
    </div>
  );
}
