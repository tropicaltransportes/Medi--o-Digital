import React from 'react';
import { kmRodados } from '../storage.js';
import { s } from '../styles.js';

const statusStyle = {
  rascunho: { color: '#b45309', fontWeight: 600 },
  completo: { color: '#16a34a', fontWeight: 600 },
};

export default function RegistrosTable({ registros }) {
  if (!registros.length) {
    return <p style={{ ...s.subtitle, marginTop: 12 }}>Nenhum registro encontrado.</p>;
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
              <td style={s.td}>{r.rotas?.nome || '—'}</td>
              <td style={s.td}>{r.veiculos ? `${r.veiculos.placa}` : '—'}</td>
              <td style={s.td}>{r.data}</td>
              <td style={s.td}>{r.horario_saida?.slice(0, 5) || '—'}</td>
              <td style={s.td}>{r.horario_chegada?.slice(0, 5) || '—'}</td>
              <td style={s.td}>{r.km_inicial}</td>
              <td style={s.td}>{r.km_final}</td>
              <td style={{ ...s.td, fontWeight: 600 }}>{kmRodados(r)}</td>
              <td style={s.td}>
                {r.tipo_turno === 'turno extra'
                  ? <span style={{ color: '#b45309', fontWeight: 600 }}>Extra</span>
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
