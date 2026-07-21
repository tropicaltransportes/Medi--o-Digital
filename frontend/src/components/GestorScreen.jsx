import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../supabase.js';
import { formatarMes, kmRodados } from '../storage.js';
import RegistrosTable from './RegistrosTable.jsx';
import RegrasScreen from './RegrasScreen.jsx';
import BoletimScreen from './BoletimScreen.jsx';
import CadastrosScreen from './CadastrosScreen.jsx';
import RelatoriosScreen from './RelatoriosScreen.jsx';
import { G, gCard, gLabel, gInput, gBtn, gBtnSec, gBtnGreen, PillDD, Selo, RotaMotif } from '../gestorUI.jsx';

const TURNOS = [
  { value: 'rota', label: 'ROTA' },
  { value: 'normal', label: 'Turno Normal' },
  { value: 'turno extra', label: 'Turno Extra' },
  { value: 'rodada interna', label: 'Rodada Interna' },
  { value: 'manutencao', label: 'Manutenção' },
];

const badge = {
  display: 'inline-block',
  background: G.accentSoft,
  color: G.accent,
  borderRadius: 20,
  padding: '2px 9px',
  fontSize: '0.75rem',
  fontWeight: 600,
};

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const modalBox = {
  background: G.surface, borderRadius: 16, padding: 28, width: '100%', maxWidth: 560,
  boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto',
  border: `1px solid ${G.border}`,
};
const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 };

