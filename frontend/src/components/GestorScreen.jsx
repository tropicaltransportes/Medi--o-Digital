import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../supabase.js';
import { formatarMes, kmRodados } from '../storage.js';
import RegistrosTable from './RegistrosTable.jsx';
import RegrasScreen from './RegrasScreen.jsx';
import BoletimScreen from './BoletimScreen.jsx';
import CadastrosScreen from './CadastrosScreen.jsx';
import RelatoriosScreen from './RelatoriosScreen.jsx';
import { s, C } from '../styles.js';

const ABAS = ['Folhas de Medição', 'Regras de Faturamento', 'Boletim', 'Relatórios', 'Cadastros'];

const TURNOS = [
  { value: 'rota', label: 'ROTA' },
  { value: 'normal', label: 'Turno Normal' },
  { value: 'turno extra', label: 'Turno Extra' },
  { value: 'rodada interna', label: 'Rodada Interna' },
  { value: 'manutencao', label: 'Manutenção' },
];

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const modalBox = {
  background: '#fff', borderRadius: 12, padding: 28, width: '100%', maxWidth: 560,
  boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto',
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

  // edição
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

  // Marca automaticamente como Dom/Feriado todos os registros cujo dia é domingo
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

  // ── Handlers de validação / dom-feriado / edição ─────────────────────
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

  // Rotas disponíveis para o filtro, limitadas ao contrato+mês selecionado
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

  // Sub-agrupamento por rota dentro de uma folha
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

  return (
    <div>

      {aba === 1 && <RegrasScreen />}
      {aba === 2 && <BoletimScreen />}
      {aba === 3 && <RelatoriosScreen />}
      {aba === 4 && <CadastrosScreen />}

      {aba === 0 && (
        <div>
          <div style={s.filterRow}>
            <select value={filtroContrato} onChange={e => setFiltroContrato(e.target.value)} style={s.filterInput}>
              <option value="">Todos os contratos</option>
              {contratos.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} style={s.filterInput}>
              <option value="">Todos os meses</option>
              {meses.map(m => <option key={m} value={m}>{formatarMes(m)}</option>)}
            </select>
            <select value={filtroRota} onChange={e => setFiltroRota(e.target.value)} style={s.filterInput}>
              <option value="">Todas as rotas</option>
              {rotasDisponiveis.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
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

          {folhas.map(folha => {
            const chave     = `${folha.contrato}__${folha.mes}`;
            const estaAberta = aberta === chave;
            const nVal       = validadoCount(folha);
            const nComp      = completoCount(folha);

            return (
              <article key={chave} style={s.sheet}>
                <div style={s.sheetHeader}>
                  <div>
                    <h3 style={s.sheetTitle}>{folha.contrato}</h3>
                    <p style={{ ...s.subtitle, margin: '4px 0 6px' }}>
                      {formatarMes(folha.mes)} · Cliente: {folha.cliente}
                    </p>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span style={s.badge}>{folha.registros.length} registro{folha.registros.length !== 1 ? 's' : ''}</span>
                      <span style={s.badge}>{totalKm(folha).toLocaleString('pt-BR')} km rodados</span>
                      <span style={{
                        ...s.badge,
                        background: nVal === nComp && nComp > 0 ? '#dcfce7' : '#fef9c3',
                        color:      nVal === nComp && nComp > 0 ? '#166534' : '#92400e',
                      }}>
                        {nVal}/{nComp} validados
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button style={s.btnSecondary} onClick={() => {
                      if (!estaAberta) autoMarcarDomingos(folha);
                      setAberta(estaAberta ? null : chave);
                    }}>
                      {estaAberta ? 'Fechar' : 'Ver registros'}
                    </button>
                    <button style={s.btnGreen} onClick={() => exportar(folha)}>
                      Exportar Excel
                    </button>
                  </div>
                </div>

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
                    <div key={rotaKey} style={{ marginTop: 10 }}>
                      <button
                        onClick={toggleRota}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center',
                          justifyContent: 'space-between', cursor: 'pointer',
                          background: C.accentSoft, border: 'none',
                          borderLeft: `3px solid ${C.accent}`,
                          padding: '7px 14px', borderRadius: '0 6px 6px 0',
                          textAlign: 'left',
                        }}
                      >
                        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: C.accentDark, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: '0.65rem', color: C.accent }}>{rotaOpen ? '▼' : '▶'}</span>
                          {rota?.nome || 'Sem rota'}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
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
            <h3 style={{ ...s.h2, marginBottom: 16 }}>Editar Registro</h3>
            <form onSubmit={salvarEdicao}>
              <div style={grid2}>
                <div>
                  <label style={s.label}>Data</label>
                  <input type="date" required value={formEdit.data}
                    onChange={e => setFormEdit(f => ({ ...f, data: e.target.value }))}
                    style={s.input} />
                </div>
                <div>
                  <label style={s.label}>Tipo de Turno</label>
                  <select value={formEdit.tipo_turno}
                    onChange={e => setFormEdit(f => ({ ...f, tipo_turno: e.target.value }))}
                    style={s.input}>
                    {TURNOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Horário Saída</label>
                  <input type="time" value={formEdit.horario_saida}
                    onChange={e => setFormEdit(f => ({ ...f, horario_saida: e.target.value }))}
                    style={s.input} />
                </div>
                <div>
                  <label style={s.label}>Horário Chegada</label>
                  <input type="time" value={formEdit.horario_chegada}
                    onChange={e => setFormEdit(f => ({ ...f, horario_chegada: e.target.value }))}
                    style={s.input} />
                </div>
                <div>
                  <label style={s.label}>KM Inicial</label>
                  <input type="number" min="0" value={formEdit.km_inicial}
                    onChange={e => setFormEdit(f => ({ ...f, km_inicial: e.target.value }))}
                    style={s.input} />
                </div>
                <div>
                  <label style={s.label}>KM Final</label>
                  <input type="number" min="0" value={formEdit.km_final}
                    onChange={e => setFormEdit(f => ({ ...f, km_final: e.target.value }))}
                    style={s.input} />
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <label style={s.label}>Finalidade</label>
                <input value={formEdit.finalidade}
                  onChange={e => setFormEdit(f => ({ ...f, finalidade: e.target.value }))}
                  style={{ ...s.input, width: '100%' }} placeholder="Ex: GARAGEM - BIG" />
              </div>
              <div style={{ marginTop: 14 }}>
                <label style={s.label}>Observação</label>
                <input value={formEdit.observacao}
                  onChange={e => setFormEdit(f => ({ ...f, observacao: e.target.value }))}
                  style={{ ...s.input, width: '100%' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                <button type="button" style={s.btnSecondary} onClick={() => setEditandoRegistro(null)}>
                  Cancelar
                </button>
                <button type="submit" style={s.btn} disabled={salvandoEdit}>
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
