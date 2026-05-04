import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../supabase.js';
import { formatarMes, kmRodados } from '../storage.js';
import RegistrosTable from './RegistrosTable.jsx';
import { s } from '../styles.js';

export default function GestorScreen() {
  const [registros, setRegistros] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [aberta, setAberta] = useState(null);

  useEffect(() => {
    carregarRegistros();
  }, []);

  async function carregarRegistros() {
    setCarregando(true);
    setAberta(null);
    const { data, error } = await supabase
      .from('registros')
      .select('*')
      .order('data', { ascending: false })
      .order('saida', { ascending: false });

    if (!error && data) setRegistros(data);
    setCarregando(false);
  }

  const clientes = useMemo(
    () => [...new Set(registros.map((r) => r.cliente).filter(Boolean))].sort(),
    [registros],
  );

  const meses = useMemo(
    () =>
      [...new Set(registros.map((r) => r.data?.slice(0, 7)).filter(Boolean))].sort((a, b) =>
        b.localeCompare(a),
      ),
    [registros],
  );

  const folhas = useMemo(() => {
    const map = new Map();
    for (const r of registros) {
      const mes = r.data?.slice(0, 7) || 'sem-data';
      const chave = `${r.cliente}__${r.contrato}__${mes}`;
      if (!map.has(chave)) {
        map.set(chave, { cliente: r.cliente, contrato: r.contrato, mes, registros: [] });
      }
      map.get(chave).registros.push(r);
    }
    return Array.from(map.values())
      .filter(
        (f) =>
          (!filtroCliente || f.cliente === filtroCliente) &&
          (!filtroMes || f.mes === filtroMes),
      )
      .sort((a, b) => b.mes.localeCompare(a.mes));
  }, [registros, filtroCliente, filtroMes]);

  function totalKm(folha) {
    return folha.registros.reduce((acc, r) => acc + kmRodados(r), 0);
  }

  function exportar(folha) {
    const dados = [...folha.registros]
      .sort((a, b) => `${a.data}${a.saida}`.localeCompare(`${b.data}${b.saida}`))
      .map((r) => ({
        Motorista: r.nome,
        Rota: r.rota,
        Data: r.data,
        Saída: r.saida?.slice(0, 5) ?? '',
        Chegada: r.chegada?.slice(0, 5) ?? '',
        'KM Inicial': r.km_inicial,
        'KM Final': r.km_final,
        'KM Rodados': kmRodados(r),
        Turno: r.turno === 'turno extra' ? 'Turno Extra' : 'Normal',
        Finalidade: r.finalidade || '',
        Observações: r.observacoes || '',
      }));

    const ws = XLSX.utils.json_to_sheet(dados);
    ws['!cols'] = [
      { wch: 20 }, { wch: 24 }, { wch: 12 }, { wch: 8 }, { wch: 8 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 26 }, { wch: 32 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Registros');
    const nome = `folha-${folha.cliente}-${folha.mes}.xlsx`.replace(/\s+/g, '-').toLowerCase();
    XLSX.writeFile(wb, nome);
  }

  return (
    <div>
      <div style={s.filterRow}>
        <select value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)} style={s.filterInput}>
          <option value="">Todos os clientes</option>
          {clientes.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} style={s.filterInput}>
          <option value="">Todos os meses</option>
          {meses.map((m) => <option key={m} value={m}>{formatarMes(m)}</option>)}
        </select>

        <button style={s.btnSecondary} onClick={carregarRegistros}>
          ↻ Atualizar
        </button>

        <span style={{ ...s.subtitle, marginLeft: 'auto' }}>
          {carregando ? 'Carregando...' : `${folhas.length} folha${folhas.length !== 1 ? 's' : ''} encontrada${folhas.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {!carregando && folhas.length === 0 && (
        <div style={{ ...s.card, textAlign: 'center', color: '#6b7280', padding: '48px 24px' }}>
          Nenhuma folha de medição encontrada.
          <br />
          <span style={{ fontSize: '0.8rem' }}>Os registros aparecem aqui conforme os motoristas preenchem o formulário.</span>
        </div>
      )}

      {folhas.map((folha) => {
        const chave = `${folha.cliente}__${folha.mes}`;
        const estaAberta = aberta === chave;

        return (
          <article key={chave} style={s.sheet}>
            <div style={s.sheetHeader}>
              <div>
                <h3 style={s.sheetTitle}>{folha.cliente}</h3>
                <p style={{ ...s.subtitle, margin: '4px 0 6px' }}>
                  {formatarMes(folha.mes)} · Contrato: {folha.contrato}
                </p>
                <div>
                  <span style={s.badge}>{folha.registros.length} registro{folha.registros.length !== 1 ? 's' : ''}</span>
                  <span style={s.badge}>{totalKm(folha).toLocaleString('pt-BR')} km rodados</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button style={s.btnSecondary} onClick={() => setAberta(estaAberta ? null : chave)}>
                  {estaAberta ? 'Fechar' : 'Ver registros'}
                </button>
                <button style={s.btnGreen} onClick={() => exportar(folha)}>
                  Exportar Excel
                </button>
              </div>
            </div>

            {estaAberta && <RegistrosTable registros={folha.registros} />}
          </article>
        );
      })}
    </div>
  );
}
