import React from 'react';
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

export default function RegistrosTable({
  registros,
  todasRotas = [],
  veiculos = [],
  onValidar,
  onEditar,
  onDomingoFeriado,
}) {
  const modoGestor = Boolean(onValidar);

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

  return (
    <div style={s.tableWrap}>
      <table style={s.table}>
        <thead>
          <tr>
            {modoGestor && <th style={s.th} title="Domingo ou Feriado">Dom/Fer</th>}
            {['Rota', 'Veículo', 'Data', 'Saída', 'Chegada',
              'KM Ini.', 'KM Fin.', 'KM Rod.', 'Turno', 'Status', 'Observações'].map(col => (
              <th key={col} style={s.th}>{col}</th>
            ))}
            {modoGestor && <th style={s.th}>Ações</th>}
          </tr>
        </thead>
        <tbody>
          {registros.map(r => {
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
