import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../supabase.js';
import { formatarMes, kmRodados } from '../storage.js';
import RegistrosTable from './RegistrosTable.jsx';
import RegrasScreen from './RegrasScreen.jsx';
import BoletimScreen from './BoletimScreen.jsx';
import { s } from '../styles.js';

const ABAS = ['Folhas de Medição', 'Regras de Faturamento', 'Boletim'];

export default function GestorScreen() {
  const [aba, setAba] = useState(0);
  const [registros, setRegistros] = useState([]);
  const [todasRotas, setTodasRotas] = useState([]);
  const [todosContratos, setTodosContratos] = useState([]);
  const [todosVeiculos, setTodosVeiculos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroContrato, setFiltroContrato] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [aberta, setAberta] = useState(null);

  useEffect(() => { carregarRegistros(); }, []);

  async function carregarRegistros() {
    setCarregando(true);
    setAberta(null);
    const [{ data: regs, error }, { data: rotas }, { data: contratos }, { data: veiculos }] = await Promise.all([
      supabase.from('registros').select('*').order('data', { ascending: false }).order('horario_saida', { ascending: false }),
      supabase.from('rotas').select('id, nome, contrato_id').order('nome'),
      supabase.from('contratos').select('id, nome, cliente').order('nome'),
      supabase.from('veiculos').select('id, placa, descricao').order('placa'),
    ]);

    if (!error && regs) setRegistros(regs);
    if (rotas) setTodasRotas(rotas);
    if (contratos) setTodosContratos(contratos);
    if (veiculos) setTodosVeiculos(veiculos);
    setCarregando(false);
  }

  function rotaDeRegistro(r) {
    return todasRotas.find(x => x.id === r.rota_id) || null;
  }

  function contratoDeRegistro(r) {
    const rota = rotaDeRegistro(r);
    if (!rota) return null;
    return todosContratos.find(x => x.id === rota.contrato_id) || null;
  }

  function contratoNome(r) {
    return contratoDeRegistro(r)?.nome || '—';
  }

  function veiculoDeRegistro(r) {
    return todosVeiculos.find(x => x.id === r.veiculo_id) || null;
  }

  const contratos = useMemo(
    () => [...new Set(registros.map((r) => contratoNome(r)).filter((c) => c !== '—'))].sort(),
    [registros, todasRotas, todosContratos],
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
      const contrato = contratoNome(r);
      const cliente = contratoDeRegistro(r)?.cliente || '—';
      const mes = r.data?.slice(0, 7) || 'sem-data';
      const chave = `${contrato}__${mes}`;
      if (!map.has(chave)) {
        map.set(chave, { contrato, cliente, mes, registros: [] });
      }
      map.get(chave).registros.push(r);
    }
    return Array.from(map.values())
      .filter(
        (f) =>
          (!filtroContrato || f.contrato === filtroContrato) &&
          (!filtroMes || f.mes === filtroMes),
      )
      .sort((a, b) => b.mes.localeCompare(a.mes));
  }, [registros, todasRotas, todosContratos, filtroContrato, filtroMes]);

  function totalKm(folha) {
    return folha.registros.reduce((acc, r) => acc + kmRodados(r), 0);
  }

  function exportar(folha) {
    const dados = [...folha.registros]
      .sort((a, b) => `${a.data}${a.horario_saida}`.localeCompare(`${b.data}${b.horario_saida}`))
      .map((r) => {
        const rota = rotaDeRegistro(r);
        const veiculo = veiculoDeRegistro(r);
        return {
          Contrato: contratoNome(r),
          Rota: rota?.nome || '—',
          Veículo: veiculo ? `${veiculo.placa} — ${veiculo.descricao}` : '—',
          'Troca Veículo': r.troca_veiculo || '',
          'Motivo Troca': r.motivo_troca || '',
          Data: r.data,
          Saída: r.horario_saida?.slice(0, 5) ?? '',
          Chegada: r.horario_chegada?.slice(0, 5) ?? '',
          'KM Inicial': r.km_inicial,
          'KM Final': r.km_final,
          'KM Rodados': kmRodados(r),
          Turno: r.tipo_turno === 'turno extra' ? 'Turno Extra' : r.tipo_turno === 'rodada interna' ? 'Rodada Interna' : 'Normal',
          Status: r.status === 'rascunho' ? 'Rascunho' : 'Completo',
          Finalidade: r.finalidade || '',
          Observações: r.observacao || '',
        };
      });

    const ws = XLSX.utils.json_to_sheet(dados);
    ws['!cols'] = [
      { wch: 18 }, { wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 20 },
      { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 24 }, { wch: 32 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Registros');
    const nome = `folha-${folha.contrato}-${folha.mes}.xlsx`.replace(/\s+/g, '-').toLowerCase();
    XLSX.writeFile(wb, nome);
  }

  return (
    <div>
      {/* Abas */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #e5e7eb' }}>
        {ABAS.map((nome, i) => (
          <button key={i} onClick={() => setAba(i)} style={{
            padding: '8px 20px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: 600, fontSize: '0.9rem',
            color: aba === i ? '#2563eb' : '#6b7280',
            borderBottom: aba === i ? '2px solid #2563eb' : '2px solid transparent',
            marginBottom: -2,
          }}>
            {nome}
          </button>
        ))}
      </div>

      {aba === 1 && <RegrasScreen />}
      {aba === 2 && <BoletimScreen />}
      {aba === 0 && <div>
      <div style={s.filterRow}>
        <select value={filtroContrato} onChange={(e) => setFiltroContrato(e.target.value)} style={s.filterInput}>
          <option value="">Todos os contratos</option>
          {contratos.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} style={s.filterInput}>
          <option value="">Todos os meses</option>
          {meses.map((m) => <option key={m} value={m}>{formatarMes(m)}</option>)}
        </select>

        <button style={s.btnSecondary} onClick={carregarRegistros}>↻ Atualizar</button>

        <span style={{ ...s.subtitle, marginLeft: 'auto' }}>
          {carregando
            ? 'Carregando...'
            : `${folhas.length} folha${folhas.length !== 1 ? 's' : ''} encontrada${folhas.length !== 1 ? 's' : ''}`}
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
        const chave = `${folha.contrato}__${folha.mes}`;
        const estaAberta = aberta === chave;

        return (
          <article key={chave} style={s.sheet}>
            <div style={s.sheetHeader}>
              <div>
                <h3 style={s.sheetTitle}>{folha.contrato}</h3>
                <p style={{ ...s.subtitle, margin: '4px 0 6px' }}>
                  {formatarMes(folha.mes)} · Cliente: {folha.cliente}
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

            {estaAberta && <RegistrosTable registros={folha.registros} todasRotas={todasRotas} veiculos={todosVeiculos} />}
          </article>
        );
      })}
      </div>}
    </div>
  );
}
