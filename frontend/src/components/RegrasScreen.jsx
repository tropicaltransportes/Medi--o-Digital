import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase.js';
import { s } from '../styles.js';

const inputNum = { ...s.input, width: '100%' };

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
    let regraId = regra?.id;
    if (regra) {
      await supabase.from('regras_contrato').update(payload).eq('id', regra.id);
    } else {
      const { data } = await supabase.from('regras_contrato').insert(payload).select().single();
      regraId = data?.id;
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
    <div>
      {/* Seleção de contrato */}
      <section style={s.card}>
        <label style={s.label}>Contrato</label>
        <select value={contratoId} onChange={e => setContratoId(e.target.value)} style={{ ...s.input, maxWidth: 320 }}>
          <option value="">Selecione um contrato...</option>
          {contratos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </section>

      {contratoId && (
        <>
          {/* Regras gerais */}
          <section style={s.card}>
            <h2 style={s.h2}>Franquia mensal — {contratoNome}</h2>
            <form onSubmit={salvarRegra}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, alignItems: 'end' }}>
                <div>
                  <label style={s.label}>Dias no mês</label>
                  <input required type="number" min="1" max="31" value={form.dias_mes}
                    onChange={e => setForm(f => ({ ...f, dias_mes: e.target.value }))} style={inputNum} placeholder="Ex: 26" />
                </div>
                <div>
                  <label style={s.label}>KM franquia mensal</label>
                  <input required type="number" min="0" value={form.km_franquia_mensal}
                    onChange={e => setForm(f => ({ ...f, km_franquia_mensal: e.target.value }))} style={inputNum} placeholder="Ex: 5000" />
                </div>
                <div>
                  <label style={s.label}>KM / dia (calculado)</label>
                  <div style={{ ...inputNum, background: '#f3f4f6', color: '#374151', fontWeight: 600, display: 'flex', alignItems: 'center', height: 38, borderRadius: 6, border: '1px solid #d1d5db', padding: '0 12px' }}>
                    {kmDia}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button style={{ ...s.btn, opacity: salvando ? 0.7 : 1 }} type="submit" disabled={salvando}>
                    {salvando ? 'Salvando...' : regra ? 'Atualizar' : 'Salvar'}
                  </button>
                  {msg && <span style={{ marginLeft: 12, color: '#16a34a', fontWeight: 600, fontSize: '0.875rem' }}>{msg}</span>}
                </div>
              </div>
            </form>
          </section>

          {/* Valores por configuração de veículo */}
          {regra && (
            <section style={s.card}>
              <h2 style={s.h2}>Valor mensal por configuração de veículo</h2>

              {valores.length > 0 && (
                <div style={s.tableWrap}>
                  <table style={s.table}>
                    <thead>
                      <tr>
                        <th style={s.th}>Configuração</th>
                        <th style={s.th}>Valor mensal</th>
                        <th style={s.th}>Turno Normal</th>
                        <th style={s.th}>Turno Extra</th>
                        <th style={s.th}>KM Extra Normal</th>
                        <th style={s.th}>KM Extra T. Extra</th>
                        <th style={s.th}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {valores.map(v => (
                        <tr key={v.id}>
                          <td style={{ ...s.td, fontWeight: 600 }}>{v.configuracao}</td>
                          {['valor_mensal', 'valor_turno_normal', 'valor_turno_extra', 'valor_km_extra_normal', 'valor_km_extra_turno_extra'].map(campo => (
                            <td key={campo} style={s.td}>
                              <input type="number" min="0" step="0.01" defaultValue={v[campo] ?? 0}
                                onBlur={e => editarCampo(v.id, campo, e.target.value)}
                                style={{ ...s.input, width: 120, padding: '4px 8px' }} />
                            </td>
                          ))}
                          <td style={s.td}>
                            <button style={{ ...s.btnSecondary, color: '#dc2626', borderColor: '#fca5a5', padding: '4px 10px', fontSize: '0.8rem' }}
                              onClick={() => removerConfig(v.id)}>
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
                    <label style={s.label}>Configuração</label>
                    <select required value={novaConfig.configuracao}
                      onChange={e => setNovaConfig(n => ({ ...n, configuracao: e.target.value }))}
                      style={s.input}>
                      <option value="">Selecione...</option>
                      {TIPOS_VEICULO.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  {[
                    ['valor_mensal', 'Valor mensal (R$)'],
                    ['valor_turno_normal', 'Turno Normal (R$)'],
                    ['valor_turno_extra', 'Turno Extra (R$)'],
                    ['valor_km_extra_normal', 'KM Extra Normal (R$)'],
                    ['valor_km_extra_turno_extra', 'KM Extra T. Extra (R$)'],
                  ].map(([campo, label]) => (
                    <div key={campo}>
                      <label style={s.label}>{label}</label>
                      <input required type="number" min="0" step="0.01" value={novaConfig[campo]}
                        onChange={e => setNovaConfig(n => ({ ...n, [campo]: e.target.value }))}
                        style={s.input} placeholder="0,00" />
                    </div>
                  ))}
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button style={s.btnGreen} type="submit" disabled={salvando}>+ Adicionar</button>
                  </div>
                </div>
              </form>
            </section>
          )}

          {!regra && (
            <p style={{ ...s.subtitle, marginTop: 8 }}>Salve a franquia mensal primeiro para depois adicionar configurações de veículo.</p>
          )}
        </>
      )}
    </div>
  );
}
