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
  { id: 'tabela',    label: 'Tabela' },
  { id: 'heatmap',   label: 'Heat Map' },
  { id: 'lista',     label: 'Lista Detalhada' },
  { id: 'odometro',  label: 'KM por Veículo (Odômetro)' },
];

const COLUNAS_LISTA = [
  { id: 'rota',       label: 'Rota',          default: true },
  { id: 'veiculo',    label: 'Veículo',        default: true },
  { id: 'data',       label: 'Data',           default: true },
  { id: 'saida',      label: 'Saída',          default: false },
  { id: 'chegada',    label: 'Chegada',        default: false },
  { id: 'km_ini',     label: 'KM Inicial',     default: true },
  { id: 'km_fin',     label: 'KM Final',       default: true },
  { id: 'km_rod',     label: 'KM Total',       default: true },
  { id: 'tipo_turno', label: 'Tipo de Turno',  default: false },
  { id: 'status',     label: 'Status',         default: false },
  { id: 'obs',        label: 'Finalidade/Obs', default: false },
];

const TIPOS_TURNO   = ['normal', 'turno extra', 'rodada interna', 'rota', 'manutencao'];
const TIPOS_VEICULO = ['RODOVIÁRIO', 'SEMI RODOVIÁRIO', 'URBANO', 'MICRO', 'VAN', 'PEQUENO PORTE'];
const DIAS_SEMANA   = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES_PT      = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

const COLUNAS_LISTA_PADRAO = Object.fromEntries(COLUNAS_LISTA.map(c => [c.id, c.default]));

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
  colunasLista: COLUNAS_LISTA_PADRAO,
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

