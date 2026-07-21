import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../supabase.js';
import { kmRodados, formatarMes } from '../storage.js';
import { exportPDF, btnPDF } from '../utils/pdf.js';
import { G, gCard, gLabel, gInput, gBtnSec, Selo, RotaMotif, PillDD } from '../gestorUI.jsx';

const fmt = (n) => Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const th0 = { padding: '6px 10px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap', background: '#166534', color: '#fff', border: '1px solid #14532d', textAlign: 'center' };
const th1 = { ...th0, background: '#15803d' };
const td0 = { padding: '5px 8px', fontSize: '0.78rem', whiteSpace: 'nowrap', border: '1px solid #e5e7eb' };
const tdR = { ...td0, textAlign: 'right' };
const tdTot = { ...td0, fontWeight: 700, background: '#f0fdf4' };
const tdTotR = { ...tdTot, textAlign: 'right' };

const TIPOS_VEICULO = ['RODOVIÁRIO', 'SEMI RODOVIÁRIO', 'URBANO', 'MICRO', 'VAN', 'PEQUENO PORTE'];

function QuantCell({ value, autoValue, onChange, onReset }) {
  const overridden = value !== autoValue;
  return (
    <td style={{ ...tdR, padding: '2px 4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
        <input
          type="number"
          value={value}
          min={0}
          onChange={e => onChange(Math.max(0, Number(e.target.value) || 0))}
          style={{
            width: 52, textAlign: 'right', fontSize: '0.78rem',
            border: '1px solid transparent', borderRadius: 3, padding: '2px 4px',
            background: 'transparent', outline: 'none',
            fontWeight: value > 0 ? 700 : 400,
            color: overridden ? '#1d4ed8' : 'inherit',
          }}
          onFocus={e => { e.target.style.border = '1px solid #93c5fd'; e.target.style.background = '#eff6ff'; }}
          onBlur={e => { e.target.style.border = '1px solid transparent'; e.target.style.background = 'transparent'; }}
        />
        {overridden && (
          <button
            onClick={onReset}
            title={`Restaurar automático (${autoValue})`}
            style={{ fontSize: '0.65rem', padding: '1px 4px', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', lineHeight: 1, flexShrink: 0 }}
          >
            ↺
          </button>
        )}
      </div>
    </td>
  );
}

export default function BoletimScreen() {
  const boletimRef = useRef(null);
  const [contratos, setContratos] = useState([]);
  const [contratoId, setContratoId] = useState('');
  const [mes, setMes] = useState('');
  const [ddAberto, setDdAberto] = useState('');
  const [rotas, setRotas] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [regra, setRegra] = useState(null);
  const [valoresVeiculo, setValoresVeiculo] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [configRotas, setConfigRotas] = useState({});
  const [salvandoConfig, setSalvandoConfig] = useState({});
  // Ajustes manuais de quantidade por rota
  const [ajustes, setAjustes] = useState({});
  // ISS editável (%)
  const [issPercent, setIssPercent] = useState(5);

  const mesesDisponiveis = useMemo(() => {
    const lista = [];
    const now = new Date();
    for (let i = 0; i < 18; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      lista.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return lista;
  }, []);

  useEffect(() => {
    supabase.from('contratos').select('id, nome').order('nome')
      .then(({ data }) => setContratos(data || []));
  }, []);

  useEffect(() => {
    if (!contratoId || !mes) return;
    carregar();
  }, [contratoId, mes]);

  async function carregar() {
    setCarregando(true);
    setAjustes({});   // limpa overrides ao recarregar
    const cid = Number(contratoId);

    const [{ data: rotasData }, { data: regraData }] = await Promise.all([
      supabase.from('rotas').select('id, nome, configuracao').eq('contrato_id', cid),
      supabase.from('regras_contrato').select('*, valores_veiculo(*)').eq('contrato_id', cid).maybeSingle(),
    ]);

    const rotaIds = (rotasData || []).map(r => r.id);
    let regsData = [];
    if (rotaIds.length > 0) {
      const { data } = await supabase.from('registros')
        .select('*')
        .in('rota_id', rotaIds)
        .gte('data', `${mes}-01`)
        .lte('data', `${mes}-31`)
        .eq('validado', true);
      regsData = data || [];
    }

    const cfg = {};
    for (const r of (rotasData || [])) {
      cfg[r.id] = r.configuracao || '';
    }

    setRotas(rotasData || []);
    setConfigRotas(cfg);
    setRegistros(regsData);
    setRegra(regraData);
    setValoresVeiculo(regraData?.valores_veiculo || []);
    setCarregando(false);
  }

  async function salvarConfigRota(rotaId, novaConfig) {
    setSalvandoConfig(prev => ({ ...prev, [rotaId]: true }));
    await supabase.from('rotas').update({ configuracao: novaConfig || null }).eq('id', rotaId);
    setSalvandoConfig(prev => ({ ...prev, [rotaId]: false }));
  }

  function handleConfigChange(rotaId, novaConfig) {
    setConfigRotas(prev => ({ ...prev, [rotaId]: novaConfig }));
    salvarConfigRota(rotaId, novaConfig);
  }

  function setAjuste(rotaId, campo, valor) {
    setAjustes(prev => ({
      ...prev,
      [rotaId]: { ...(prev[rotaId] || {}), [campo]: valor },
    }));
  }
  function resetAjuste(rotaId, campo) {
    setAjustes(prev => {
      const novo = { ...(prev[rotaId] || {}) };
      delete novo[campo];
      return { ...prev, [rotaId]: novo };
    });
  }

  const linhas = useMemo(() => {
    if (!registros.length) return [];

    const grupos = new Map();
    for (const r of registros) {
      if (!grupos.has(r.rota_id)) grupos.set(r.rota_id, { rota_id: r.rota_id, regs: [] });
      grupos.get(r.rota_id).regs.push(r);
    }

    return Array.from(grupos.values()).map(g => {
      const rota       = rotas.find(x => x.id === g.rota_id);
      const configAtual = configRotas[g.rota_id] || '';
      const billing    = valoresVeiculo.find(v => v.configuracao === configAtual);

      const kmTotal    = g.regs.reduce((acc, r) => acc + kmRodados(r), 0);
      const kmFranquia = regra?.km_franquia_mensal || 0;

      const tipoEfetivo = r => r.domingo_feriado ? 'normal' : r.tipo_turno;
      const tnQuantAuto  = g.regs.filter(r => tipoEfetivo(r) === 'normal').length;
      const teQuantAuto  = g.regs.filter(r => tipoEfetivo(r) === 'turno extra').length;
      const kmExtraAuto  = Math.max(0, kmTotal - kmFranquia);

      // Aplica overrides manuais se existirem
      const adj       = ajustes[g.rota_id] || {};
      const tnQuant   = adj.tnQuant  ?? tnQuantAuto;
      const teQuant   = adj.teQuant  ?? teQuantAuto;
      const kmExtra   = adj.kmExtra  ?? kmExtraAuto;

      const valorFixo  = billing?.valor_mensal || 0;
      const tnValor    = billing?.valor_turno_normal || 0;
      const teValor    = billing?.valor_turno_extra || 0;
      const kmExValor  = billing?.valor_km_extra_turno_extra || 0;

      const tnTotal    = tnQuant * tnValor;
      const teTotal    = teQuant * teValor;
      const kmExTotal  = kmExtra * kmExValor;
      const valorBruto = valorFixo + tnTotal + teTotal + kmExTotal;
      const iss        = valorBruto * (issPercent / 100);
      const valorLiquido = valorBruto - iss;

      return {
        rota_id: g.rota_id,
        rotaNome: rota?.nome || '—',
        configAtual,
        semConfig: !configAtual || !billing,
        valorFixo, tnValor, tnQuant, tnQuantAuto, tnTotal,
        teValor, teQuant, teQuantAuto, teTotal,
        kmExValor, kmExtra, kmExtraAuto, kmExTotal,
        valorBruto, iss, valorLiquido,
      };
    }).sort((a, b) => a.rotaNome.localeCompare(b.rotaNome));
  }, [registros, rotas, valoresVeiculo, regra, configRotas, ajustes, issPercent]);

  const tot = useMemo(() => linhas.reduce((acc, l) => ({
    valorFixo:    acc.valorFixo    + l.valorFixo,
    tnQuant:      acc.tnQuant      + l.tnQuant,
    tnTotal:      acc.tnTotal      + l.tnTotal,
    teQuant:      acc.teQuant      + l.teQuant,
    teTotal:      acc.teTotal      + l.teTotal,
    kmExtra:      acc.kmExtra      + l.kmExtra,
    kmExTotal:    acc.kmExTotal    + l.kmExTotal,
    valorBruto:   acc.valorBruto   + l.valorBruto,
    iss:          acc.iss          + l.iss,
    valorLiquido: acc.valorLiquido + l.valorLiquido,
  }), { valorFixo:0,tnQuant:0,tnTotal:0,teQuant:0,teTotal:0,kmExtra:0,kmExTotal:0,valorBruto:0,iss:0,valorLiquido:0 }), [linhas]);

  const brutoRotas   = linhas.reduce((a, l) => a + l.valorFixo, 0);
  const brutoExtras  = linhas.reduce((a, l) => a + l.tnTotal + l.teTotal + l.kmExTotal, 0);
  const issRotas     = brutoRotas  * (issPercent / 100);
  const issExtras    = brutoExtras * (issPercent / 100);
  const contratoNome = contratos.find(c => c.id === Number(contratoId))?.nome || '';
  const temAjustes   = Object.keys(ajustes).some(k => Object.keys(ajustes[k]).length > 0);

  function fecharDD() { setTimeout(() => setDdAberto(''), 150); }

  return (
    <div style={{ maxWidth: 1220 }}>
      {/* Header + Selo */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, marginBottom: 22 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 22, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.01em', color: G.text }}>
            Boletim de Medição
          </h1>
          <p style={{ margin: 0, fontSize: 13.5, color: G.muted }}>
            Cálculo do valor de faturamento por rota, a partir dos registros validados do mês.
          </p>
        </div>
        <Selo num={linhas.length || '—'} label="Rotas" />
      </div>

      {/* Filtros */}
      <div style={{ ...gCard, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={gLabel}>Contrato</label>
          <PillDD
            label={contratos.find(c => String(c.id) === contratoId)?.nome || 'Selecione...'}
            open={ddAberto === 'contrato'}
            onToggle={() => setDdAberto(ddAberto === 'contrato' ? '' : 'contrato')}
            onBlur={fecharDD}
            options={contratos.map(c => ({ value: String(c.id), label: c.nome, active: String(c.id) === contratoId }))}
            onSelect={v => { setContratoId(v); setDdAberto(''); }}
            minWidth={220}
          />
        </div>
        <div>
          <label style={gLabel}>Mês</label>
          <PillDD
            label={mes ? formatarMes(mes) : 'Selecione...'}
            open={ddAberto === 'mes'}
            onToggle={() => setDdAberto(ddAberto === 'mes' ? '' : 'mes')}
            onBlur={fecharDD}
            options={mesesDisponiveis.map(m => ({ value: m, label: formatarMes(m), active: m === mes }))}
            onSelect={v => { setMes(v); setDdAberto(''); }}
            minWidth={160}
          />
        </div>
        {contratoId && mes && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={gLabel}>ISS %</label>
            <input type="number" min="0" max="100" step="0.5" value={issPercent}
              onChange={e => setIssPercent(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
              style={{ ...gInput, width: 70 }} />
          </div>
        )}
        {contratoId && mes && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button style={gBtnSec} onClick={carregar}>↻ Atualizar</button>
            {temAjustes && (
              <button
                style={{ ...gBtnSec, color: 'oklch(0.55 0.12 80)', borderColor: 'oklch(0.82 0.12 80)', fontSize: '0.78rem' }}
                onClick={() => setAjustes({})}
                title="Restaurar todas as quantidades para os valores automáticos"
              >
                ↺ Restaurar automático
              </button>
            )}
          </div>
        )}
      </div>

      {carregando && <p style={{ color: G.muted, fontSize: '0.875rem', padding: 24 }}>Carregando...</p>}

      {!carregando && contratoId && mes && linhas.length === 0 && (
        <div style={{ ...gCard, textAlign: 'center', color: G.muted, padding: '48px 24px', marginTop: 16 }}>
          Nenhum registro validado encontrado para este contrato e mês.
        </div>
      )}

      {!carregando && (!contratoId || !mes) && (
        <div style={{ ...gCard, textAlign: 'center', color: G.muted, padding: '48px 24px', marginTop: 16 }}>
          Selecione o contrato e o mês para exibir o boletim.
        </div>
      )}

      {!carregando && linhas.length > 0 && (
        <div ref={boletimRef}>
        <>
          {/* Cabeçalho */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: G.green, color: '#fff', borderRadius: '12px 12px 0 0', padding: '11px 16px', fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.02em', marginTop: 18 }}>
            <span>BOLETIM DE MEDIÇÃO — CONTRATO {contratoNome.toUpperCase()}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontWeight: 400, opacity: 0.85 }}>{formatarMes(mes).toUpperCase()}</span>
              <button data-pdf-hide style={{ ...btnPDF, background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)' }} onClick={() => exportPDF(boletimRef.current, `boletim-${mes}.pdf`, false)}>⬇ PDF</button>
            </div>
          </div>

          {/* Tabela principal */}
          <div style={{ overflowX: 'auto', border: `1px solid ${G.greenBorder}`, borderTop: 0, borderRadius: '0 0 12px 12px', marginBottom: 18 }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 900 }}>
              <thead>
                <tr>
                  <th style={th0} rowSpan={2}>ROTA</th>
                  <th style={{ ...th0, minWidth: 160 }} rowSpan={2}>TIPO</th>
                  <th style={th0} rowSpan={2}>VALOR FIXO</th>
                  <th style={{ ...th1, textAlign: 'center' }} colSpan={3}>TURNO NORMAL</th>
                  <th style={{ ...th0, textAlign: 'center' }} colSpan={3}>TURNO EXTRA</th>
                  <th style={{ ...th1, textAlign: 'center' }} colSpan={3}>KM EXTRA T. EXTRA</th>
                  <th style={th0} rowSpan={2}>VALOR BRUTO</th>
                  <th style={th0} rowSpan={2}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                      ISS
                      <input
                        type="number"
                        value={issPercent}
                        onChange={e => setIssPercent(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                        min={0} max={100} step={0.5}
                        style={{
                          width: 38, textAlign: 'center', fontSize: '0.72rem',
                          border: '1px solid rgba(255,255,255,0.4)', borderRadius: 3, padding: '1px 2px',
                          background: 'rgba(255,255,255,0.18)', color: '#fff', fontWeight: 700,
                        }}
                      />
                      %
                    </div>
                  </th>
                  <th style={th0} rowSpan={2}>VALOR LÍQUIDO</th>
                </tr>
                <tr>
                  <th style={th1}>VALOR</th><th style={th1}>QUANT</th><th style={th1}>$ TOTAL</th>
                  <th style={th0}>VALOR</th><th style={th0}>QUANT</th><th style={th0}>$ TOTAL</th>
                  <th style={th1}>VALOR</th><th style={th1}>QUANT</th><th style={th1}>$ TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l, i) => (
                  <tr key={l.rota_id} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                    <td style={td0}>{l.rotaNome}</td>
                    <td style={{ ...td0, padding: '3px 6px' }}>
                      <select
                        value={l.configAtual}
                        onChange={e => handleConfigChange(l.rota_id, e.target.value)}
                        disabled={salvandoConfig[l.rota_id]}
                        style={{
                          width: '100%', fontSize: '0.78rem', padding: '3px 6px',
                          border: l.semConfig ? '1px solid #fca5a5' : '1px solid #d1d5db',
                          borderRadius: 4, background: l.semConfig ? '#fef2f2' : '#fff',
                          color: l.semConfig ? '#dc2626' : '#111827',
                          fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        <option value="">— Selecione —</option>
                        {TIPOS_VEICULO.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td style={tdR}>{fmt(l.valorFixo)}</td>
                    <td style={tdR}>{fmt(l.tnValor)}</td>
                    <QuantCell value={l.tnQuant} autoValue={l.tnQuantAuto}
                      onChange={v => setAjuste(l.rota_id, 'tnQuant', v)}
                      onReset={() => resetAjuste(l.rota_id, 'tnQuant')} />
                    <td style={tdR}>{fmt(l.tnTotal)}</td>
                    <td style={tdR}>{fmt(l.teValor)}</td>
                    <QuantCell value={l.teQuant} autoValue={l.teQuantAuto}
                      onChange={v => setAjuste(l.rota_id, 'teQuant', v)}
                      onReset={() => resetAjuste(l.rota_id, 'teQuant')} />
                    <td style={tdR}>{fmt(l.teTotal)}</td>
                    <td style={tdR}>{fmt(l.kmExValor)}</td>
                    <QuantCell value={l.kmExtra} autoValue={l.kmExtraAuto}
                      onChange={v => setAjuste(l.rota_id, 'kmExtra', v)}
                      onReset={() => resetAjuste(l.rota_id, 'kmExtra')} />
                    <td style={tdR}>{fmt(l.kmExTotal)}</td>
                    <td style={{ ...tdR, fontWeight: 700 }}>{fmt(l.valorBruto)}</td>
                    <td style={tdR}>{fmt(l.iss)}</td>
                    <td style={{ ...tdR, fontWeight: 700, color: '#166534' }}>{fmt(l.valorLiquido)}</td>
                  </tr>
                ))}
                <tr>
                  <td style={tdTot} colSpan={2}>TOTAL GERAL</td>
                  <td style={tdTotR}>{fmt(tot.valorFixo)}</td>
                  <td style={tdTot}></td>
                  <td style={tdTotR}>{tot.tnQuant}</td>
                  <td style={tdTotR}>{fmt(tot.tnTotal)}</td>
                  <td style={tdTot}></td>
                  <td style={tdTotR}>{tot.teQuant}</td>
                  <td style={tdTotR}>{fmt(tot.teTotal)}</td>
                  <td style={tdTot}></td>
                  <td style={tdTotR}>{tot.kmExtra}</td>
                  <td style={tdTotR}>{fmt(tot.kmExTotal)}</td>
                  <td style={tdTotR}>{fmt(tot.valorBruto)}</td>
                  <td style={tdTotR}>{fmt(tot.iss)}</td>
                  <td style={{ ...tdTotR, color: '#166534' }}>{fmt(tot.valorLiquido)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Resumo */}
          <div style={{ maxWidth: 560 }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th style={th0}>ITEM</th>
                  <th style={th0}>VALOR BRUTO</th>
                  <th style={th0}>ISS {issPercent}%</th>
                  <th style={th0}>VALOR LÍQUIDO</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['ROTAS (fixo)',        brutoRotas,       issRotas,   brutoRotas  - issRotas],
                  ['EXTRAS (turnos + km)', brutoExtras,     issExtras,  brutoExtras - issExtras],
                  ['TOTAL',              tot.valorBruto,    tot.iss,    tot.valorLiquido],
                ].map(([label, bruto, iss, liq], i) => (
                  <tr key={i} style={{ background: i === 2 ? '#f0fdf4' : i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                    <td style={i === 2 ? tdTot : td0}>{label}</td>
                    <td style={i === 2 ? tdTotR : tdR}>{fmt(bruto)}</td>
                    <td style={i === 2 ? tdTotR : tdR}>{fmt(iss)}</td>
                    <td style={{ ...(i === 2 ? tdTotR : tdR), fontWeight: 700, color: '#166534' }}>{fmt(liq)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Barra bruto → líquido */}
          <div style={{ ...gCard, marginTop: 0 }}>
            <RotaMotif
              pct={tot.valorBruto > 0 ? (tot.valorLiquido / tot.valorBruto) * 100 : 0}
              color={G.green}
              labelLeft={`Bruto → Líquido (ISS ${issPercent}%)`}
              labelRight={`${Number(tot.valorLiquido).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de ${Number(tot.valorBruto).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            />
          </div>

          {linhas.some(l => l.semConfig) && (
            <p style={{ color: G.red, marginTop: 12, fontSize: '0.85rem', fontWeight: 600 }}>
              ⚠ Algumas rotas não têm tipo de veículo definido. Selecione o tipo na coluna TIPO acima.
            </p>
          )}
        </>
        </div>
      )}
    </div>
  );
}
