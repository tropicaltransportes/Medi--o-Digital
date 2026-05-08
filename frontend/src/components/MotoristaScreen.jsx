import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase.js';
import { kmRodados, formatarMes } from '../storage.js';
import RegistrosTable from './RegistrosTable.jsx';
import { s } from '../styles.js';

const hoje = () => new Date().toISOString().slice(0, 10);
const agora = () => new Date().toTimeString().slice(0, 5);
const OFFLINE_KEY = 'medicao_offline_v1';

function lerOffline() {
  try { return JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]'); }
  catch { return []; }
}
function salvarOffline(items) {
  localStorage.setItem(OFFLINE_KEY, JSON.stringify(items));
}

const FORM_INICIAR = {
  contrato_id: '', rota_id: '', veiculo_id: '',
  data: hoje(), saida: '', km_inicial: '',
  turno: 'normal', finalidade: '',
};

const FORM_FINALIZAR = {
  chegada: '', km_final: '', observacoes: '',
  trocarVeiculo: false,
  veiculo_troca_id: '', troca_veiculo: '', motivo_troca: '',
};

export default function MotoristaScreen({ usuario }) {
  const [view, setView] = useState('lista');       // 'lista' | 'iniciar' | 'finalizar'
  const [rascunhoAtivo, setRascunhoAtivo] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [rotas, setRotas] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [pendentes, setPendentes] = useState(() => lerOffline());
  const [erro, setErro] = useState('');
  const [formI, setFormI] = useState(FORM_INICIAR);
  const [formF, setFormF] = useState(FORM_FINALIZAR);

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    const [{ data: cont }, { data: veic }, { data: regs }] = await Promise.all([
      supabase.from('contratos').select('id, nome').order('nome'),
      supabase.from('veiculos').select('id, placa, descricao').order('placa'),
      supabase
        .from('registros')
        .select('*, rotas(nome, contratos(nome, cliente)), veiculos(placa, descricao)')
        .eq('motorista_id', usuario.id)
        .order('data', { ascending: false })
        .order('criado_em', { ascending: false }),
    ]);
    if (cont) setContratos(cont);
    if (veic) setVeiculos(veic);
    if (regs) setRegistros(regs);
    setCarregando(false);
  }, [usuario.id]);

  const sincronizarPendentes = useCallback(async () => {
    const itens = lerOffline();
    if (!itens.length) return;
    setSincronizando(true);
    const restantes = [];
    for (const { _localId, ...dados } of itens) {
      const { error } = await supabase.from('registros').insert(dados);
      if (error) restantes.push({ _localId, ...dados });
    }
    salvarOffline(restantes);
    setPendentes(restantes);
    if (restantes.length < itens.length) await carregarDados();
    setSincronizando(false);
  }, [carregarDados]);

  useEffect(() => {
    carregarDados();
    const handleOnline = () => { setOnline(true); sincronizarPendentes(); };
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [carregarDados, sincronizarPendentes]);

  // Carrega rotas ao mudar contrato
  useEffect(() => {
    if (!formI.contrato_id) { setRotas([]); return; }
    supabase.from('rotas').select('id, nome')
      .eq('contrato_id', formI.contrato_id).eq('ativo', true).order('nome')
      .then(({ data }) => setRotas(data || []));
    setFormI(f => ({ ...f, rota_id: '' }));
  }, [formI.contrato_id]);

  // Auto-preenche KM inicial pelo último registro do veículo selecionado
  useEffect(() => {
    if (!formI.veiculo_id) return;
    supabase.from('registros').select('km_final')
      .eq('veiculo_id', formI.veiculo_id)
      .eq('status', 'completo')
      .not('km_final', 'is', null)
      .order('data', { ascending: false })
      .order('criado_em', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]?.km_final != null) {
          setFormI(f => ({ ...f, km_inicial: String(data[0].km_final) }));
        }
      });
  }, [formI.veiculo_id]);

  const rascunhos = registros.filter(r => r.status === 'rascunho');
  const historico = registros.filter(r => r.status !== 'rascunho');

  function ci(key) { return (e) => setFormI(f => ({ ...f, [key]: e.target.value })); }
  function cf(key) { return (e) => setFormF(f => ({ ...f, [key]: e.target.value })); }

  // ── INICIAR TRAJETO ──────────────────────────────────────────────────────────

  async function salvarRascunho(e) {
    e.preventDefault();
    setErro('');
    const dados = {
      motorista_id: usuario.id,
      nome: usuario.nome,
      rota_id: Number(formI.rota_id) || null,
      veiculo_id: Number(formI.veiculo_id) || null,
      data: formI.data,
      saida: formI.saida,
      km_inicial: Number(formI.km_inicial) || 0,
      turno: formI.turno,
      finalidade: formI.finalidade,
      status: 'rascunho',
    };

    setSalvando(true);
    if (!navigator.onLine) {
      const novo = { ...dados, _localId: `${Date.now()}-${Math.random()}` };
      const novos = [...lerOffline(), novo];
      salvarOffline(novos);
      setPendentes(novos);
    } else {
      const { error } = await supabase.from('registros').insert(dados);
      if (error) { setErro('Erro ao salvar. Tente novamente.'); setSalvando(false); return; }
      await carregarDados();
    }
    setSalvando(false);
    setView('lista');
    setFormI(f => ({ ...FORM_INICIAR, contrato_id: f.contrato_id, veiculo_id: f.veiculo_id, data: hoje() }));
  }

  // ── FINALIZAR TRAJETO ────────────────────────────────────────────────────────

  function abrirFinalizar(rascunho) {
    setRascunhoAtivo(rascunho);
    setFormF({ ...FORM_FINALIZAR, chegada: agora() });
    setErro('');
    setView('finalizar');
  }

  async function finalizarTrajeto(e) {
    e.preventDefault();
    setErro('');
    const kmi = Number(rascunhoAtivo.km_inicial);
    const kmf = Number(formF.km_final);
    if (kmf < kmi) { setErro('KM Final deve ser maior ou igual ao KM Inicial.'); return; }

    const atualizacao = {
      chegada: formF.chegada,
      km_final: kmf,
      observacoes: formF.observacoes,
      status: 'completo',
      ...(formF.trocarVeiculo && {
        veiculo_troca_id: Number(formF.veiculo_troca_id) || null,
        troca_veiculo: formF.troca_veiculo,
        motivo_troca: formF.motivo_troca,
      }),
    };

    setSalvando(true);
    const { error } = await supabase.from('registros').update(atualizacao).eq('id', rascunhoAtivo.id);
    if (error) { setErro('Erro ao finalizar. Tente novamente.'); console.error(error); }
    else { await carregarDados(); setView('lista'); setRascunhoAtivo(null); }
    setSalvando(false);
  }

  // ── VIEWS ────────────────────────────────────────────────────────────────────

  if (view === 'iniciar') {
    return (
      <div style={s.layout}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <button style={s.btnSecondary} onClick={() => setView('lista')}>← Voltar</button>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Iniciar trajeto</h2>
        </div>

        <section style={s.card}>
          <form onSubmit={salvarRascunho}>
            <div style={s.formGrid}>
              <div>
                <label style={s.label}>Contrato</label>
                <select required value={formI.contrato_id} onChange={ci('contrato_id')} style={s.input}>
                  <option value="">Selecione...</option>
                  {contratos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Rota</label>
                <select required value={formI.rota_id} onChange={ci('rota_id')} style={s.input} disabled={!formI.contrato_id}>
                  <option value="">{formI.contrato_id ? 'Selecione...' : 'Selecione o contrato primeiro'}</option>
                  {rotas.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Veículo</label>
                <select required value={formI.veiculo_id} onChange={ci('veiculo_id')} style={s.input}>
                  <option value="">Selecione...</option>
                  {veiculos.map(v => <option key={v.id} value={v.id}>{v.placa} — {v.descricao}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Data</label>
                <input required type="date" value={formI.data} onChange={ci('data')} style={s.input} />
              </div>
              <div>
                <label style={s.label}>Horário de saída</label>
                <input required type="time" value={formI.saida} onChange={ci('saida')} style={s.input} />
              </div>
              <div>
                <label style={s.label}>KM Inicial</label>
                <input required type="number" min="0" value={formI.km_inicial} onChange={ci('km_inicial')} style={s.input} placeholder="Auto-preenchido pelo veículo" />
              </div>
              <div>
                <label style={s.label}>Turno</label>
                <select value={formI.turno} onChange={ci('turno')} style={s.input}>
                  <option value="normal">Normal</option>
                  <option value="turno extra">Turno extra</option>
                </select>
              </div>
              <div>
                <label style={s.label}>Finalidade</label>
                <input value={formI.finalidade} onChange={ci('finalidade')} style={s.input} placeholder="Ex: entrega de materiais" />
              </div>
            </div>

            {erro && <p style={s.errorText}>{erro}</p>}

            {!online && (
              <p style={{ ...s.subtitle, marginTop: 10, color: '#b45309' }}>
                Sem conexão — o rascunho será salvo localmente e sincronizado ao reconectar.
              </p>
            )}

            <button style={{ ...s.btn, marginTop: 16, opacity: salvando ? 0.7 : 1 }} type="submit" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar rascunho'}
            </button>
          </form>
        </section>
      </div>
    );
  }

  if (view === 'finalizar' && rascunhoAtivo) {
    const veiculo = rascunhoAtivo.veiculos;
    return (
      <div style={s.layout}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <button style={s.btnSecondary} onClick={() => setView('lista')}>← Voltar</button>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Finalizar trajeto</h2>
        </div>

        {/* Resumo do rascunho */}
        <section style={{ ...s.card, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {[
              ['Rota', rascunhoAtivo.rotas?.nome || '—'],
              ['Veículo', veiculo ? `${veiculo.placa}` : '—'],
              ['Data', rascunhoAtivo.data],
              ['Saída', rascunhoAtivo.saida?.slice(0, 5)],
              ['KM Inicial', rascunhoAtivo.km_inicial],
              ['Turno', rascunhoAtivo.turno === 'turno extra' ? 'Extra' : 'Normal'],
            ].map(([label, val]) => (
              <div key={label}>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>{label}</p>
                <p style={{ margin: '2px 0 0', fontWeight: 600 }}>{val}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Formulário de finalização */}
        <section style={s.card}>
          <form onSubmit={finalizarTrajeto}>
            <div style={s.formGrid}>
              <div>
                <label style={s.label}>Horário de chegada</label>
                <input required type="time" value={formF.chegada} onChange={cf('chegada')} style={s.input} />
              </div>
              <div>
                <label style={s.label}>KM Final</label>
                <input required type="number" min={rascunhoAtivo.km_inicial} value={formF.km_final} onChange={cf('km_final')} style={s.input} placeholder={`Mín: ${rascunhoAtivo.km_inicial}`} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={s.label}>Observações</label>
                <textarea value={formF.observacoes} onChange={cf('observacoes')} style={{ ...s.input, resize: 'vertical' }} rows={2} placeholder="Opcional" />
              </div>
            </div>

            {/* Troca de veículo */}
            <div style={{ marginTop: 16, border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
              <button
                type="button"
                style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: formF.trocarVeiculo ? '#fefce8' : '#f9fafb', border: 0, cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onClick={() => setFormF(f => ({ ...f, trocarVeiculo: !f.trocarVeiculo }))}
              >
                <span>🔄 Houve troca de veículo?</span>
                <span style={{ color: '#6b7280' }}>{formF.trocarVeiculo ? '▲ Fechar' : '▼ Registrar troca'}</span>
              </button>

              {formF.trocarVeiculo && (
                <div style={{ padding: 16, borderTop: '1px solid #e5e7eb', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                  <div>
                    <label style={s.label}>Veículo substituto</label>
                    <select value={formF.veiculo_troca_id} onChange={cf('veiculo_troca_id')} style={s.input}>
                      <option value="">Selecione...</option>
                      {veiculos.filter(v => v.id !== Number(rascunhoAtivo.veiculo_id)).map(v => (
                        <option key={v.id} value={v.id}>{v.placa} — {v.descricao}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>Placa (se não listado)</label>
                    <input value={formF.troca_veiculo} onChange={cf('troca_veiculo')} style={s.input} placeholder="Ex: ABC1D23" />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={s.label}>Motivo da troca</label>
                    <input value={formF.motivo_troca} onChange={cf('motivo_troca')} style={s.input} placeholder="Ex: pane mecânica, acidente..." />
                  </div>
                </div>
              )}
            </div>

            {erro && <p style={s.errorText}>{erro}</p>}

            <button style={{ ...s.btn, marginTop: 16, opacity: salvando ? 0.7 : 1 }} type="submit" disabled={salvando}>
              {salvando ? 'Finalizando...' : 'Finalizar trajeto'}
            </button>
          </form>
        </section>
      </div>
    );
  }

  // ── LISTA ────────────────────────────────────────────────────────────────────

  return (
    <div style={s.layout}>
      {/* Barra de status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button style={{ ...s.btn, fontSize: '0.9rem' }} onClick={() => { setFormI({ ...FORM_INICIAR, data: hoje(), saida: agora() }); setErro(''); setView('iniciar'); }}>
          + Iniciar novo trajeto
        </button>

        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: online ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: online ? '#16a34a' : '#dc2626', display: 'inline-block' }} />
          {online ? 'Online' : 'Offline'}
        </span>

        {sincronizando && <span style={{ ...s.subtitle, fontSize: '0.8rem' }}>Sincronizando...</span>}

        {pendentes.length > 0 && (
          <span style={{ ...s.badge, background: '#fef3c7', color: '#92400e' }}>
            {pendentes.length} pendente{pendentes.length > 1 ? 's' : ''} de sincronização
          </span>
        )}
      </div>

      {/* Rascunhos ativos */}
      {(rascunhos.length > 0 || pendentes.length > 0) && (
        <section style={s.card}>
          <h2 style={s.h2}>Trajetos em andamento</h2>

          {/* Rascunhos offline (pendentes de sync) */}
          {pendentes.map((p) => (
            <div key={p._localId} style={{ border: '1px dashed #d97706', borderRadius: 8, padding: 12, marginBottom: 10, background: '#fffbeb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600 }}>Rascunho offline</p>
                  <p style={{ ...s.subtitle, margin: '2px 0 0' }}>Data: {p.data} · Saída: {p.saida} · KM ini: {p.km_inicial}</p>
                </div>
                <span style={{ ...s.badge, background: '#fef3c7', color: '#92400e' }}>Aguardando sync</span>
              </div>
            </div>
          ))}

          {/* Rascunhos no Supabase */}
          {rascunhos.map((r) => (
            <div key={r.id} style={{ border: '1px solid #bfdbfe', borderRadius: 8, padding: 12, marginBottom: 10, background: '#eff6ff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600 }}>{r.rotas?.nome || 'Rota não definida'}</p>
                  <p style={{ ...s.subtitle, margin: '2px 0 0' }}>
                    {r.veiculos?.placa} · Saída: {r.saida?.slice(0, 5)} · KM ini: {r.km_inicial}
                  </p>
                </div>
                <button style={{ ...s.btnGreen, whiteSpace: 'nowrap' }} onClick={() => abrirFinalizar(r)}>
                  Finalizar
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Histórico */}
      <section style={s.card}>
        <h2 style={s.h2}>
          Histórico
          {historico.length > 0 && <span style={{ ...s.badge, marginLeft: 8, verticalAlign: 'middle' }}>{historico.length}</span>}
        </h2>
        {carregando
          ? <p style={s.subtitle}>Carregando...</p>
          : <RegistrosTable registros={historico} />}
      </section>
    </div>
  );
}
