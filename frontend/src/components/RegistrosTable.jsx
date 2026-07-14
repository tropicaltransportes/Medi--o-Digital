import React, { useEffect, useRef, useState } from 'react';
import { kmRodados } from '../storage.js';
import { s } from '../styles.js';

const statusStyle = {
  rascunho: { color: '#b45309', fontWeight: 600 },
  completo:  { color: '#16a34a', fontWeight: 600 },
};

const btnAcao = {
  border: '1px solid #d1d5db', borderRadius: 5, padding: '3px 10px',
  fontSize: '0.75rem', cursor: 'pointer', background: '#fff', fontWeight: 600,
};

const TURNO_ORDER = { rota: 0, normal: 1, 'turno extra': 2, 'rodada interna': 3, manutencao: 4 };
const DEFAULT_ORDEM = { col: 'data', dir: 'desc' };

// Definição completa de colunas (id usado para sort e visibilidade)
const ALL_COLS = [
  { id: 'dom_fer',  label: 'Dom/Fer',    sortable: true,  gestor: true,  align: 'center' },
  { id: 'rota',     label: 'Rota',        sortable: false },
  { id: 'veiculo',  label: 'Veículo',     sortable: true },
  { id: 'data',     label: 'Data',        sortable: true },
  { id: 'saida',    label: 'Saída',       sortable: true },
  { id: 'chegada',  label: 'Chegada',     sortable: true },
  { id: 'km_ini',   label: 'KM Ini.',     sortable: false },
  { id: 'km_fin',   label: 'KM Fin.',     sortable: false },
  { id: 'km_rod',   label: 'KM Rod.',     sortable: true },
  { id: 'turno',    label: 'Turno',       sortable: true },
  { id: 'status',   label: 'Status',      sortable: true },
  { id: 'obs',      label: 'Observações', sortable: true },
  { id: 'acoes',    label: 'Ações',       sortable: false, gestor: true },
];

const VISIVEIS_PADRAO = Object.fromEntries(ALL_COLS.map(c => [c.id, true]));

function indicador(colId, ordem) {
  if (ordem.col !== colId) return <span style={{ color: '#9ca3af', fontSize: '0.65rem', marginLeft: 3 }}>⇅</span>;
  return <span style={{ color: '#2563eb', fontSize: '0.7rem', marginLeft: 3 }}>{ordem.dir === 'asc' ? '↑' : '↓'}</span>;
}

