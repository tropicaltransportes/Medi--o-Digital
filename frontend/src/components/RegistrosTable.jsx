import React from 'react';
import { kmRodados } from '../storage.js';
import { s } from '../styles.js';

const statusStyle = {
  rascunho: { color: '#b45309', fontWeight: 600 },
  completo: { color: '#16a34a', fontWeight: 600 },
};

export default function RegistrosTable({ registros, todasRotas = [], veiculos = [] }) {
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
            {[
              'Rota', 'Veículo', 'Data', 'Saída', 'Chegada',
              'KM Ini.', 'KM Fin.', 'KM Rod.', 'Turno', 'Status', 'Observações',
            ].map((col) => (
              <th key={col} style={s.th}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {registros.map((r) => (
            <tr key={r.id}>
              <td style={s.td}>{rotaNome(r)}</td>
              <td style={s.td}>{veiculoPlaca(r)}</td>
              <td style={s.td}>{r.data}</td>
              <td style={s.td}>{r.horario_saida?.slice(0, 5) || '—'}</td>
              <td style={s.td}>{r.horario_chegada?.slice(0, 5) || '—'}</td>
              <td style={s.td}>{r.km_inicial}</td>
              <td style={s.td}>{r.km_final}</td>
              <td style={{ ...s.td, fontWeight: 600 }}>{kmRodados(r)}</td>
              <td style={s.td}>
                {r.tipo_turno === 'turno extra'
                  ? <span style={{ color: '#b45309', fontWeight: 600 }}>Turno Extra</span>
                  : r.tipo_turno === 'rodada interna'
                  ? <span style={{ color: '#7c3aed', fontWeight: 600 }}>Rodada Interna</span>
                  : 'Normal'}
              </td>
              <td style={s.td}>
                <span style={statusStyle[r.status] || {}}>
                  {r.status === 'rascunho' ? 'Rascunho' : 'Completo'}
                </span>
              </td>
              <td style={{ ...s.td, color: '#6b7280', maxWidth: 180 }}>{r.observacao || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
