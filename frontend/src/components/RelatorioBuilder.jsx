import React, { useState } from 'react';
import { supabase } from '../supabase.js';
import { s } from '../styles.js';

const OPCOES_LINHAS = [
  { id: 'rota',       label: 'Rota' },
  { id: 'veiculo',    label: 'Veículo' },
  { id: 'tipo_turno', label: 'Tipo de Turno' },
  { id: 'status',     label: 'Status' },
];

const OPCOES_COLUNAS = [
  { id: 'nenhuma',    label: 'Apenas totais' },
  { id: 'dia_mes',    label: 'Dia do mês' },
  { id: 'dia_semana', label: 'Dia da semana' },
  { id: 'tipo_turno', label: 'Tipo de turno' },
  { id: 'status',     label: 'Status' },
];

const OPCOES_METRICAS = [
  { id: 'contagem', label: 'Qtd. de Registros' },
  { id: 'km',       label: 'KM Rodados' },
  { id: 'horas',    label: 'Horas Trabalhadas' },
];

const OPCOES_VIZ = [
  { id: 'tabela',  label: 'Tabela' },
  { id: 'heatmap', label: 'Heat Map' },
];

const TIPOS_TURNO   = ['normal', 'turno extra', 'rodada interna', 'rota', 'manutencao'];
const TIPOS_VEICULO = ['RODOVIÁRIO', 'SEMI RODOVIÁRIO', 'URBANO', 'MICRO', 'VAN', 'PEQUENO PORTE'];
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES_PT    = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

const CONFIG_INICIAL = {
  linhas: 'rota',
  colunas: 'dia_mes',
  metrica: 'contagem',
  visualizacao: 'heatmap',
  contratoId: '',
  dataInicial: '',
  dataFinal: '',
  filtroTipoTurno: '',
  filtroStatus: '',
  filtroTipoVeiculo: '',
};

const LS_KEY = 'medicao_relatorios_salvos';

function loadSalvos() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}
function persistSalvos(lista) {
  localStorage.setItem(LS_KEY, JSON.stringify(lista));
}

function calcKm(r) {
  const ini = Number(r.km_inicial);
  const fin = Number(r.km_final);
  if (!r.km_final || isNaN(ini) || isNaN(fin)) return 0;
  return Math.max(0, fin - ini);
}

function calcHoras(r) {
  if (!r.horario_saida || !r.horario_chegada) return 0;
  const [sh, sm] = r.horario_saida.split(':').map(Number);
  const [eh, em] = r.horario_chegada.split(':').map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  return mins / 60;
}

function metricaValor(r, metrica) {
  if (metrica === 'km')    return calcKm(r);
  if (metrica === 'horas') return calcHoras(r);
  return 1;
}

function formatarValor(val, metrica) {
  if (!val && val !== 0) return '—';
  if (metrica === 'km')    return `${Math.round(val)} km`;
  if (metrica === 'horas') return `${val.toFixed(1)} h`;
  return String(Math.round(val));
}

function heatBg(val, maxVal) {
  if (!val || !maxVal) return undefined;
  const r = val / maxVal;
  if (r >= 0.75) return '#1d4ed8';
  if (r >= 0.5)  return '#3b82f6';
  if (r >= 0.25) return '#93c5fd';
  return '#dbeafe';
}
function heatFg(val, maxVal) {
  if (!val || !maxVal) return '#9ca3af';
  return (val / maxVal) >= 0.5 ? '#fff' : '#1e3a5f';
}

function getRowKey(r, linhas, rotas, veiculos) {
  switch (linhas) {
    case 'rota':       return { key: String(r.rota_id),    label: rotas.find(x => x.id === r.rota_id)?.nome       || `#${r.rota_id}` };
    case 'veiculo':    return { key: String(r.veiculo_id), label: veiculos.find(x => x.id === r.veiculo_id)?.placa || `#${r.veiculo_id}` };
    case 'tipo_turno': return { key: r.tipo_turno || 'null', label: r.tipo_turno || '(sem tipo)' };
    case 'status':     return { key: r.status || 'null',    label: r.status || '(sem status)' };
    default:           return { key: 'total', label: 'Total' };
  }
}

function getColKey(r, colunas) {
  switch (colunas) {
    case 'dia_mes':    return r.data;
    case 'dia_semana': return String(new Date(r.data + 'T12:00:00').getDay());
    case 'tipo_turno': return r.tipo_turno || 'null';
    case 'status':     return r.status || 'null';
    default:           return 'total';
  }
}

function getColLabel(key, colunas) {
  if (colunas === 'dia_mes') {
    const d = new Date(key + 'T12:00:00');
    return `${String(d.getDate()).padStart(2,'0')}/${MESES_PT[d.getMonth()]}`;
  }
  if (colunas === 'dia_semana') return DIAS_SEMANA[Number(key)] || key;
  return key;
}

