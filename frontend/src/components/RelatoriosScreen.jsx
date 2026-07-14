import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase.js';
import { formatarMes } from '../storage.js';
import { s } from '../styles.js';
import RelatorioTurnoExtra from './RelatorioTurnoExtra.jsx';
import RelatorioTurnosRealizados from './RelatorioTurnosRealizados.jsx';

const DIAS_PT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const SUB_ABAS = ['Dom / Feriados', 'Turno Extra', 'Turnos Realizados'];

function domingosDomes(mesStr) {
  const [ano, m] = mesStr.split('-').map(Number);
  const result = [];
  const d = new Date(ano, m - 1, 1);
  while (d.getMonth() === m - 1) {
    if (d.getDay() === 0) result.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return result;
}

function fmtColData(dateStr) {
  const mes = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  const d = new Date(dateStr + 'T12:00:00');
  return { dia: `${String(d.getDate()).padStart(2,'0')}/${mes[d.getMonth()]}`, tipo: DIAS_PT[d.getDay()] };
}

const thH    = { padding: '5px 8px', fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap', background: '#1a5276', color: '#fff', border: '1px solid #154360', textAlign: 'center' };
const thHdom = { ...thH, background: '#d4ac0d', color: '#111' };
const thHfer = { ...thH, background: '#e59866', color: '#111' };
const td0    = { padding: '4px 8px', fontSize: '0.78rem', border: '1px solid #d5d8dc', whiteSpace: 'nowrap' };
const tdC    = { ...td0, textAlign: 'center', fontWeight: 600 };
const tdTot  = { ...tdC, background: '#d6eaf8', fontWeight: 700 };
const tdRotaNome = { ...td0, fontWeight: 700, background: '#eafaf1' };
const tdLocal    = { ...td0, color: '#555', background: '#eafaf1' };

export default function RelatoriosScreen() {
  const [subAba, setSubAba] = useState(0);

  // Filtros compartilhados entre os dois relatórios
  const [contratos,   setContratos]   = useState([]);
  const [contratoId,  setContratoId]  = useState('');
  const [mes,         setMes]         = useState('');

  // Estado específico do relatório Dom/Feriados
  const [rotas,      setRotas]      = useState([]);
  const [registros,  setRegistros]  = useState([]);
  const [carregando, setCarregando] = useState(false);

  const mesesDisponiveis = useMemo(() => {
    const lista = [];
    const now = new Date();
    for (let i = 0; i < 18; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      lista.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return lista;
  }, []);

  useEffect(() => {
    supabase.from('contratos').select('id, nome').order('nome')
      .then(({ data }) => setContratos(data || []));
  }, []);

  // Carrega dados do Dom/Feriados ao mudar filtros e estar na aba 0
  useEffect(() => {
    if (!contratoId || !mes) { setRotas([]); setRegistros([]); return; }
    if (subAba === 0) carregarDomFer();
  }, [contratoId, mes, subAba]);

  async function carregarDomFer() {
    setCarregando(true);
    const { data: rotasData } = await supabase
      .from('rotas').select('id, nome, local').eq('contrato_id', Number(contratoId)).order('nome');

    const rotaIds = (rotasData || []).map(r => r.id);
    let regsData = [];
    if (rotaIds.length > 0) {
      const { data } = await supabase.from('registros')
        .select('id, rota_id, data, domingo_feriado')
        .in('rota_id', rotaIds)
        .gte('data', `${mes}-01`).lte('data', `${mes}-31`)
        .eq('domingo_feriado', true);
      regsData = data || [];
    }
    setRotas(rotasData || []);
    setRegistros(regsData);
    setCarregando(false);
  }

  // Colunas: domingos do mês + feriados marcados
  const colunas = useMemo(() => {
    if (!mes) return [];
    const domingos = new Set(domingosDomes(mes));
    const feriados = new Set(registros.map(r => r.data).filter(d => !domingos.has(d)));
    return [...new Set([...domingos, ...feriados])].sort();
  }, [mes, registros]);

  // Matriz: rota_id → data → contagem
  const matriz = useMemo(() => {
    const m = {};
    for (const r of registros) {
      if (!m[r.rota_id]) m[r.rota_id] = {};
      m[r.rota_id][r.data] = (m[r.rota_id][r.data] || 0) + 1;
    }
    return m;
  }, [registros]);

  const totaisColunas = useMemo(() => {
    const t = {};
    for (const col of colunas)
      t[col] = rotas.reduce((acc, r) => acc + (matriz[r.id]?.[col] || 0), 0);
    return t;
  }, [colunas, rotas, matriz]);

  const contratoNome = contratos.find(c => c.id === Number(contratoId))?.nome || '';
  const totalGeral   = colunas.reduce((acc, col) => acc + (totaisColunas[col] || 0), 0);

  const subAbaStyle = (i) => ({
    padding: '6px 18px', border: 'none', background: 'none', cursor: 'pointer',
    fontWeight: 600, fontSize: '0.85rem',
    color: subAba === i ? '#2563eb' : '#6b7280',
    borderBottom: subAba === i ? '2px solid #2563eb' : '2px solid transparent',
    marginBottom: -1,
  });

  return (
    <div>
      {/* Filtros compartilhados */}
      <section style={s.card}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={s.label}>Contrato</label>
            <select value={contratoId} onChange={e => setContratoId(e.target.value)} style={{ ...s.input, minWidth: 220 }}>
              <option value="">Selecione...</option>
              {contratos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>Mês</label>
            <select value={mes} onChange={e => setMes(e.target.value)} style={{ ...s.input, minWidth: 160 }}>
              <option value="">Selecione...</option>
              {mesesDisponiveis.map(m => <option key={m} value={m}>{formatarMes(m)}</option>)}
            </select>
          </div>
          {contratoId && mes && subAba === 0 && (
            <button style={s.btnSecondary} onClick={carregarDomFer}>↻ Atualizar</button>
          )}
        </div>
      </section>

      {/* Sub-abas */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #e5e7eb' }}>
        {SUB_ABAS.map((nome, i) => (
          <button key={i} onClick={() => setSubAba(i)} style={subAbaStyle(i)}>{nome}</button>
        ))}
      </div>

      {/* ── RELATÓRIO DOM/FERIADOS ── */}
      {subAba === 0 && (
        <>
          {carregando && <p style={{ ...s.subtitle, padding: 24 }}>Carregando...</p>}

          {!carregando && contratoId && mes && rotas.length === 0 && (
            <div style={{ ...s.card, textAlign: 'center', color: '#6b7280', padding: '48px 24px' }}>
              Nenhuma rota encontrada para este contrato.
            </div>
          )}

          {!carregando && !contratoId && (
            <div style={{ ...s.card, textAlign: 'center', color: '#6b7280', padding: '48px 24px' }}>
              Selecione o contrato e o mês para exibir o relatório.
            </div>
          )}

          {!carregando && rotas.length > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', background: '#1a5276', color: '#fff', borderRadius: '8px 8px 0 0', padding: '10px 16px', fontWeight: 700, fontSize: '0.95rem', marginTop: 8 }}>
                <span>CONTROLE DE TURNO NORMAL (DOMINGOS E FERIADOS) — {contratoNome.toUpperCase()}</span>
                <span>{formatarMes(mes).toUpperCase()}</span>
              </div>

              <div style={{ overflowX: 'auto', border: '1px solid #154360', borderTop: 0, borderRadius: '0 0 8px 8px', marginBottom: 24 }}>
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ ...thH, textAlign: 'center' }} colSpan={2}>ROTA</th>
                      {colunas.map(col => {
                        const { dia, tipo } = fmtColData(col);
                        const isDom = tipo === 'dom';
                        return (
                          <th key={col} style={isDom ? thHdom : thHfer}>
                            <div>{dia}</div>
                            <div style={{ fontSize: '0.6rem', opacity: 0.85 }}>{tipo}</div>
                          </th>
                        );
                      })}
                      <th style={{ ...thH, background: '#117a65' }}>TOTAL</th>
                    </tr>
                    <tr>
                      <th style={{ ...thH, fontSize: '0.65rem' }}>NOME</th>
                      <th style={{ ...thH, fontSize: '0.65rem' }}>LOCAL</th>
                      {colunas.map(col => <th key={col} style={{ ...thH, fontSize: '0.6rem', opacity: 0.6 }}></th>)}
                      <th style={{ ...thH, background: '#117a65' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rotas.map((rota, i) => {
                      const totalRota = colunas.reduce((acc, col) => acc + (matriz[rota.id]?.[col] || 0), 0);
                      return (
                        <tr key={rota.id} style={{ background: i % 2 !== 0 ? '#f8f9fa' : '#fff' }}>
                          <td style={tdRotaNome}>{rota.nome}</td>
                          <td style={tdLocal}>{rota.local || '—'}</td>
                          {colunas.map(col => {
                            const val = matriz[rota.id]?.[col] || 0;
                            return (
                              <td key={col} style={{ ...tdC, color: val > 0 ? '#117a65' : '#9ca3af' }}>
                                {val > 0 ? val : '—'}
                              </td>
                            );
                          })}
                          <td style={tdTot}>{totalRota > 0 ? totalRota : '—'}</td>
                        </tr>
                      );
                    })}
                    <tr style={{ background: '#d6eaf8' }}>
                      <td style={{ ...td0, fontWeight: 700, background: '#d6eaf8' }} colSpan={2}>TOTAL</td>
                      {colunas.map(col => (
                        <td key={col} style={{ ...tdC, background: '#d6eaf8', color: totaisColunas[col] > 0 ? '#1a5276' : '#9ca3af' }}>
                          {totaisColunas[col] > 0 ? totaisColunas[col] : '—'}
                        </td>
                      ))}
                      <td style={{ ...tdTot, background: '#a9cce3', fontSize: '0.9rem' }}>{totalGeral > 0 ? totalGeral : '—'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {/* ── RELATÓRIO TURNO EXTRA ── */}
      {subAba === 1 && (
        <RelatorioTurnoExtra contratoId={contratoId} mes={mes} />
      )}

      {subAba === 2 && (
        <RelatorioTurnosRealizados contratoId={contratoId} mes={mes} />
      )}
    </div>
  );
}