function fmtNum(n) {
  return n != null ? Number(n).toLocaleString('pt-BR') : '—';
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
  const [config,     setConfig]    = useState(CONFIG_INICIAL);
  const [salvos,     setSalvos]    = useState(loadSalvos);
  const [nomeSalvar, setNomeSalvar] = useState('');
  const [salvando,   setSalvando]  = useState(false);
  const [resultado,  setResultado] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro,       setErro]      = useState('');

  const isLista     = config.visualizacao === 'lista';
  const isOdometro  = config.visualizacao === 'odometro';
  const modoSimples = isLista || isOdometro; // modos que não usam colunas/métrica

  function setC(field, val) {
    setConfig(prev => ({ ...prev, [field]: val }));
    setResultado(null);
  }

  function toggleColunaLista(id) {
    setConfig(prev => ({
      ...prev,
      colunasLista: { ...prev.colunasLista, [id]: !prev.colunasLista[id] },
    }));
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
    const todasRotas = rotasData || [];
    const veiculos   = veicData  || [];

    let rotasContrato = config.contratoId
      ? todasRotas.filter(r => r.contrato_id === Number(config.contratoId))
      : todasRotas;
    if (config.filtroTipoVeiculo)
      rotasContrato = rotasContrato.filter(r => r.configuracao === config.filtroTipoVeiculo);

    const rotaIds = rotasContrato.map(r => r.id);

    if ((config.contratoId || config.filtroTipoVeiculo) && rotaIds.length === 0) {
      setResultado({ tipo: 'vazio' });
      setCarregando(false);
      return;
    }

    let query = supabase.from('registros')
      .select('id, rota_id, veiculo_id, data, horario_saida, horario_chegada, km_inicial, km_final, tipo_turno, status, finalidade, observacao')
      .gte('data', config.dataInicial)
      .lte('data', config.dataFinal);

    if (config.contratoId || config.filtroTipoVeiculo) query = query.in('rota_id', rotaIds);
    if (config.filtroTipoTurno) query = query.eq('tipo_turno', config.filtroTipoTurno);
    if (config.filtroStatus)    query = query.eq('status', config.filtroStatus);

    const { data: regs, error } = await query;
    if (error) {
      setErro('Erro ao buscar dados: ' + error.message);
      setCarregando(false);
      return;
    }

    // ── MODO ODÔMETRO ──
    if (isOdometro) {
      // Força validado = true independentemente dos filtros
      let qOdo = supabase.from('registros')
        .select('id, rota_id, veiculo_id, data, horario_saida, km_inicial, km_final, tipo_turno')
        .gte('data', config.dataInicial)
        .lte('data', config.dataFinal)
        .eq('validado', true);
      if (rotaIds.length > 0) qOdo = qOdo.in('rota_id', rotaIds);
      else if (config.contratoId || config.filtroTipoVeiculo) {
        // Filtro ativo mas sem rotas → resultado vazio
        setResultado({ tipo: 'odometro', linhas: [] });
        setCarregando(false);
        return;
      }
      const { data: regsVal, error: errVal } = await qOdo;

      if (errVal) { setErro('Erro: ' + errVal.message); setCarregando(false); return; }

      const regsF = config.filtroTipoTurno
        ? (regsVal || []).filter(r => r.tipo_turno === config.filtroTipoTurno)
        : (regsVal || []);

      // Agrupa por rota_id + veiculo_id
      const gruposMap = new Map();
      for (const r of regsF) {
        const k = `${r.rota_id}_${r.veiculo_id}`;
        if (!gruposMap.has(k)) gruposMap.set(k, { rota_id: r.rota_id, veiculo_id: r.veiculo_id, regs: [] });
        gruposMap.get(k).regs.push(r);
      }

      const linhas = [];
      for (const g of gruposMap.values()) {
        // Ordena por data + horário para garantir ordem cronológica
        g.regs.sort((a, b) => (a.data + (a.horario_saida || '')).localeCompare(b.data + (b.horario_saida || '')));
        const primeiro = g.regs[0];
        const ultimo   = g.regs[g.regs.length - 1];
        const kmIni    = Number(primeiro.km_inicial) || null;
        const kmFin    = ultimo.km_final != null ? Number(ultimo.km_final) : null;
        const kmTotal  = kmIni != null && kmFin != null ? Math.max(0, kmFin - kmIni) : null;
        linhas.push({
          rota_id:      g.rota_id,
          veiculo_id:   g.veiculo_id,
          rotaNome:     todasRotas.find(r => r.id === g.rota_id)?.nome || `#${g.rota_id}`,
          veiculoPlaca: veiculos.find(v => v.id === g.veiculo_id)?.placa || `#${g.veiculo_id}`,
          kmIni, kmFin, kmTotal,
          nRegs:        g.regs.length,
          dataIni:      primeiro.data,
          dataFin:      ultimo.data,
        });
      }

      linhas.sort((a, b) => {
        const cmp = a.rotaNome.localeCompare(b.rotaNome);
        return cmp !== 0 ? cmp : a.veiculoPlaca.localeCompare(b.veiculoPlaca);
      });

      setResultado({ tipo: 'odometro', linhas });
      setCarregando(false);
      return;
    }

    // ── MODO LISTA DETALHADA ──
    if (isLista) {
      const regsOrdenados = [...(regs || [])].sort((a, b) => {
        const { label: la } = getRowKey(a, config.linhas, todasRotas, veiculos);
        const { label: lb } = getRowKey(b, config.linhas, todasRotas, veiculos);
        const cmp = la.localeCompare(lb);
        if (cmp !== 0) return cmp;
        return (a.data + (a.horario_saida || '')).localeCompare(b.data + (b.horario_saida || ''));
      });

      // Agrupa por linhas para criar seções com cabeçalho
      const gruposMap = new Map();
      for (const r of regsOrdenados) {
        const { key, label } = getRowKey(r, config.linhas, todasRotas, veiculos);
        if (!gruposMap.has(key)) gruposMap.set(key, { key, label, regs: [] });
        gruposMap.get(key).regs.push(r);
      }

      setResultado({ tipo: 'lista', grupos: [...gruposMap.values()], rotas: todasRotas, veiculos });
      setCarregando(false);
      return;
    }

    // ── MODO PIVOT (tabela / heatmap) ──
    const dados    = {};
    const rowMeta  = {};
    const colKeysSet = new Set();

    for (const r of regs || []) {
      const { key: rk, label: rl } = getRowKey(r, config.linhas, todasRotas, veiculos);
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

    setResultado({ tipo: 'pivot', rowKeys, rowMeta, colKeys, colLabels, dados, maxVal });
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
                  onClick={() => { setConfig({ ...CONFIG_INICIAL, ...item.config }); setResultado(null); }}
                  style={{ fontSize: '0.72rem', padding: '2px 10px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, color: '#1d4ed8', cursor: 'pointer' }}
                >
                  {item.nome}
                </button>
                <button onClick={() => excluirSalvo(item.id)} title="Remover"
                  style={{ fontSize: '0.65rem', padding: '1px 5px', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', lineHeight: 1 }}>
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

        {/* Dimensões, visualização e filtros */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px 16px' }}>
          {!isOdometro && (
            <div>
              <label style={s.label}>{isLista ? 'Agrupar por' : 'Agrupar linhas por'}</label>
              <select value={config.linhas} onChange={e => setC('linhas', e.target.value)} style={s.input}>
                {OPCOES_LINHAS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>
          )}
          {!modoSimples && (
            <div>
              <label style={s.label}>Agrupar colunas por</label>
              <select value={config.colunas} onChange={e => setC('colunas', e.target.value)} style={s.input}>
                {OPCOES_COLUNAS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>
          )}
          {!modoSimples && (
            <div>
              <label style={s.label}>Métrica</label>
              <select value={config.metrica} onChange={e => setC('metrica', e.target.value)} style={s.input}>
                {OPCOES_METRICAS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>
          )}
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
          {!isOdometro && (
            <div>
              <label style={s.label}>Filtrar status</label>
              <select value={config.filtroStatus} onChange={e => setC('filtroStatus', e.target.value)} style={s.input}>
                <option value="">Todos</option>
                <option value="completo">Completo</option>
                <option value="rascunho">Rascunho</option>
              </select>
            </div>
          )}
          {isOdometro && (
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6, padding: '6px 10px', fontSize: '0.74rem', color: '#15803d', fontWeight: 600 }}>
                ✓ Somente registros validados
              </div>
            </div>
          )}
        </div>

        {/* Seletor de colunas para Lista Detalhada */}
        {isLista && (
          <div style={{ marginTop: 12, padding: '10px 12px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: 8 }}>Colunas a exibir</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px' }}>
              {COLUNAS_LISTA.map(col => (
                <label key={col.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: '#374151', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={config.colunasLista?.[col.id] ?? col.default}
                    onChange={() => toggleColunaLista(col.id)}
                    style={{ width: 14, height: 14, cursor: 'pointer' }}
                  />
                  {col.label}
                </label>
              ))}
            </div>
          </div>
        )}

        {erro && <p style={{ color: '#dc2626', fontSize: '0.82rem', marginTop: 8, marginBottom: 0 }}>{erro}</p>}

        <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <button style={s.btn} onClick={gerar} disabled={carregando}>
            {carregando ? 'Gerando...' : '▶ Gerar Relatório'}
          </button>
          {resultado && resultado.tipo !== 'vazio' && !salvando && (
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

      {resultado && resultado.tipo === 'vazio' && (
        <div style={{ ...s.card, textAlign: 'center', color: '#6b7280', padding: '32px 24px' }}>
          Nenhum dado encontrado para os filtros selecionados.
        </div>
      )}

      {resultado && resultado.tipo === 'odometro' && (
        <ResultadoOdometro resultado={resultado} fmtNum={fmtNum} config={config} />
      )}

      {resultado && resultado.tipo === 'lista' && (
        <ResultadoLista resultado={resultado} config={config} fmtNum={fmtNum} calcKm={calcKm} calcHoras={calcHoras} />
      )}

      {resultado && resultado.tipo === 'pivot' && (
        <ResultadoPivot resultado={resultado} config={config} isHeat={isHeat} />
      )}
    </div>
  );
}

// ── ODÔMETRO ─────────────────────────────────────────────────────────────────

function ResultadoOdometro({ resultado, fmtNum, config }) {
  const { linhas } = resultado;

  if (!linhas.length) return (
    <div style={{ ...s.card, textAlign: 'center', color: '#6b7280', padding: '32px 24px' }}>
      Nenhum registro validado encontrado para os filtros selecionados.
    </div>
  );

  const th = {
    padding: '6px 10px', fontSize: '0.72rem', fontWeight: 700,
    background: '#1a5276', color: '#fff', border: '1px solid #154360',
    whiteSpace: 'nowrap',
  };
  const thR = { ...th, textAlign: 'right' };
  const td0 = { padding: '5px 10px', fontSize: '0.8rem', border: '1px solid #e5e7eb', whiteSpace: 'nowrap' };
  const tdR = { ...td0, textAlign: 'right' };

  // Agrupa linhas por rota
  const rotasMap = new Map();
  for (const l of linhas) {
    if (!rotasMap.has(l.rota_id)) rotasMap.set(l.rota_id, { nome: l.rotaNome, linhas: [] });
    rotasMap.get(l.rota_id).linhas.push(l);
  }
  const rotas = [...rotasMap.values()];
  const totalGeral = linhas.reduce((acc, l) => acc + (l.kmTotal || 0), 0);

  return (
    <div style={{ marginTop: 8, overflowX: 'auto', border: '1px solid #154360', borderRadius: 8, marginBottom: 24 }}>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={th}>ROTA</th>
            <th style={th}>VEÍCULO</th>
            <th style={thR}>1º KM (ini)</th>
            <th style={thR}>Último KM (fin)</th>
            <th style={{ ...thR, background: '#0e4d3a' }}>KM TOTAL</th>
            <th style={{ ...th, color: 'rgba(255,255,255,0.6)', fontSize: '0.65rem' }}>PERÍODO</th>
            <th style={{ ...th, color: 'rgba(255,255,255,0.6)', fontSize: '0.65rem' }}>REGISTROS</th>
          </tr>
        </thead>
        <tbody>
          {rotas.map((rota, ri) => {
            const subtotal = rota.linhas.reduce((acc, l) => acc + (l.kmTotal || 0), 0);
            return (
              <React.Fragment key={ri}>
                {rota.linhas.map((l, li) => {
                  const par = li % 2 === 0;
                  const bg  = par ? '#fff' : '#f8fafc';
                  const semFim = l.kmFin == null;
                  return (
                    <tr key={`${l.rota_id}_${l.veiculo_id}`}>
                      <td style={{ ...td0, background: bg, fontWeight: li === 0 ? 600 : 400, color: li === 0 ? '#1a5276' : 'inherit' }}>
                        {li === 0 ? l.rotaNome : ''}
                      </td>
                      <td style={{ ...td0, background: bg, fontWeight: 600 }}>{l.veiculoPlaca}</td>
                      <td style={{ ...tdR, background: bg }}>{l.kmIni != null ? fmtNum(l.kmIni) : '—'}</td>
                      <td style={{ ...tdR, background: bg, color: semFim ? '#dc2626' : 'inherit' }}>
                        {semFim ? '(sem km final)' : fmtNum(l.kmFin)}
                      </td>
                      <td style={{ ...tdR, background: bg, fontWeight: 700, color: l.kmTotal != null ? '#15803d' : '#9ca3af' }}>
                        {l.kmTotal != null ? fmtNum(l.kmTotal) : '—'}
                      </td>
                      <td style={{ ...td0, background: bg, fontSize: '0.72rem', color: '#6b7280' }}>
                        {l.dataIni === l.dataFin ? l.dataIni : `${l.dataIni} → ${l.dataFin}`}
                      </td>
                      <td style={{ ...tdR, background: bg, fontSize: '0.72rem', color: '#6b7280' }}>{l.nRegs}</td>
                    </tr>
                  );
                })}
                {/* Subtotal por rota */}
                <tr style={{ background: '#f0fdf4' }}>
                  <td style={{ ...td0, fontWeight: 700, color: '#15803d', background: '#f0fdf4' }}>
                    Subtotal {rota.nome}
                  </td>
                  <td style={{ ...td0, background: '#f0fdf4' }} colSpan={2}></td>
                  <td style={{ ...tdR, background: '#f0fdf4', fontWeight: 700, color: '#15803d', fontSize: '0.72rem' }}>
                    {rota.linhas.length} veículo{rota.linhas.length !== 1 ? 's' : ''}
                  </td>
                  <td style={{ ...tdR, background: '#f0fdf4', fontWeight: 700, color: '#15803d', fontSize: '0.9rem' }}>
                    {fmtNum(subtotal)} km
                  </td>
                  <td style={{ ...td0, background: '#f0fdf4' }} colSpan={2}></td>
                </tr>
              </React.Fragment>
            );
          })}
          {/* Total geral */}
          <tr style={{ background: '#dbeafe' }}>
            <td style={{ ...td0, fontWeight: 700, color: '#1a5276', background: '#dbeafe' }} colSpan={4}>
              TOTAL GERAL
            </td>
            <td style={{ ...tdR, background: '#a7f3d0', color: '#065f46', fontWeight: 700, fontSize: '1rem' }}>
              {fmtNum(totalGeral)} km
            </td>
            <td style={{ ...td0, background: '#dbeafe', fontSize: '0.72rem', color: '#6b7280' }}>
              {linhas.reduce((acc, l) => acc + l.nRegs, 0)} registros validados
            </td>
            <td style={{ ...td0, background: '#dbeafe' }}></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── LISTA DETALHADA ──────────────────────────────────────────────────────────

function ResultadoLista({ resultado, config, fmtNum, calcKm, calcHoras }) {
  const { grupos, rotas, veiculos } = resultado;
  const cols = config.colunasLista || COLUNAS_LISTA_PADRAO;

  const visíveis = COLUNAS_LISTA.filter(c => cols[c.id]);

  const thL = {
    padding: '5px 8px', fontSize: '0.7rem', fontWeight: 700,
    background: '#1a5276', color: '#fff', border: '1px solid #154360',
    whiteSpace: 'nowrap', textAlign: 'left',
  };
  const thR = { ...thL, textAlign: 'right' };
  const td0 = { padding: '4px 8px', fontSize: '0.78rem', border: '1px solid #e5e7eb', whiteSpace: 'nowrap' };
  const tdR = { ...td0, textAlign: 'right' };

  function placaVeiculo(vid) { return veiculos.find(v => v.id === vid)?.placa || '—'; }
  function nomeRota(rid)     { return rotas.find(r => r.id === rid)?.nome || '—'; }

  function celula(col, r, par) {
    const bg = par ? '#fff' : '#f8fafc';
    switch (col.id) {
      case 'rota':       return <td key={col.id} style={{ ...td0, background: bg }}>{nomeRota(r.rota_id)}</td>;
      case 'veiculo':    return <td key={col.id} style={{ ...td0, background: bg }}>{placaVeiculo(r.veiculo_id)}</td>;
      case 'data':       return <td key={col.id} style={{ ...td0, background: bg }}>{r.data}</td>;
      case 'saida':      return <td key={col.id} style={{ ...td0, background: bg }}>{r.horario_saida?.slice(0,5) || '—'}</td>;
      case 'chegada':    return <td key={col.id} style={{ ...td0, background: bg }}>{r.horario_chegada?.slice(0,5) || '—'}</td>;
      case 'km_ini':     return <td key={col.id} style={{ ...tdR, background: bg }}>{fmtNum(r.km_inicial)}</td>;
      case 'km_fin':     return <td key={col.id} style={{ ...tdR, background: bg }}>{r.km_final != null ? fmtNum(r.km_final) : '—'}</td>;
      case 'km_rod':     return <td key={col.id} style={{ ...tdR, fontWeight: 600, background: bg }}>{fmtNum(calcKm(r))}</td>;
      case 'tipo_turno': return <td key={col.id} style={{ ...td0, background: bg }}>{r.tipo_turno || '—'}</td>;
      case 'status':     return <td key={col.id} style={{ ...td0, background: bg }}>{r.status || '—'}</td>;
      case 'obs':        return <td key={col.id} style={{ ...td0, background: bg, color: '#6b7280' }}>{[r.finalidade, r.observacao].filter(Boolean).join(' · ') || '—'}</td>;
      default:           return null;
    }
  }

  const totalGeral = grupos.reduce((acc, g) => acc + g.regs.reduce((a, r) => a + calcKm(r), 0), 0);
  const mostrarKmRod = cols['km_rod'];

  return (
    <div style={{ marginTop: 8, overflowX: 'auto', border: '1px solid #154360', borderRadius: 8, marginBottom: 24 }}>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            {visíveis.map(col => (
              <th key={col.id} style={['km_ini','km_fin','km_rod'].includes(col.id) ? thR : thL}>
                {col.label.toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grupos.map(grupo => {
            const kmGrupo = grupo.regs.reduce((acc, r) => acc + calcKm(r), 0);
            const horasGrupo = grupo.regs.reduce((acc, r) => acc + calcHoras(r), 0);
            return (
              <React.Fragment key={grupo.key}>
                {/* Cabeçalho do grupo */}
                <tr>
                  <td
                    colSpan={visíveis.length}
                    style={{
                      padding: '5px 10px', fontWeight: 700, fontSize: '0.8rem',
                      background: '#1a5276', color: '#fff',
                      border: '1px solid #154360',
                    }}
                  >
                    {grupo.label}
                    <span style={{ fontWeight: 400, marginLeft: 12, opacity: 0.8, fontSize: '0.72rem' }}>
                      {grupo.regs.length} registro{grupo.regs.length !== 1 ? 's' : ''}
                      {mostrarKmRod ? ` · ${fmtNum(Math.round(kmGrupo))} km` : ''}
                    </span>
                  </td>
                </tr>
                {/* Linhas do grupo */}
                {grupo.regs.map((r, ri) => (
                  <tr key={r.id}>
                    {visíveis.map(col => celula(col, r, ri % 2 === 0))}
                  </tr>
                ))}
                {/* Subtotal do grupo */}
                {grupo.regs.length > 1 && (
                  <tr>
                    {visíveis.map(col => {
                      if (col.id === 'km_rod') return (
                        <td key={col.id} style={{ ...tdR, fontWeight: 700, background: '#f0fdf4', color: '#15803d' }}>
                          {fmtNum(Math.round(kmGrupo))}
                        </td>
                      );
                      const isFirst = col.id === visíveis[0].id;
                      return (
                        <td key={col.id} style={{ ...td0, fontWeight: isFirst ? 700 : 400, background: '#f0fdf4', color: isFirst ? '#15803d' : '#9ca3af', fontSize: '0.72rem' }}>
                          {isFirst ? 'SUBTOTAL' : ''}
                        </td>
                      );
                    })}
                  </tr>
                )}
              </React.Fragment>
            );
          })}
          {/* Total geral */}
          {mostrarKmRod && (
            <tr style={{ background: '#dbeafe' }}>
              {visíveis.map(col => {
                if (col.id === 'km_rod') return (
                  <td key={col.id} style={{ ...tdR, fontWeight: 700, background: '#dbeafe', color: '#1a5276', fontSize: '0.88rem' }}>
                    {fmtNum(Math.round(totalGeral))}
                  </td>
                );
                const isFirst = col.id === visíveis[0].id;
                return (
                  <td key={col.id} style={{ ...td0, fontWeight: isFirst ? 700 : 400, background: '#dbeafe', color: '#1a5276' }}>
                    {isFirst ? 'TOTAL GERAL' : ''}
                  </td>
                );
              })}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── PIVOT (tabela / heatmap) ─────────────────────────────────────────────────

function ResultadoPivot({ resultado, config, isHeat }) {
  const { rowKeys, rowMeta, colKeys, colLabels, dados, maxVal } = resultado;

  const colsLabel  = OPCOES_LINHAS.find(o => o.id === config.linhas)?.label || 'Linha';
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
            { bg: '#1d4ed8', label: '> 75%' },
          ].map(({ bg, label }) => (
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
              const par      = ri % 2 === 0;
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
