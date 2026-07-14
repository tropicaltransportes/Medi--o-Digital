import React, { useState } from 'react';
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

// Colunas sortáveis: id da coluna → null = não sortável
const COLUNAS = [
  { id: 'dom_fer',  label: 'Dom/Fer',    sortable: true,  gestor: true,  align: 'center' },
  { id: 'rota',     label: 'Rota',       sortable: false },
  { id: 'veiculo',  label: 'Veículo',    sortable: true },
  { id: 'data',     label: 'Data',       sortable: true },
  { id: 'saida',    label: 'Saída',      sortable: true },
  { id: 'chegada',  label: 'Chegada',    sortable: true },
  { id: null,       label: 'KM Ini.',    sortable: false },
  { id: null,       label: 'KM Fin.',    sortable: false },
  { id: 'km_rod',   label: 'KM Rod.',    sortable: true },
  { id: 'turno',    label: 'Turno',      sortable: true },
  { id: 'status',   label: 'Status',     sortable: true },
  { id: 'obs',      label: 'Observações', sortable: true },
];

function indicador(col, ordem) {
  if (ordem.col !== col) return <span style={{ color: '#9ca3af', fontSize: '0.65rem', marginLeft: 3 }}>⇅</span>;
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
        case 'dom_fer': {
          const va = a.domingo_feriado ? 1 : 0;
          const vb = b.domingo_feriado ? 1 : 0;
          return mult * (va - vb);
        }
        case 'veiculo':
          return mult * veiculoPlaca(a).localeCompare(veiculoPlaca(b));
        case 'data':
          return mult * (`${a.data}${a.horario_saida || ''}`).localeCompare(`${b.data}${b.horario_saida || ''}`);
        case 'saida':
          return mult * (a.horario_saida || '').localeCompare(b.horario_saida || '');
        case 'chegada':
          return mult * (a.horario_chegada || '').localeCompare(b.horario_chegada || '');
        case 'km_rod':
          return mult * (kmRodados(a) - kmRodados(b));
        case 'turno': {
          const ta = TURNO_ORDER[a.tipo_turno] ?? 99;
          const tb = TURNO_ORDER[b.tipo_turno] ?? 99;
          return mult * (ta - tb);
        }
        case 'status': {
          const va = a.status === 'completo' ? 0 : 1;
          const vb = b.status === 'completo' ? 0 : 1;
          return mult * (va - vb);
        }
        case 'obs': {
          const va = [a.finalidade, a.observacao].filter(Boolean).join(' · ').toLowerCase();
          const vb = [b.finalidade, b.observacao].filter(Boolean).join(' · ').toLowerCase();
          if (!va && vb) return 1;
          if (va && !vb) return -1;
          return mult * va.localeCompare(vb);
        }
        default:
          return 0;
      }
    });
  }

  const thStyle = (colId, sortable) => ({
    ...s.th,
    cursor: sortable ? 'pointer' : 'default',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    background: (sortable && ordem.col === colId) ? '#dbeafe' : undefined,
  });

  const ordenados = ordenar(registros);

  return (
    <div style={s.tableWrap}>
      <table style={s.table}>
        <thead>
          <tr>
            {COLUNAS.filter(c => !c.gestor || modoGestor).map((col, i) => (
              <th
                key={i}
                style={{ ...thStyle(col.id, col.sortable), textAlign: col.align || undefined }}
                onClick={() => col.sortable && toggleOrdem(col.id)}
                title={col.sortable ? (col.id === 'dom_fer' ? 'Domingo ou Feriado' : undefined) : undefined}
              >
                {col.label}
                {col.sortable && indicador(col.id, ordem)}
              </th>
            ))}
            {modoGestor && <th style={s.th}>Ações</th>}
          </tr>
        </thead>
        <tbody>
          {ordenados.map(r => {
            const rowBg = r.validado
              ? '#f0fdf4'
              : r.domingo_feriado
              ? '#fffbeb'
              : undefined;

            return (
              <tr key={r.id} style={rowBg ? { background: rowBg } : undefined}>
                {modoGestor && (
                  <td style={{ ...s.td, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      title="Marcar como Domingo / Feriado"
                      checked={Boolean(r.domingo_feriado)}
                      onChange={e => onDomingoFeriado(r, e.target.checked)}
                      style={{ cursor: 'pointer', width: 16, height: 16 }}
                    />
                  </td>
                )}
                <td style={s.td}>{rotaNome(r)}</td>
                <td style={s.td}>{veiculoPlaca(r)}</td>
                <td style={s.td}>{r.data}</td>
                <td style={s.td}>{r.horario_saida?.slice(0, 5) || '—'}</td>
                <td style={s.td}>{r.horario_chegada?.slice(0, 5) || '—'}</td>
                <td style={s.td}>{r.km_inicial}</td>
                <td style={s.td}>{r.km_final ?? '—'}</td>
                <td style={{ ...s.td, fontWeight: 600 }}>{kmRodados(r)}</td>
                <td style={s.td}>
                  {r.domingo_feriado
                    ? <span style={{ color: '#92400e', fontWeight: 600 }}>Normal (Dom/Fer)</span>
                    : r.tipo_turno === 'rota'
                    ? <span style={{ color: '#0369a1', fontWeight: 600 }}>ROTA</span>
                    : r.tipo_turno === 'turno extra'
                    ? <span style={{ color: '#b45309', fontWeight: 600 }}>Turno Extra</span>
                    : r.tipo_turno === 'rodada interna'
                    ? <span style={{ color: '#7c3aed', fontWeight: 600 }}>Rodada Interna</span>
                    : r.tipo_turno === 'manutencao'
                    ? <span style={{ color: '#64748b', fontWeight: 600 }}>Manutenção</span>
                    : 'Turno Normal'}
                </td>
                <td style={s.td}>
                  <span style={statusStyle[r.status] || {}}>
                    {r.status === 'rascunho' ? 'Rascunho' : 'Completo'}
                  </span>
                </td>
                <td style={{ ...s.td, color: '#6b7280', maxWidth: 180 }}>
                  {[r.finalidade, r.observacao].filter(Boolean).join(' · ') || '—'}
                </td>
                {modoGestor && (
                  <td style={{ ...s.td, whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {r.status === 'completo' && (
                        <button
                          onClick={() => onValidar(r)}
                          style={{
                            ...btnAcao,
                            background: r.validado ? '#dcfce7' : '#fff',
                            color: r.validado ? '#166534' : '#374151',
                            borderColor: r.validado ? '#86efac' : '#d1d5db',
                          }}
                        >
                          {r.validado ? '✓ Validado' : 'Validar'}
                        </button>
                      )}
                      <button onClick={() => onEditar(r)} style={{ ...btnAcao, color: '#2563eb', borderColor: '#bfdbfe' }}>
                        Editar
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
