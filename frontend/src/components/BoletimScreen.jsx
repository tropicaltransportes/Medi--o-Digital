import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase.js';
import { kmRodados, formatarMes } from '../storage.js';
import { s } from '../styles.js';

const fmt = (n) => Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const th0 = { padding: '6px 10px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap', background: '#166534', color: '#fff', border: '1px solid #14532d', textAlign: 'center' };
const th1 = { ...th0, background: '#15803d' };
const td0 = { padding: '5px 8px', fontSize: '0.78rem', whiteSpace: 'nowrap', border: '1px solid #e5e7eb' };
const tdR = { ...td0, textAlign: 'right' };
const tdTot = { ...td0, fontWeight: 700, background: '#f0fdf4' };
const tdTotR = { ...tdTot, textAlign: 'right' };

export default function BoletimScreen() {
  const [contratos, setContratos] = useState([]);
  const [contratoId, setContratoId] = useState('');
  const [mes, setMes] = useState('');
  const [rotas, setRotas] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [regra, setRegra] = useState(null);
  const [valoresVeiculo, setValoresVeiculo] = useState([]);
  const [carregando, setCarregando] = useState(false);

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
    const cid = Number(contratoId);

    const [{ data: rotasData }, { data: veicData }, { data: regraData }] = await Promise.all([
      supabase.from('rotas').select('id, nome').eq('contrato_id', cid),
      supabase.from('veiculos').select('id, placa, descricao, configuracao'),
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
        .eq('status', 'completo');
      regsData = data || [];
    }

    setRotas(rotasData || []);
    setVeiculos(veicData || []);
    setRegistros(regsData);
    setRegra(regraData);
    setValoresVeiculo(regraData?.valores_veiculo || []);
    setCarregando(false);
  }

  const linhas = useMemo(() => {
    if (!registros.length) return [];
    const grupos = new Map();
    for (const r of registros) {
      const chave = `${r.rota_id}_${r.veiculo_id}`;
      if (!grupos.has(chave)) grupos.set(chave, { rota_id: r.rota_id, veiculo_id: r.veiculo_id, regs: [] });
      grupos.get(chave).regs.push(r);
    }

    return Array.from(grupos.values()).map(g => {
      const rota = rotas.find(x => x.id === g.rota_id);
      const veiculo = veiculos.find(x => x.id === g.veiculo_id);
      const billing = valoresVeiculo.find(v => v.configuracao === veiculo?.configuracao);

      const kmTotal = g.regs.reduce((acc, r) => acc + kmRodados(r), 0);
      const kmFranquia = regra?.km_franquia_mensal || 0;
      const kmExtra = Math.max(0, kmTotal - kmFranquia);

      const tnQuant = g.regs.filter(r => r.tipo_turno === 'normal').length;
      const teQuant = g.regs.filter(r => r.tipo_turno === 'turno extra').length;

      const valorFixo    = billing?.valor_mensal || 0;
      const tnValor      = billing?.valor_turno_normal || 0;
      const teValor      = billing?.valor_turno_extra || 0;
      const kmExValor    = billing?.valor_km_extra_turno_extra || 0;

      const tnTotal      = tnQuant * tnValor;
      const teTotal      = teQuant * teValor;
      const kmExTotal    = kmExtra * kmExValor;
      const valorBruto   = valorFixo + tnTotal + teTotal + kmExTotal;
      const iss          = valorBruto * 0.05;
      const valorLiquido = valorBruto - iss;

      return {
        rotaNome: rota?.nome || '—',
        tipo: veiculo?.configuracao || null,
        placa: veiculo?.placa || '—',
        semConfig: !veiculo?.configuracao || !billing,
        valorFixo, tnValor, tnQuant, tnTotal,
        teValor, teQuant, teTotal,
        kmExValor, kmExtra, kmExTotal,
        valorBruto, iss, valorLiquido,
      };
    }).sort((a, b) => a.rotaNome.localeCompare(b.rotaNome));
  }, [registros, rotas, veiculos, valoresVeiculo, regra]);

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

  const brutoRotas  = linhas.reduce((a, l) => a + l.valorFixo, 0);
  const brutoExtras = linhas.reduce((a, l) => a + l.tnTotal + l.teTotal + l.kmExTotal, 0);
  const contratoNome = contratos.find(c => c.id === Number(contratoId))?.nome || '';

  return (
    <div>
      {/* Filtros */}
      <section style={s.card}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={s.label}>Contrato</label>
            <select value={contratoId} onChange={e => setContratoId(e.target.value)} style={{ ...s.input, minWidth: 220 }}>
              <option value="">Selecione...</option>
              {contratos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>Mês</label>
            <select value={mes} onChange={e => setMes(e.target.value)} style={{ ...s.input, minWidth: 160 }}>
              <option value="">Selecione...</option>
              {mesesDisponiveis.map(m => <option key={m} value={m}>{formatarMes(m)}</option>)}
            </select>
          </div>
          {contratoId && mes && <button style={s.btnSecondary} onClick={carregar}>↻ Atualizar</button>}
        </div>
      </section>

      {carregando && <p style={{ ...s.subtitle, padding: 24 }}>Carregando...</p>}

      {!carregando && contratoId && mes && linhas.length === 0 && (
        <div style={{ ...s.card, textAlign: 'center', color: '#6b7280', padding: '48px 24px' }}>
          Nenhum registro completo encontrado para este contrato e mês.
        </div>
      )}

      {!carregando && linhas.length > 0 && (
        <>
          {/* Cabeçalho */}
          <div style={{ display: 'flex', justifyContent: 'space-between', background: '#166534', color: '#fff', borderRadius: '8px 8px 0 0', padding: '10px 16px', fontWeight: 700, fontSize: '1rem', marginTop: 8 }}>
            <span>BOLETIM DE MEDIÇÃO — CONTRATO {contratoNome.toUpperCase()}</span>
            <span>{formatarMes(mes).toUpperCase()}</span>
          </div>

          {/* Tabela principal */}
          <div style={{ overflowX: 'auto', border: '1px solid #14532d', borderTop: 0, borderRadius: '0 0 8px 8px', marginBottom: 24 }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 900 }}>
              <thead>
                <tr>
                  <th style={th0} rowSpan={2}>ROTA</th>
                  <th style={th0} rowSpan={2}>TIPO</th>
                  <th style={th0} rowSpan={2}>VALOR FIXO</th>
                  <th style={{ ...th1, textAlign: 'center' }} colSpan={3}>TURNO NORMAL</th>
                  <th style={{ ...th0, textAlign: 'center' }} colSpan={3}>TURNO EXTRA</th>
                  <th style={{ ...th1, textAlign: 'center' }} colSpan={3}>KM EXTRA T. EXTRA</th>
                  <th style={th0} rowSpan={2}>VALOR BRUTO</th>
                  <th style={th0} rowSpan={2}>ISS 5%</th>
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
                  <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                    <td style={td0}>{l.rotaNome}</td>
                    <td style={td0}>
                      {l.semConfig
                        ? <span style={{ color: '#dc2626', fontWeight: 600 }}>{l.tipo || 'SEM CONFIG'} ⚠</span>
                        : <span style={{ fontWeight: 600 }}>{l.tipo}</span>}
                    </td>
                    <td style={tdR}>{fmt(l.valorFixo)}</td>
                    <td style={tdR}>{fmt(l.tnValor)}</td>
                    <td style={{ ...tdR, fontWeight: l.tnQuant > 0 ? 700 : 400 }}>{l.tnQuant}</td>
                    <td style={tdR}>{fmt(l.tnTotal)}</td>
                    <td style={tdR}>{fmt(l.teValor)}</td>
                    <td style={{ ...tdR, fontWeight: l.teQuant > 0 ? 700 : 400 }}>{l.teQuant}</td>
                    <td style={tdR}>{fmt(l.teTotal)}</td>
                    <td style={tdR}>{fmt(l.kmExValor)}</td>
                    <td style={{ ...tdR, fontWeight: l.kmExtra > 0 ? 700 : 400 }}>{l.kmExtra}</td>
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
                  <th style={th0}>ISS 5%</th>
                  <th style={th0}>VALOR LÍQUIDO</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['ROTAS (fixo)', brutoRotas, brutoRotas * 0.05, brutoRotas * 0.95],
                  ['EXTRAS (turnos + km)', brutoExtras, brutoExtras * 0.05, brutoExtras * 0.95],
                  ['TOTAL', tot.valorBruto, tot.iss, tot.valorLiquido],
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

          {linhas.some(l => l.semConfig) && (
            <p style={{ color: '#dc2626', marginTop: 12, fontSize: '0.85rem', fontWeight: 600 }}>
              ⚠ Alguns veículos não têm configuração de faturamento definida. Configure em "Cadastros" → Veículos.
            </p>
          )}
        </>
      )}
    </div>
  );
}
