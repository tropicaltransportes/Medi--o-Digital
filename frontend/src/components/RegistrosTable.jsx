import React from 'react';
import { kmRodados } from '../storage.js';
import { s } from '../styles.js';

const COLUNAS = [
  'Motorista', 'Rota', 'Data', 'Saída', 'Chegada',
  'KM Inicial', 'KM Final', 'KM Rodados', 'Turno', 'Finalidade', 'Observações',
];

export default function RegistrosTable({ registros }) {
  if (!registros.length) {
    return <p style={{ ...s.subtitle, marginTop: 12 }}>Nenhum registro encontrado.</p>;
  }

  return (
    <div style={s.tableWrap}>
      <table style={s.table}>
        <thead>
          <tr>
            {COLUNAS.map((col) => (
              <th key={col} style={s.th}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {registros.map((r) => (
            <tr key={r.id}>
              <td style={s.td}>{r.nome}</td>
              <td style={s.td}>{r.rota}</td>
              <td style={s.td}>{r.data}</td>
              <td style={s.td}>{r.saida?.slice(0, 5)}</td>
              <td style={s.td}>{r.chegada?.slice(0, 5)}</td>
              <td style={s.td}>{r.km_inicial}</td>
              <td style={s.td}>{r.km_final}</td>
              <td style={{ ...s.td, fontWeight: 600 }}>{kmRodados(r)}</td>
              <td style={s.td}>
                {r.turno === 'turno extra'
                  ? <span style={{ color: '#b45309', fontWeight: 600 }}>Extra</span>
                  : 'Normal'}
              </td>
              <td style={s.td}>{r.finalidade || '—'}</td>
              <td style={{ ...s.td, color: '#6b7280', maxWidth: 200 }}>{r.observacoes || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
