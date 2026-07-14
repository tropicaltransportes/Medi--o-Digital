import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase.js';
import { s } from '../styles.js';

const DIAS_PT  = ['dom','seg','ter','qua','qui','sex','sáb'];
const MESES_PT = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

function getDiasDoMes(mesStr) {
  const [ano, m] = mesStr.split('-').map(Number);
  const dias = [];
  const d = new Date(ano, m - 1, 1);
  while (d.getMonth() === m - 1) {
    dias.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return dias;
}

function fmtDia(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return {
    label: `${String(d.getDate()).padStart(2, '0')}/${MESES_PT[d.getMonth()]}`,
    diaSem: DIAS_PT[d.getDay()],
    isDom: d.getDay() === 0,
  };
}

function cellBg(count, isDomFer, par) {
  if (count >= 3) return '#15803d';
  if (count === 2) return '#4ade80';
  if (count === 1) return '#dcfce7';
  if (isDomFer)    return '#fff7ed';
  return par ? '#fff' : '#f8fafc';
}
function cellColor(count) {
  if (count >= 3) return '#fff';
  if (count >= 1) return '#14532d';
  return '#6b7280';
}

const W_NOME  = 140;
const W_LOCAL = 110;
const W_DIA   = 44;

const thBase = {
  padding: '4px 4px', fontSize: '0.65rem', fontWeight: 700,
  background: '#14532d', color: '#fff', border: '1px solid rgba(255,255,255,0.15)',
  whiteSpace: 'nowrap', textAlign: 'center',
};
const tdFix = (left, par) => ({
  padding: '4px 8px', fontSize: '0.78rem', border: '1px solid #e5e7eb',
  position: 'sticky', left, background: par ? '#fff' : '#f8fafc',
  zIndex: 1, whiteSpace: 'nowrap',
});
const tdTot = {
  padding: '4px 6px', textAlign: 'center', fontWeight: 700,
  fontSize: '0.82rem', border: '1px solid #e5e7eb',
  background: '#f0fdf4', color: '#15803d', whiteSpace: 'nowrap',
};

export default function RelatorioTurnosRealizados({ contratoId, mes }) {
  const [rotas,      setRotas]      = useState([]);
  const [veiculos,   setVeiculos]   = useState([]);
  const [registros,  setRegistros]  = useState([]);
  const [domFerSet,  setDomFerSet]  = useState(new Set());
  const [anotacoes,  setAnotacoes]  = useState({});
  const [carregando, setCarregando] = useState(false);
  const [tooltip,    setTooltip]    = useState(null);
  const [editando,   setEditando]   = useState(null);

  useEffect(() => {
    if (!contratoId || !mes) return;
    carregar();
  }, [contratoId, mes]);

  async function carregar() {
    setCarregando(true);
    setTooltip(null);
    setEditando(null);
    const cid = Number(contratoId);

    const [{ data: rotasData }, { data: veicData }] = await Promise.all([
      supabase.from('rotas').select('id, nome, local').eq('contrato_id', cid).order('nome'),
      supabase.from('veiculos').select('id, placa').order('placa'),
    ]);

    const rotaIds = (rotasData || []).map(r => r.id);
    let regs = [], regsDF = [], anots = [];

    if (rotaIds.length > 0) {
      const [r1, r2, r3] = await Promise.all([
        supabase.from('registros')
          .select('id, rota_id, veiculo_id, data, horario_saida, horario_chegada, finalidade, observacao')
          .in('rota_id', rotaIds)
          .eq('tipo_turno', 'rota')
          .eq('status', 'completo')
          .gte('data', `${mes}-01`).lte('data', `${mes}-31`),
        supabase.from('registros').select('data')
          .in('rota_id', rotaIds).eq('domingo_feriado', true)
          .gte('data', `${mes}-01`).lte('data', `${mes}-31`),
        supabase.from('anotacoes_relatorio').select('rota_id, data, texto')
          .in('rota_id', rotaIds)
          .gte('data', `${mes}-01`).lte('data', `${mes}-31`),
      ]);
      regs   = r1.data || [];
      regsDF = r2.data || [];
      anots  = r3.data || [];
    }

    const diasMes = mes ? getDiasDoMes(mes) : [];
    const domFer = new Set([
      ...regsDF.map(r => r.data),
      ...diasMes.filter(d => new Date(d + 'T12:00:00').getDay() === 0),
    ]);

    const anotMap = {};
    for (const a of anots) anotMap[`${a.rota_id}_${a.data}`] = a.texto;

    setRotas(rotasData || []);
    setVeiculos(veicData || []);
    setRegistros(regs);
    setDomFerSet(domFer);
    setAnotacoes(anotMap);
    setCarregando(false);
  }

  async function salvarAnotacao(rotaId, data, texto) {
    const key = `${rotaId}_${data}`;
    if (texto.trim()) {
      await supabase.from('anotacoes_relatorio')
        .upsert({ rota_id: rotaId, data, texto: texto.trim() }, { onConflict: 'rota_id,data' });
      setAnotacoes(prev => ({ ...prev, [key]: texto.trim() }));
    } else {
      await supabase.from('anotacoes_relatorio').delete().eq('rota_id', rotaId).eq('data', data);
      setAnotacoes(prev => { const n = { ...prev }; delete n[key]; return n; });
    }
    setEditando(null);
  }

  const dias = useMemo(() => mes ? getDiasDoMes(mes) : [], [mes]);

  const matriz = useMemo(() => {
    const m = {};
    for (const r of registros) {
      if (!m[r.rota_id]) m[r.rota_id] = {};
      if (!m[r.rota_id][r.data]) m[r.rota_id][r.data] = [];
      m[r.rota_id][r.data].push(r);
    }
    return m;
  }, [registros]);

  function placaVeiculo(vid) {
    return veiculos.find(v => v.id === vid)?.placa || '—';
  }

  function handleCellEnter(e, regs) {
    if (!regs.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = rect.bottom + 6;
    const adjustedY = y + 180 > window.innerHeight ? rect.top - 184 : y;
    setTooltip({ regs, x: Math.min(rect.left, window.innerWidth - 250), y: adjustedY });
  }

  if (!contratoId || !mes) return (
    <div style={{ textAlign: 'center', color: '#6b7280', padding: '48px 24px' }}>
      Selecione o contrato e o mês para exibir o relatório.
    </div>
  );
  if (carregando) return <p style={{ ...s.subtitle, padding: 24 }}>Carregando...</p>;
  if (!rotas.length) return (
    <div style={{ textAlign: 'center', color: '#6b7280', padding: '48px 24px' }}>
      Nenhuma rota encontrada para este contrato.
    </div>
  );

  return (
    <div>
      {/* Legenda */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 10, fontSize: '0.76rem', alignItems: 'center', color: '#374151' }}>
        {[
          { bg: '#fff7ed', border: '1px solid #fed7aa', label: 'Dom / Feriado' },
          { bg: '#dcfce7', border: '1px solid #86efac', label: '1 turno realizado' },
          { bg: '#4ade80', label: '2 turnos realizados' },
          { bg: '#15803d', color: '#fff', label: '3+ turnos realizados' },
        ].map(({ bg, border, color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 14, height: 14, background: bg, border: border || 'none', borderRadius: 3 }} />
            <span>{label}</span>
          </div>
        ))}
        <span style={{ color: '#9ca3af', marginLeft: 4 }}>· Clique numa célula para adicionar anotação</span>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid #14532d', borderRadius: 8 }}>
        <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: W_NOME + W_LOCAL + dias.length * W_DIA + 54 }}>
          <thead>
            <tr>
              <th style={{ ...thBase, position: 'sticky', left: 0, zIndex: 3, width: W_NOME, textAlign: 'left', padding: '5px 8px' }}>NOME</th>
              <th style={{ ...thBase, position: 'sticky', left: W_NOME, zIndex: 3, width: W_LOCAL, textAlign: 'left', padding: '5px 8px', borderLeft: '2px solid rgba(255,255,255,0.3)' }}>LOCAL</th>
              {dias.map(dia => {
                const { label, diaSem, isDom } = fmtDia(dia);
                const isFer = !isDom && domFerSet.has(dia);
                return (
                  <th key={dia} style={{ ...thBase, width: W_DIA, background: isDom || isFer ? '#b45309' : '#14532d' }}>
                    <div>{label}</div>
                    <div style={{ fontSize: '0.55rem', opacity: 0.85 }}>{diaSem}</div>
                  </th>
                );
              })}
              <th style={{ ...thBase, width: 54, background: '#052e16', position: 'sticky', right: 0, zIndex: 3 }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {rotas.map((rota, ri) => {
              const par = ri % 2 === 0;
              const rotaRegs = matriz[rota.id] || {};
              const total = Object.values(rotaRegs).reduce((acc, arr) => acc + arr.length, 0);
              return (
                <tr key={rota.id}>
                  <td style={{ ...tdFix(0, par), fontWeight: 600, color: '#14532d' }}>{rota.nome}</td>
                  <td style={{ ...tdFix(W_NOME, par), color: '#6b7280', borderLeft: '2px solid #e5e7eb' }}>{rota.local || '—'}</td>
                  {dias.map(dia => {
                    const regs = rotaRegs[dia] || [];
                    const count = regs.length;
                    const isDomFer = domFerSet.has(dia);
                    const key = `${rota.id}_${dia}`;
                    const anotacao = anotacoes[key] || '';
                    const isEdit = editando?.rotaId === rota.id && editando?.data === dia;
                    const bg = cellBg(count, isDomFer, par);
                    const fg = cellColor(count);

                    return (
                      <td
                        key={dia}
                        style={{
                          width: W_DIA, minWidth: W_DIA, maxWidth: W_DIA,
                          padding: '2px', textAlign: 'center', verticalAlign: 'middle',
                          border: '1px solid #e5e7eb', cursor: 'pointer',
                          background: bg, color: fg,
                        }}
                        onMouseEnter={e => count > 0 && handleCellEnter(e, regs)}
                        onMouseLeave={() => setTooltip(null)}
                        onClick={() => { setTooltip(null); setEditando({ rotaId: rota.id, data: dia, texto: anotacao }); }}
                      >
                        {isEdit ? (
                          <input
                            autoFocus
                            defaultValue={anotacao}
                            style={{ width: 38, fontSize: '0.62rem', border: '1px solid #15803d', borderRadius: 3, padding: '1px 2px', textAlign: 'center', background: '#fff', color: '#111' }}
                            onBlur={e => salvarAnotacao(rota.id, dia, e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditando(null); }}
                            onClick={e => e.stopPropagation()}
                          />
                        ) : (
                          <div style={{ lineHeight: 1.2, userSelect: 'none' }}>
                            {count > 0 && <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>{count}</div>}
                            {anotacao && (
                              <div style={{ fontSize: '0.56rem', fontWeight: 400, color: count >= 2 ? 'rgba(255,255,255,0.9)' : '#4b5563', marginTop: 1 }}>
                                {anotacao}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td style={{ ...tdTot, background: par ? '#f0fdf4' : '#dcfce7' }}>
                    {total > 0 ? total : <span style={{ color: '#d1d5db' }}>—</span>}
                  </td>
                </tr>
              );
            })}

            <tr style={{ background: '#dcfce7' }}>
              <td style={{ ...tdFix(0, false), fontWeight: 700, color: '#14532d', background: '#dcfce7' }} colSpan={2}>TOTAL</td>
              {dias.map(dia => {
                const t = rotas.reduce((acc, r) => acc + (matriz[r.id]?.[dia]?.length || 0), 0);
                return (
                  <td key={dia} style={{ ...tdTot, background: '#dcfce7', color: t > 0 ? '#14532d' : '#d1d5db', fontSize: '0.75rem' }}>
                    {t > 0 ? t : '—'}
                  </td>
                );
              })}
              <td style={{ ...tdTot, background: '#86efac', color: '#052e16', fontSize: '0.9rem' }}>
                {registros.length > 0 ? registros.length : '—'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed', top: tooltip.y, left: tooltip.x, zIndex: 500,
          background: '#1e293b', color: '#f1f5f9', borderRadius: 8,
          padding: '10px 14px', fontSize: '0.78rem',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)', minWidth: 220, maxWidth: 280,
          pointerEvents: 'none',
        }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: '#86efac', fontSize: '0.8rem' }}>
            {tooltip.regs.length} turno{tooltip.regs.length !== 1 ? 's' : ''} realizado{tooltip.regs.length !== 1 ? 's' : ''}
          </div>
          {tooltip.regs.map((r, i) => (
            <div key={i} style={{
              borderTop: i > 0 ? '1px solid rgba(255,255,255,0.1)' : 'none',
              paddingTop: i > 0 ? 6 : 0, marginTop: i > 0 ? 6 : 0,
            }}>
              <div>
                <span style={{ color: '#86efac', fontWeight: 600 }}>
                  {r.horario_saida?.slice(0, 5) || '?'} → {r.horario_chegada?.slice(0, 5) || '?'}
                </span>
                <span style={{ color: '#cbd5e1', marginLeft: 8 }}>{placaVeiculo(r.veiculo_id)}</span>
              </div>
              {r.finalidade && <div style={{ color: '#94a3b8', fontSize: '0.72rem', marginTop: 2 }}>{r.finalidade}</div>}
              {r.observacao  && <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>{r.observacao}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