export default function RegistrosTable({
  registros,
  todasRotas = [],
  veiculos = [],
  onValidar,
  onEditar,
  onDomingoFeriado,
}) {
  const modoGestor = Boolean(onValidar);
  const [ordem, setOrdem] = useState(DEFAULT_ORDEM);
  const [visiveis, setVisiveis] = useState(VISIVEIS_PADRAO);
  const [painelAberto, setPainelAberto] = useState(false);
  const painelRef = useRef(null);

  // Fecha painel ao clicar fora
  useEffect(() => {
    if (!painelAberto) return;
    function handleClick(e) {
      if (painelRef.current && !painelRef.current.contains(e.target)) {
        setPainelAberto(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [painelAberto]);

  if (!registros.length) {
    return <p style={{ ...s.subtitle, marginTop: 12 }}>Nenhum registro encontrado.</p>;
  }

  function rotaNome(r) {
    if (r.rotas?.nome) return r.rotas.nome;
    return todasRotas.find(x => x.id === r.rota_id)?.nome || '—';
  }
  function veiculoPlaca(r) {
    if (r.veiculos?.placa) return r.veiculos.placa;
    return veiculos.find(x => x.id === r.veiculo_id)?.placa || '—';
  }

  function toggleOrdem(colId) {
    if (!colId) return;
    setOrdem(prev => {
      if (prev.col !== colId) return { col: colId, dir: 'asc' };
      if (prev.dir === 'asc') return { col: colId, dir: 'desc' };
      return { ...DEFAULT_ORDEM };
    });
  }

  function ordenar(lista) {
    const mult = ordem.dir === 'asc' ? 1 : -1;
    return [...lista].sort((a, b) => {
      switch (ordem.col) {
        case 'dom_fer':  return mult * ((a.domingo_feriado ? 1 : 0) - (b.domingo_feriado ? 1 : 0));
        case 'veiculo':  return mult * veiculoPlaca(a).localeCompare(veiculoPlaca(b));
        case 'data':     return mult * (`${a.data}${a.horario_saida||''}`).localeCompare(`${b.data}${b.horario_saida||''}`);
        case 'saida':    return mult * (a.horario_saida||'').localeCompare(b.horario_saida||'');
        case 'chegada':  return mult * (a.horario_chegada||'').localeCompare(b.horario_chegada||'');
        case 'km_rod':   return mult * (kmRodados(a) - kmRodados(b));
        case 'turno': {
          const ta = TURNO_ORDER[a.tipo_turno] ?? 99;
          const tb = TURNO_ORDER[b.tipo_turno] ?? 99;
          return mult * (ta - tb);
        }
        case 'status':   return mult * ((a.status === 'completo' ? 0 : 1) - (b.status === 'completo' ? 0 : 1));
        case 'obs': {
          const va = [a.finalidade, a.observacao].filter(Boolean).join(' · ').toLowerCase();
          const vb = [b.finalidade, b.observacao].filter(Boolean).join(' · ').toLowerCase();
          if (!va && vb) return 1;
          if (va && !vb) return -1;
          return mult * va.localeCompare(vb);
        }
        default: return 0;
      }
    });
  }

  // Colunas visíveis após filtrar por gestor e visibilidade
  const colsVisiveis = ALL_COLS.filter(c => {
    if (c.gestor && !modoGestor) return false;
    return visiveis[c.id];
  });

  // Colunas disponíveis para toggle (respeitando modo gestor)
  const colsToggle = ALL_COLS.filter(c => !c.gestor || modoGestor);

  const thStyle = (col) => ({
    ...s.th,
    cursor: col.sortable ? 'pointer' : 'default',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    textAlign: col.align || undefined,
    background: (col.sortable && ordem.col === col.id) ? '#dbeafe' : undefined,
  });

  function renderCelula(col, r) {
    switch (col.id) {
      case 'dom_fer':
        return (
          <td key={col.id} style={{ ...s.td, textAlign: 'center' }}>
            <input type="checkbox" title="Marcar como Domingo / Feriado"
              checked={Boolean(r.domingo_feriado)}
              onChange={e => onDomingoFeriado(r, e.target.checked)}
              style={{ cursor: 'pointer', width: 16, height: 16 }} />
          </td>
        );
      case 'rota':    return <td key={col.id} style={s.td}>{rotaNome(r)}</td>;
      case 'veiculo': return <td key={col.id} style={s.td}>{veiculoPlaca(r)}</td>;
      case 'data':    return <td key={col.id} style={s.td}>{r.data}</td>;
      case 'saida':   return <td key={col.id} style={s.td}>{r.horario_saida?.slice(0, 5) || '—'}</td>;
      case 'chegada': return <td key={col.id} style={s.td}>{r.horario_chegada?.slice(0, 5) || '—'}</td>;
      case 'km_ini':  return <td key={col.id} style={s.td}>{r.km_inicial}</td>;
      case 'km_fin':  return <td key={col.id} style={s.td}>{r.km_final ?? '—'}</td>;
      case 'km_rod':  return <td key={col.id} style={{ ...s.td, fontWeight: 600 }}>{kmRodados(r)}</td>;
      case 'turno':
        return (
          <td key={col.id} style={s.td}>
            {r.domingo_feriado
              ? <span style={{ color: '#92400e', fontWeight: 600 }}>Normal (Dom/Fer)</span>
              : r.tipo_turno === 'rota'           ? <span style={{ color: '#0369a1', fontWeight: 600 }}>ROTA</span>
              : r.tipo_turno === 'turno extra'    ? <span style={{ color: '#b45309', fontWeight: 600 }}>Turno Extra</span>
              : r.tipo_turno === 'rodada interna' ? <span style={{ color: '#7c3aed', fontWeight: 600 }}>Rodada Interna</span>
              : r.tipo_turno === 'manutencao'     ? <span style={{ color: '#64748b', fontWeight: 600 }}>Manutenção</span>
              : 'Turno Normal'}
          </td>
        );
      case 'status':
        return (
          <td key={col.id} style={s.td}>
            <span style={statusStyle[r.status] || {}}>
              {r.status === 'rascunho' ? 'Rascunho' : 'Completo'}
            </span>
          </td>
        );
      case 'obs':
        return (
          <td key={col.id} style={{ ...s.td, color: '#6b7280', maxWidth: 180 }}>
            {[r.finalidade, r.observacao].filter(Boolean).join(' · ') || '—'}
          </td>
        );
      case 'acoes':
        return (
          <td key={col.id} style={{ ...s.td, whiteSpace: 'nowrap' }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {r.status === 'completo' && (
                <button onClick={() => onValidar(r)} style={{
                  ...btnAcao,
                  background: r.validado ? '#dcfce7' : '#fff',
                  color: r.validado ? '#166534' : '#374151',
                  borderColor: r.validado ? '#86efac' : '#d1d5db',
                }}>
                  {r.validado ? '✓ Validado' : 'Validar'}
                </button>
              )}
              <button onClick={() => onEditar(r)} style={{ ...btnAcao, color: '#2563eb', borderColor: '#bfdbfe' }}>
                Editar
              </button>
            </div>
          </td>
        );
      default: return null;
    }
  }

  const ordenados = ordenar(registros);
  const ocultasCount = colsToggle.filter(c => !visiveis[c.id]).length;

  return (
    <div>
      {/* Barra de controle de colunas */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '6px 8px 2px', position: 'relative' }} ref={painelRef}>
        <button
          onClick={() => setPainelAberto(p => !p)}
          style={{
            ...s.btnSecondary, fontSize: '0.78rem', padding: '4px 10px',
            display: 'flex', alignItems: 'center', gap: 5,
            background: ocultasCount > 0 ? '#eff6ff' : '#fff',
            borderColor: ocultasCount > 0 ? '#93c5fd' : '#d1d5db',
            color: ocultasCount > 0 ? '#1d4ed8' : '#374151',
          }}
        >
          ⊞ Colunas {ocultasCount > 0 && <span style={{ background: '#2563eb', color: '#fff', borderRadius: 10, padding: '0 5px', fontSize: '0.7rem' }}>{ocultasCount} oculta{ocultasCount > 1 ? 's' : ''}</span>}
        </button>

        {painelAberto && (
          <div style={{
            position: 'absolute', top: '100%', right: 0, zIndex: 300,
            background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '12px 16px',
            minWidth: 260,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#374151' }}>Colunas visíveis</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ fontSize: '0.72rem', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  onClick={() => setVisiveis(Object.fromEntries(colsToggle.map(c => [c.id, true])))}>
                  Todas
                </button>
                <span style={{ color: '#d1d5db' }}>|</span>
                <button style={{ fontSize: '0.72rem', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  onClick={() => {
                    // Mantém sempre Data e Ações visíveis como mínimo
                    const minimo = { data: true, acoes: modoGestor };
                    setVisiveis(Object.fromEntries(colsToggle.map(c => [c.id, minimo[c.id] || false])));
                  }}>
                  Mínimo
                </button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
              {colsToggle.map(col => (
                <label key={col.id} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: '0.82rem', color: '#374151' }}>
                  <input
                    type="checkbox"
                    checked={visiveis[col.id] !== false}
                    onChange={e => setVisiveis(prev => ({ ...prev, [col.id]: e.target.checked }))}
                    style={{ width: 14, height: 14, cursor: 'pointer' }}
                  />
                  {col.label}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabela */}
      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr>
              {colsVisiveis.map(col => (
                <th
                  key={col.id}
                  style={thStyle(col)}
                  onClick={() => col.sortable && toggleOrdem(col.id)}
                >
                  {col.label}
                  {col.sortable && indicador(col.id, ordem)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ordenados.map(r => {
              const rowBg = r.validado ? '#f0fdf4' : r.domingo_feriado ? '#fffbeb' : undefined;
              return (
                <tr key={r.id} style={rowBg ? { background: rowBg } : undefined}>
                  {colsVisiveis.map(col => renderCelula(col, r))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
