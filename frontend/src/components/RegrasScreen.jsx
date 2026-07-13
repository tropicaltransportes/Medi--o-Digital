import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase.js';
import { s } from '../styles.js';

const inputNum = { ...s.input, width: '100%' };

export default function RegrasScreen() {
  const [contratos, setContratos] = useState([]);
  const [contratoId, setContratoId] = useState('');
  const [regra, setRegra] = useState(null);       // regras_contrato row
  const [valores, setValores] = useState([]);      // valores_veiculo rows
  const [form, setForm] = useState({ dias_mes: '', km_franquia_mensal: '' });
  const [novaConfig, setNovaConfig] = useState({ configuracao: '', valor_mensal: '' });
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
    });
    setNovaConfig({ configuracao: '', valor_mensal: '' });
    const { data: v } = await supabase.from('valores_veiculo').select('*').eq('regra_id', regra.id).order('configuracao');
    setValores(v || []);
    setSalvando(false);
  }

  async function removerConfig(id) {
    await supabase.from('valores_veiculo').delete().eq('id', id);
    setValores(v => v.filter(x => x.id !== id));
  }

  async function editarValor(id, novoValor) {
    await supabase.from('valores_veiculo').update({ valor_mensal: Number(novoValor) }).eq('id', id);
    setValores(v => v.map(x => x.id === id ? { ...x, valor_mensal: Number(novoValor) } : x));
  }

  const kmDia = form.dias_mes && form.km_franquia_mensal
    ? (Number(form.km_franquia_mensal) / Number(form.dias_mes)).toFixed(1)
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
                        <th style={s.th}>Valor mensal (R$)</th>
                        <th style={s.th}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {valores.map(v => (
                        <tr key={v.id}>
                          <td style={s.td}>{v.configuracao}</td>
                          <td style={s.td}>
                            <input type="number" min="0" defaultValue={v.valor_mensal}
                              onBlur={e => editarValor(v.id, e.target.value)}
                              style={{ ...s.input, width: 140, padding: '4px 8px' }} />
                          </td>
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

              <form onSubmit={adicionarConfig} style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div>
                  <label style={s.label}>Configuração</label>
                  <input required value={novaConfig.configuracao}
                    onChange={e => setNovaConfig(n => ({ ...n, configuracao: e.target.value }))}
                    style={{ ...s.input, width: 220 }} placeholder="Ex: Ônibus 52 lugares" />
                </div>
                <div>
                  <label style={s.label}>Valor mensal (R$)</label>
                  <input required type="number" min="0" value={novaConfig.valor_mensal}
                    onChange={e => setNovaConfig(n => ({ ...n, valor_mensal: e.target.value }))}
                    style={{ ...s.input, width: 160 }} placeholder="Ex: 15000" />
                </div>
                <button style={s.btnGreen} type="submit" disabled={salvando}>+ Adicionar</button>
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