export default function RelatorioBuilder({ contratos }) {
  const [config,    setConfig]    = useState(CONFIG_INICIAL);
  const [salvos,    setSalvos]    = useState(loadSalvos);
  const [nomeSalvar, setNomeSalvar] = useState('');
  const [salvando,  setSalvando]  = useState(false);
  const [resultado, setResultado] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro,      setErro]      = useState('');

  function setC(field, val) {
    setConfig(prev => ({ ...prev, [field]: val }));
    setResultado(null);
  }

  function presetMes(offset) {
    const now  = new Date();
    const d    = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const ano  = d.getFullYear();
    const mes  = d.getMonth();
    const ini  = `${ano}-${String(mes + 1).padStart(2,'0')}-01`;
    const last = new Date(ano, mes + 1, 0);
    const fin  = `${last.getFullYear()}-${String(last.getMonth()+1).padStart(2,'0')}-${String(last.getDate()).padStart(2,'0')}`;
    setConfig(prev => ({ ...prev, dataInicial: ini, dataFinal: fin }));
    setResultado(null);
  }

  async function gerar() {
    if (!config.dataInicial || !config.dataFinal) {
      setErro('Informe o período (data inicial e data final).');
      return;
    }
    setErro('');
    setCarregando(true);
    setResultado(null);

    const { data: rotasData } = await supabase.from('rotas').select('id, nome, contrato_id, configuracao').order('nome');
    const { data: veicData }  = await supabase.from('veiculos').select('id, placa').order('placa');
    const rotas    = rotasData || [];
    const veiculos = veicData  || [];

    let rotasContrato = config.contratoId
      ? rotas.filter(r => r.contrato_id === Number(config.contratoId))
      : rotas;
    // Filtro por tipo de veículo (via rotas.configuracao)
    if (config.filtroTipoVeiculo) {
      rotasContrato = rotasContrato.filter(r => r.configuracao === config.filtroTipoVeiculo);
    }
    const rotaIds = rotasContrato.map(r => r.id);

    if (config.contratoId && rotaIds.length === 0) {
      setResultado({ rowKeys: [], rowMeta: {}, colKeys: [], colLabels: {}, dados: {}, maxVal: 0 });
      setCarregando(false);
      return;
    }

    let query = supabase.from('registros')
      .select('id, rota_id, veiculo_id, data, horario_saida, horario_chegada, km_inicial, km_final, tipo_turno, status')
      .gte('data', config.dataInicial)
      .lte('data', config.dataFinal);

    if (config.contratoId)       query = query.in('rota_id', rotaIds);
    if (config.filtroTipoTurno)  query = query.eq('tipo_turno', config.filtroTipoTurno);
    if (config.filtroStatus)     query = query.eq('status', config.filtroStatus);

    const { data: regs, error } = await query;
    if (error) {
      setErro('Erro ao buscar dados: ' + error.message);
      setCarregando(false);
      return;
    }

    const dados    = {};
    const rowMeta  = {};
    const colKeysSet = new Set();

    for (const r of regs || []) {
      const { key: rk, label: rl } = getRowKey(r, config.linhas, rotas, veiculos);
      const ck  = getColKey(r, config.colunas);
      const val = metricaValor(r, config.metrica);
      if (!dados[rk]) dados[rk] = {};
      dados[rk][ck] = (dados[rk][ck] || 0) + val;
      rowMeta[rk]   = rl;
      colKeysSet.add(ck);
    }

    let colKeys = [...colKeysSet];
    if (config.colunas === 'dia_mes')    colKeys.sort();
    if (config.colunas === 'dia_semana') colKeys.sort((a, b) => Number(a) - Number(b));

    const colLabels = {};
    for (const k of colKeys) colLabels[k] = getColLabel(k, config.colunas);

    let rowKeys = Object.keys(dados);
    if (config.linhas === 'rota' || config.linhas === 'veiculo')
      rowKeys.sort((a, b) => (rowMeta[a] || '').localeCompare(rowMeta[b] || ''));

    let maxVal = 0;
    for (const rk of rowKeys)
      for (const ck of colKeys)
        if ((dados[rk]?.[ck] || 0) > maxVal) maxVal = dados[rk][ck];

    setResultado({ rowKeys, rowMeta, colKeys, colLabels, dados, maxVal });
    setCarregando(false);
  }

  function salvarConfig() {
    if (!nomeSalvar.trim()) return;
    const nova  = { id: Date.now(), nome: nomeSalvar.trim(), config: { ...config } };
    const lista = [nova, ...loadSalvos()];
    persistSalvos(lista);
    setSalvos(lista);
    setNomeSalvar('');
    setSalvando(false);
  }

  function excluirSalvo(id) {
    const lista = loadSalvos().filter(x => x.id !== id);
    persistSalvos(lista);
    setSalvos(lista);
  }

  const isHeat = config.visualizacao === 'heatmap' && config.colunas !== 'nenhuma';

  return (
    <div>
      <section style={s.card}>
        {/* Configs salvas */}
        {salvos.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            <span style={{ fontSize: '0.72rem', color: '#6b7280', alignSelf: 'center' }}>Salvos:</span>
            {salvos.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <button
                  onClick={() => { setConfig(item.config); setResultado(null); }}
                  style={{ fontSize: '0.72rem', padding: '2px 10px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, color: '#1d4ed8', cursor: 'pointer' }}
                >
                  {item.nome}
                </button>
                <button
                  onClick={() => excluirSalvo(item.id)}
                  title="Remover"
                  style={{ fontSize: '0.65rem', padding: '1px 5px', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', lineHeight: 1 }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Filtros de período e contrato */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '10px 16px', marginBottom: 10 }}>
          <div>
            <label style={s.label}>Contrato</label>
            <select value={config.contratoId} onChange={e => setC('contratoId', e.target.value)} style={s.input}>
              <option value="">Todos</option>
              {contratos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>Data inicial</label>
            <input type="date" value={config.dataInicial} onChange={e => setC('dataInicial', e.target.value)} style={s.input} />
          </div>
          <div>
            <label style={s.label}>Data final</label>
            <input type="date" value={config.dataFinal} onChange={e => setC('dataFinal', e.target.value)} style={s.input} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
            <button style={{ ...s.btnSecondary, fontSize: '0.72rem', padding: '5px 8px' }} onClick={() => presetMes(0)}>Este mês</button>
            <button style={{ ...s.btnSecondary, fontSize: '0.72rem', padding: '5px 8px' }} onClick={() => presetMes(-1)}>Mês passado</button>
          </div>
        </div>

        <div style={{ height: 1, background: '#e5e7eb', margin: '4px 0 10px' }} />

        {/* Dimensões e visualização */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px 16px' }}>
          <div>
            <label style={s.label}>Agrupar linhas por</label>
            <select value={config.linhas} onChange={e => setC('linhas', e.target.value)} style={s.input}>
              {OPCOES_LINHAS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>Agrupar colunas por</label>
            <select value={config.colunas} onChange={e => setC('colunas', e.target.value)} style={s.input}>
              {OPCOES_COLUNAS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>Métrica</label>
            <select value={config.metrica} onChange={e => setC('metrica', e.target.value)} style={s.input}>
              {OPCOES_METRICAS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>Visualização</label>
            <select value={config.visualizacao} onChange={e => setC('visualizacao', e.target.value)} style={s.input}>
              {OPCOES_VIZ.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>Filtrar tipo de veículo</label>
            <select value={config.filtroTipoVeiculo} onChange={e => setC('filtroTipoVeiculo', e.target.value)} style={s.input}>
              <option value="">Todos</option>
              {TIPOS_VEICULO.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>Filtrar tipo de turno</label>
            <select value={config.filtroTipoTurno} onChange={e => setC('filtroTipoTurno', e.target.value)} style={s.input}>
              <option value="">Todos</option>
              {TIPOS_TURNO.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>Filtrar status</label>
            <select value={config.filtroStatus} onChange={e => setC('filtroStatus', e.target.value)} style={s.input}>
              <option value="">Todos</option>
              <option value="completo">Completo</option>
              <option value="rascunho">Rascunho</option>
            </select>
          </div>
        </div>

        {erro && <p style={{ color: '#dc2626', fontSize: '0.82rem', marginTop: 8, marginBottom: 0 }}>{erro}</p>}

        <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <button style={s.btn} onClick={gerar} disabled={carregando}>
            {carregando ? 'Gerando...' : '▶ Gerar Relatório'}
          </button>
          {resultado && !salvando && (
            <button style={{ ...s.btnSecondary, fontSize: '0.78rem' }} onClick={() => setSalvando(true)}>
              ☆ Salvar configuração
            </button>
          )}
          {salvando && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                autoFocus
                placeholder="Nome para salvar..."
                value={nomeSalvar}
                onChange={e => setNomeSalvar(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') salvarConfig(); if (e.key === 'Escape') { setSalvando(false); setNomeSalvar(''); } }}
                style={{ ...s.input, padding: '4px 8px', fontSize: '0.8rem', width: 180 }}
              />
              <button style={s.btn} onClick={salvarConfig}>Salvar</button>
              <button style={s.btnSecondary} onClick={() => { setSalvando(false); setNomeSalvar(''); }}>Cancelar</button>
            </div>
          )}
        </div>
      </section>

      {resultado && (
        <ResultadoTabela
          resultado={resultado}
          config={config}
          isHeat={isHeat}
        />
      )}
    </div>
  );
}

function ResultadoTabela({ resultado, config, isHeat }) {
  const { rowKeys, rowMeta, colKeys, colLabels, dados, maxVal } = resultado;

  const colsLabel = OPCOES_LINHAS.find(o => o.id === config.linhas)?.label || 'Linha';
  const semColunas = config.colunas === 'nenhuma';

  if (!rowKeys.length) return (
    <div style={{ ...s.card, textAlign: 'center', color: '#6b7280', padding: '32px 24px' }}>
      Nenhum dado encontrado para os filtros selecionados.
    </div>
  );

  const thBase = {
    padding: '5px 8px', fontSize: '0.7rem', fontWeight: 700,
    background: '#1a5276', color: '#fff',
    border: '1px solid #154360', whiteSpace: 'nowrap', textAlign: 'center',
  };
  const td0 = { padding: '4px 8px', fontSize: '0.8rem', border: '1px solid #e5e7eb', whiteSpace: 'nowrap' };
  const tdC = { ...td0, textAlign: 'center' };

  const grandeTotal = rowKeys.reduce((acc, rk) =>
    acc + colKeys.reduce((a, ck) => a + (dados[rk]?.[ck] || 0), 0), 0);

  return (
    <div style={{ marginTop: 8 }}>
      {isHeat && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 8, fontSize: '0.74rem', color: '#374151', alignItems: 'center', flexWrap: 'wrap' }}>
          {[
            { bg: '#dbeafe', label: '< 25% do máximo' },
            { bg: '#93c5fd', label: '25–50%' },
            { bg: '#3b82f6', label: '50–75%' },
            { bg: '#1d4ed8', color: '#fff', label: '> 75%' },
          ].map(({ bg, color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 12, height: 12, background: bg, borderRadius: 2 }} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ overflowX: 'auto', border: '1px solid #154360', borderRadius: 8, marginBottom: 24 }}>
        <table style={{ borderCollapse: 'collapse', width: semColunas ? 'auto' : '100%' }}>
          <thead>
            <tr>
              <th style={{ ...thBase, textAlign: 'left', position: 'sticky', left: 0, zIndex: 2, minWidth: 140 }}>
                {colsLabel}
              </th>
              {!semColunas && colKeys.map(ck => (
                <th key={ck} style={thBase}>{colLabels[ck] || ck}</th>
              ))}
              <th style={{ ...thBase, background: '#0e4d3a', minWidth: 80 }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {rowKeys.map((rk, ri) => {
              const par  = ri % 2 === 0;
              const rowTotal = colKeys.reduce((acc, ck) => acc + (dados[rk]?.[ck] || 0), 0);
              return (
                <tr key={rk}>
                  <td style={{ ...td0, fontWeight: 600, background: par ? '#f8fafc' : '#fff', position: 'sticky', left: 0, zIndex: 1 }}>
                    {rowMeta[rk]}
                  </td>
                  {!semColunas && colKeys.map(ck => {
                    const val = dados[rk]?.[ck] || 0;
                    const bg  = isHeat ? heatBg(val, maxVal) : (par ? '#f8fafc' : '#fff');
                    const fg  = isHeat ? heatFg(val, maxVal) : (val > 0 ? '#111827' : '#d1d5db');
                    return (
                      <td key={ck} style={{ ...tdC, background: bg, color: fg, fontWeight: val > 0 ? 600 : 400 }}>
                        {val > 0 ? formatarValor(val, config.metrica) : '—'}
                      </td>
                    );
                  })}
                  <td style={{ ...tdC, background: par ? '#f0fdf4' : '#dcfce7', color: rowTotal > 0 ? '#15803d' : '#d1d5db', fontWeight: 700 }}>
                    {rowTotal > 0 ? formatarValor(rowTotal, config.metrica) : '—'}
                  </td>
                </tr>
              );
            })}

            {/* Linha de totais das colunas */}
            {!semColunas && (
              <tr style={{ background: '#dbeafe' }}>
                <td style={{ ...td0, fontWeight: 700, background: '#dbeafe', position: 'sticky', left: 0, zIndex: 1 }}>TOTAL</td>
                {colKeys.map(ck => {
                  const t = rowKeys.reduce((acc, rk) => acc + (dados[rk]?.[ck] || 0), 0);
                  return (
                    <td key={ck} style={{ ...tdC, background: '#dbeafe', color: t > 0 ? '#1a5276' : '#d1d5db', fontWeight: t > 0 ? 700 : 400 }}>
                      {t > 0 ? formatarValor(t, config.metrica) : '—'}
                    </td>
                  );
                })}
                <td style={{ ...tdC, background: '#a7f3d0', color: '#065f46', fontWeight: 700, fontSize: '0.88rem' }}>
                  {formatarValor(grandeTotal, config.metrica)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