export default function GestorScreen({ aba }) {
  const [registros, setRegistros] = useState([]);
  const [todasRotas, setTodasRotas] = useState([]);
  const [todosContratos, setTodosContratos] = useState([]);
  const [todosVeiculos, setTodosVeiculos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroContrato, setFiltroContrato] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroRota, setFiltroRota] = useState('');
  const [aberta, setAberta] = useState(null);
  const [rotasAbertas, setRotasAbertas] = useState(new Set());

  // Qual dropdown de filtro está aberto
  const [ddAberto, setDdAberto] = useState('');

  // Edição
  const [editandoRegistro, setEditandoRegistro] = useState(null);
  const [formEdit, setFormEdit] = useState({});
  const [salvandoEdit, setSalvandoEdit] = useState(false);

  useEffect(() => { carregarRegistros(); }, []);

  async function carregarRegistros() {
    setCarregando(true);
    setAberta(null);
    setRotasAbertas(new Set());
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

  function rotaDeRegistro(r) { return todasRotas.find(x => x.id === r.rota_id) || null; }
  function contratoDeRegistro(r) {
    const rota = rotaDeRegistro(r);
    if (!rota) return null;
    return todosContratos.find(x => x.id === rota.contrato_id) || null;
  }
  function contratoNome(r) { return contratoDeRegistro(r)?.nome || '—'; }
  function veiculoDeRegistro(r) { return todosVeiculos.find(x => x.id === r.veiculo_id) || null; }

  async function autoMarcarDomingos(folha) {
    const ids = folha.registros
      .filter(r => {
        if (r.domingo_feriado) return false;
        const d = new Date(r.data + 'T12:00:00');
        return d.getDay() === 0;
      })
      .map(r => r.id);
    if (!ids.length) return;
    await supabase.from('registros').update({ domingo_feriado: true }).in('id', ids);
    setRegistros(prev => prev.map(r => ids.includes(r.id) ? { ...r, domingo_feriado: true } : r));
  }

  async function handleValidar(r) {
    const novoValor = !r.validado;
    await supabase.from('registros').update({ validado: novoValor }).eq('id', r.id);
    setRegistros(prev => prev.map(x => x.id === r.id ? { ...x, validado: novoValor } : x));
  }

  async function handleDomingoFeriado(r, checked) {
    await supabase.from('registros').update({ domingo_feriado: checked }).eq('id', r.id);
    setRegistros(prev => prev.map(x => x.id === r.id ? { ...x, domingo_feriado: checked } : x));
  }

  function handleEditar(r) {
    setEditandoRegistro(r);
    setFormEdit({
      data:             r.data || '',
      horario_saida:    r.horario_saida?.slice(0, 5) || '',
      horario_chegada:  r.horario_chegada?.slice(0, 5) || '',
      km_inicial:       r.km_inicial ?? '',
      km_final:         r.km_final ?? '',
      tipo_turno:       r.tipo_turno || 'normal',
      finalidade:       r.finalidade || '',
      observacao:       r.observacao || '',
    });
  }

  async function salvarEdicao(e) {
    e.preventDefault();
    setSalvandoEdit(true);
    const payload = {
      data:            formEdit.data,
      horario_saida:   formEdit.horario_saida || null,
      horario_chegada: formEdit.horario_chegada || null,
      km_inicial:      formEdit.km_inicial !== '' ? Number(formEdit.km_inicial) : null,
      km_final:        formEdit.km_final   !== '' ? Number(formEdit.km_final)   : null,
      tipo_turno:      formEdit.tipo_turno,
      finalidade:      formEdit.finalidade  || null,
      observacao:      formEdit.observacao  || null,
    };
    await supabase.from('registros').update(payload).eq('id', editandoRegistro.id);
    setRegistros(prev => prev.map(x => x.id === editandoRegistro.id ? { ...x, ...payload } : x));
    setSalvandoEdit(false);
    setEditandoRegistro(null);
  }

  // ── Filtros / agrupamentos ───────────────────────────────────────────
  const contratos = useMemo(
    () => [...new Set(registros.map(r => contratoNome(r)).filter(c => c !== '—'))].sort(),
    [registros, todasRotas, todosContratos],
  );

  const meses = useMemo(
    () => [...new Set(registros.map(r => r.data?.slice(0, 7)).filter(Boolean))].sort((a, b) => b.localeCompare(a)),
    [registros],
  );

  const rotasDisponiveis = useMemo(() => {
    const ids = new Set(
      registros
        .filter(r => !filtroContrato || contratoNome(r) === filtroContrato)
        .filter(r => !filtroMes || r.data?.slice(0, 7) === filtroMes)
        .map(r => r.rota_id)
        .filter(Boolean),
    );
    return todasRotas.filter(r => ids.has(r.id)).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [registros, todasRotas, todosContratos, filtroContrato, filtroMes]);

  const folhas = useMemo(() => {
    const map = new Map();
    for (const r of registros) {
      if (filtroRota && r.rota_id !== Number(filtroRota)) continue;
      const contrato = contratoNome(r);
      const cliente  = contratoDeRegistro(r)?.cliente || '—';
      const mes      = r.data?.slice(0, 7) || 'sem-data';
      const chave    = `${contrato}__${mes}`;
      if (!map.has(chave)) map.set(chave, { contrato, cliente, mes, registros: [] });
      map.get(chave).registros.push(r);
    }
    return Array.from(map.values())
      .filter(f =>
        (!filtroContrato || f.contrato === filtroContrato) &&
        (!filtroMes      || f.mes      === filtroMes),
      )
      .sort((a, b) => b.mes.localeCompare(a.mes));
  }, [registros, todasRotas, todosContratos, filtroContrato, filtroMes, filtroRota]);

  function rotasDaFolha(folha) {
    const map = new Map();
    for (const r of folha.registros) {
      const id = r.rota_id ?? 'sem-rota';
      if (!map.has(id)) {
        map.set(id, { rota: todasRotas.find(x => x.id === r.rota_id) || null, regs: [] });
      }
      map.get(id).regs.push(r);
    }
    return Array.from(map.values()).sort((a, b) => (a.rota?.nome || '').localeCompare(b.rota?.nome || ''));
  }

  function totalKm(folha) { return folha.registros.reduce((acc, r) => acc + kmRodados(r), 0); }
  function validadoCount(folha) { return folha.registros.filter(r => r.validado).length; }
  function completoCount(folha) { return folha.registros.filter(r => r.status === 'completo').length; }

  function exportar(folha) {
    const dados = [...folha.registros]
      .sort((a, b) => `${a.data}${a.horario_saida}`.localeCompare(`${b.data}${b.horario_saida}`))
      .map(r => {
        const rota    = rotaDeRegistro(r);
        const veiculo = veiculoDeRegistro(r);
        return {
          Contrato:       contratoNome(r),
          Rota:           rota?.nome || '—',
          Veículo:        veiculo ? `${veiculo.placa} — ${veiculo.descricao}` : '—',
          'Troca Veículo': r.troca_veiculo || '',
          'Motivo Troca': r.motivo_troca  || '',
          Data:           r.data,
          Saída:          r.horario_saida?.slice(0, 5) ?? '',
          Chegada:        r.horario_chegada?.slice(0, 5) ?? '',
          'KM Inicial':   r.km_inicial,
          'KM Final':     r.km_final,
          'KM Rodados':   kmRodados(r),
          Turno:          r.tipo_turno === 'rota' ? 'ROTA' : r.tipo_turno === 'turno extra' ? 'Turno Extra' : r.tipo_turno === 'rodada interna' ? 'Rodada Interna' : r.tipo_turno === 'manutencao' ? 'Manutenção' : 'Turno Normal',
          'Dom/Feriado':  r.domingo_feriado ? 'Sim' : '',
          Validado:       r.validado ? 'Sim' : '',
          Status:         r.status === 'rascunho' ? 'Rascunho' : 'Completo',
          Finalidade:     r.finalidade || '',
          Observações:    r.observacao  || '',
        };
      });

    const ws = XLSX.utils.json_to_sheet(dados);
    ws['!cols'] = [
      { wch: 18 }, { wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 20 },
      { wch: 12 }, { wch: 8  }, { wch: 8  }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 24 }, { wch: 32 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Registros');
    const nome = `folha-${folha.contrato}-${folha.mes}.xlsx`.replace(/\s+/g, '-').toLowerCase();
    XLSX.writeFile(wb, nome);
  }

  function fecharDD() { setTimeout(() => setDdAberto(''), 150); }

  return (
    <div>

      {aba === 1 && <RegrasScreen />}
      {aba === 2 && <BoletimScreen />}
      {aba === 3 && <RelatoriosScreen />}
      {aba === 4 && <CadastrosScreen />}

      {aba === 0 && (
        <div style={{ maxWidth: 1220 }}>

          {/* Header + Selo */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, marginBottom: 22 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 22, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.01em', color: G.text }}>
                Folhas de Medição
              </h1>
              <p style={{ margin: 0, fontSize: 13.5, color: G.muted }}>
                Registros preenchidos pelos motoristas, agrupados por contrato e mês.
              </p>
            </div>
            <Selo num={carregando ? '…' : folhas.length} label="Folhas" />
          </div>

          {/* Filtros com PillDD */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
            <PillDD
              label={filtroContrato || 'Todos os contratos'}
              open={ddAberto === 'contrato'}
              onToggle={() => setDdAberto(ddAberto === 'contrato' ? '' : 'contrato')}
              onBlur={fecharDD}
              options={[
                { value: '', label: 'Todos os contratos', active: filtroContrato === '' },
                ...contratos.map(c => ({ value: c, label: c, active: filtroContrato === c })),
              ]}
              onSelect={v => { setFiltroContrato(v); setDdAberto(''); }}
            />
            <PillDD
              label={filtroMes ? formatarMes(filtroMes) : 'Todos os meses'}
              open={ddAberto === 'mes'}
              onToggle={() => setDdAberto(ddAberto === 'mes' ? '' : 'mes')}
              onBlur={fecharDD}
              options={[
                { value: '', label: 'Todos os meses', active: filtroMes === '' },
                ...meses.map(m => ({ value: m, label: formatarMes(m), active: filtroMes === m })),
              ]}
              onSelect={v => { setFiltroMes(v); setDdAberto(''); }}
            />
            <PillDD
              label={filtroRota ? (rotasDisponiveis.find(r => String(r.id) === filtroRota)?.nome || 'Rota') : 'Todas as rotas'}
              open={ddAberto === 'rota'}
              onToggle={() => setDdAberto(ddAberto === 'rota' ? '' : 'rota')}
              onBlur={fecharDD}
              options={[
                { value: '', label: 'Todas as rotas', active: filtroRota === '' },
                ...rotasDisponiveis.map(r => ({ value: String(r.id), label: r.nome, active: filtroRota === String(r.id) })),
              ]}
              onSelect={v => { setFiltroRota(v); setDdAberto(''); }}
            />
            <button style={gBtnSec} onClick={carregarRegistros}>↻ Atualizar</button>
            <span style={{ color: G.muted, fontSize: 13, marginLeft: 'auto' }}>
              {carregando
                ? 'Carregando...'
                : `${folhas.length} folha${folhas.length !== 1 ? 's' : ''} encontrada${folhas.length !== 1 ? 's' : ''}`}
            </span>
          </div>

          {/* Estado vazio */}
          {!carregando && folhas.length === 0 && (
            <div style={{ ...gCard, textAlign: 'center', color: G.muted, padding: '48px 24px', marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, maxWidth: 280, margin: '0 auto 14px' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', border: `1.5px solid ${G.border}`, flexShrink: 0 }} />
                <div style={{ flex: 1, height: 4, borderRadius: 100, background: G.border }} />
                <span style={{ width: 7, height: 7, borderRadius: '50%', border: `1.5px solid ${G.border}`, flexShrink: 0 }} />
              </div>
              Nenhuma folha de medição encontrada.
              <br />
              <span style={{ fontSize: '0.8rem' }}>Os registros aparecem aqui conforme os motoristas preenchem o formulário.</span>
            </div>
          )}

          {/* Lista de folhas */}
          {folhas.map(folha => {
            const chave      = `${folha.contrato}__${folha.mes}`;
            const estaAberta = aberta === chave;
            const nVal       = validadoCount(folha);
            const nComp      = completoCount(folha);
            const validPct   = nComp > 0 ? (nVal / nComp) * 100 : 0;
            const valColor   = (nVal === nComp && nComp > 0) ? G.green : G.accent;

            return (
              <article key={chave} style={{ ...gCard, marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ margin: 0, fontFamily: 'Space Grotesk, sans-serif', fontSize: 16, fontWeight: 700, color: G.text }}>
                      {folha.contrato}
                    </h3>
                    <p style={{ margin: '4px 0 8px', fontSize: 12.5, color: G.muted }}>
                      {formatarMes(folha.mes)} · Cliente: {folha.cliente}
                    </p>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span style={badge}>{folha.registros.length} registro{folha.registros.length !== 1 ? 's' : ''}</span>
                      <span style={badge}>{totalKm(folha).toLocaleString('pt-BR')} km rodados</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button style={gBtnSec} onClick={() => {
                      if (!estaAberta) autoMarcarDomingos(folha);
                      setAberta(estaAberta ? null : chave);
                    }}>
                      {estaAberta ? 'Fechar' : 'Ver registros'}
                    </button>
                    <button style={gBtnGreen} onClick={() => exportar(folha)}>
                      Exportar Excel
                    </button>
                  </div>
                </div>

                {/* Dashed divider + barra de validação */}
                <RotaMotif
                  pct={validPct}
                  color={valColor}
                  trailingText={`${nVal}/${nComp} validados`}
                />

                {/* Rotas expandidas */}
                {estaAberta && rotasDaFolha(folha).map(({ rota, regs }) => {
                  const kmRota   = regs.reduce((a, r) => a + kmRodados(r), 0);
                  const valRota  = regs.filter(r => r.validado).length;
                  const compRota = regs.filter(r => r.status === 'completo').length;
                  const rotaKey  = `${chave}__${rota?.id ?? 'sem-rota'}`;
                  const rotaOpen = rotasAbertas.has(rotaKey);
                  const toggleRota = () => setRotasAbertas(prev => {
                    const next = new Set(prev);
                    rotaOpen ? next.delete(rotaKey) : next.add(rotaKey);
                    return next;
                  });
                  return (
                    <div key={rotaKey} style={{ marginTop: 12 }}>
                      <button
                        onClick={toggleRota}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center',
                          justifyContent: 'space-between', cursor: 'pointer',
                          background: G.accentSoft, border: 'none',
                          padding: '9px 14px', borderRadius: 9,
                          textAlign: 'left',
                          outline: 'none',
                        }}
                      >
                        <span style={{ fontWeight: 700, fontSize: 13.5, color: G.accentDk, display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span style={{ fontSize: 10 }}>{rotaOpen ? '▼' : '▶'}</span>
                          {rota?.nome || 'Sem rota'}
                        </span>
                        <span style={{ fontSize: 12, color: G.muted }}>
                          {regs.length} registro{regs.length !== 1 ? 's' : ''} · {kmRota.toLocaleString('pt-BR')} km · {valRota}/{compRota} validados
                        </span>
                      </button>
                      {rotaOpen && (
                        <RegistrosTable
                          registros={regs}
                          todasRotas={todasRotas}
                          veiculos={todosVeiculos}
                          onValidar={handleValidar}
                          onEditar={handleEditar}
                          onDomingoFeriado={handleDomingoFeriado}
                        />
                      )}
                    </div>
                  );
                })}
              </article>
            );
          })}
        </div>
      )}

      {/* Modal de edição */}
      {editandoRegistro && (
        <div style={overlay} onClick={e => { if (e.target === e.currentTarget) setEditandoRegistro(null); }}>
          <div style={modalBox}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 700, color: G.text, fontFamily: 'Space Grotesk, sans-serif' }}>Editar Registro</h3>
            <form onSubmit={salvarEdicao}>
              <div style={grid2}>
                <div>
                  <label style={gLabel}>Data</label>
                  <input type="date" required value={formEdit.data}
                    onChange={e => setFormEdit(f => ({ ...f, data: e.target.value }))}
                    style={{ ...gInput, width: '100%' }} />
                </div>
                <div>
                  <label style={gLabel}>Tipo de Turno</label>
                  <select value={formEdit.tipo_turno}
                    onChange={e => setFormEdit(f => ({ ...f, tipo_turno: e.target.value }))}
                    style={{ ...gInput, width: '100%' }}>
                    {TURNOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={gLabel}>Horário Saída</label>
                  <input type="time" value={formEdit.horario_saida}
                    onChange={e => setFormEdit(f => ({ ...f, horario_saida: e.target.value }))}
                    style={{ ...gInput, width: '100%' }} />
                </div>
                <div>
                  <label style={gLabel}>Horário Chegada</label>
                  <input type="time" value={formEdit.horario_chegada}
                    onChange={e => setFormEdit(f => ({ ...f, horario_chegada: e.target.value }))}
                    style={{ ...gInput, width: '100%' }} />
                </div>
                <div>
                  <label style={gLabel}>KM Inicial</label>
                  <input type="number" min="0" value={formEdit.km_inicial}
                    onChange={e => setFormEdit(f => ({ ...f, km_inicial: e.target.value }))}
                    style={{ ...gInput, width: '100%' }} />
                </div>
                <div>
                  <label style={gLabel}>KM Final</label>
                  <input type="number" min="0" value={formEdit.km_final}
                    onChange={e => setFormEdit(f => ({ ...f, km_final: e.target.value }))}
                    style={{ ...gInput, width: '100%' }} />
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <label style={gLabel}>Finalidade</label>
                <input value={formEdit.finalidade}
                  onChange={e => setFormEdit(f => ({ ...f, finalidade: e.target.value }))}
                  style={{ ...gInput, width: '100%' }} placeholder="Ex: GARAGEM - BIG" />
              </div>
              <div style={{ marginTop: 14 }}>
                <label style={gLabel}>Observação</label>
                <input value={formEdit.observacao}
                  onChange={e => setFormEdit(f => ({ ...f, observacao: e.target.value }))}
                  style={{ ...gInput, width: '100%' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                <button type="button" style={gBtnSec} onClick={() => setEditandoRegistro(null)}>
                  Cancelar
                </button>
                <button type="submit" style={gBtn} disabled={salvandoEdit}>
                  {salvandoEdit ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
