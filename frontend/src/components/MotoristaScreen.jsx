import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase.js';
import { kmRodados } from '../storage.js';
import { cacheSave, cacheLoad, queuePush, queueGetAll, queueRemove } from '../db.js';
import RegistrosTable from './RegistrosTable.jsx';
import { s, C } from '../styles.js';

const hoje = () => new Date().toISOString().slice(0, 10);
const agora = () => new Date().toTimeString().slice(0, 5);
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
function formatarData(iso) {
  if (!iso) return '—';
  const [, m, d] = iso.split('-');
  return `${parseInt(d)} ${MESES[parseInt(m)-1]}`;
}

function HistoricoCards({ registros, todasRotas, veiculos }) {
  if (!registros.length) return <p style={{ color: C.muted, fontSize: '0.875rem', margin: 0 }}>Nenhum registro este mês.</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {registros.map(r => {
        const rota = todasRotas.find(x => x.id === r.rota_id)?.nome || '—';
        const veiculo = veiculos.find(x => x.id === r.veiculo_id)?.placa || '—';
        const km = kmRodados(r);
        return (
          <div key={r.id} style={{
            background: r.validado ? '#f0fdf4' : C.surface,
            border: `1px solid ${r.validado ? '#86efac' : C.border}`,
            borderRadius: 12, padding: '12px 14px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: C.text }}>{rota}</span>
                <span style={{ color: C.muted, fontSize: '0.8rem', marginLeft: 8 }}>{veiculo}</span>
              </div>
              <span style={{ fontWeight: 800, fontSize: '1.15rem', color: C.accent, flexShrink: 0 }}>{km} km</span>
            </div>
            <div style={{ marginTop: 5, display: 'flex', gap: 10, fontSize: '0.82rem', color: '#374151', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600 }}>{formatarData(r.data)}</span>
              <span>{r.horario_saida?.slice(0,5)} → {r.horario_chegada?.slice(0,5) || '...'}</span>
            </div>
            {(r.finalidade || r.observacao) && (
              <p style={{ margin: '5px 0 0', fontSize: '0.78rem', color: C.muted }}>
                {[r.finalidade, r.observacao].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function VeiculoBusca({ veiculos, value, onChange, excluirId, required }) {
  const lista = excluirId ? veiculos.filter(v => v.id !== Number(excluirId)) : veiculos;
  const selecionado = lista.find(v => v.id === Number(value)) || null;

  const [query, setQuery] = useState('');
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    setQuery(selecionado ? `${selecionado.placa} — ${selecionado.descricao}` : '');
  }, [value, veiculos.length]);

  const filtrados = query.trim() === '' ? lista : lista.filter(v => {
    const q = query.toLowerCase();
    return v.placa.toLowerCase().includes(q) || (v.descricao || '').toLowerCase().includes(q);
  });

  function selecionar(v) {
    onChange(v.id);
    setQuery(`${v.placa} — ${v.descricao}`);
    setAberto(false);
  }

  function handleInput(e) {
    setQuery(e.target.value);
    setAberto(true);
    if (!e.target.value) onChange('');
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        required={required}
        value={query}
        onChange={handleInput}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
        placeholder="Placa ou nº de frota..."
        style={{ ...s.input, width: '100%' }}
        autoComplete="off"
      />
      {/* campo oculto para satisfazer required do form */}
      <input type="hidden" value={value || ''} required={required} />
      {aberto && filtrados.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: '#fff', border: '1px solid #d1d5db', borderRadius: 6,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: 220, overflowY: 'auto',
        }}>
          {filtrados.map(v => (
            <div
              key={v.id}
              onMouseDown={() => selecionar(v)}
              style={{
                padding: '8px 12px', cursor: 'pointer', fontSize: '0.875rem',
                borderBottom: '1px solid #f3f4f6',
                background: v.id === Number(value) ? '#eff6ff' : '#fff',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
              onMouseLeave={e => e.currentTarget.style.background = v.id === Number(value) ? '#eff6ff' : '#fff'}
            >
              <span style={{ fontWeight: 600 }}>{v.placa}</span>
              {v.descricao && <span style={{ color: '#6b7280', marginLeft: 8 }}>{v.descricao}</span>}
            </div>
          ))}
        </div>
      )}
      {aberto && query.trim() !== '' && filtrados.length === 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: '#fff', border: '1px solid #d1d5db', borderRadius: 6,
          padding: '10px 12px', fontSize: '0.85rem', color: '#6b7280',
        }}>
          Nenhum veículo encontrado
        </div>
      )}
    </div>
  );
}

const FORM_INICIAR = {
  contrato_id: '', rota_id: '', veiculo_id: '',
  data: hoje(), horario_saida: '', km_inicial: '',
  tipo_turno: 'rota', finalidade: '',
};

const FORM_FINALIZAR = {
  horario_chegada: '', km_final: '', observacao: '',
  trocarVeiculo: false,
  veiculo_troca_id: '', troca_veiculo: '', motivo_troca: '',
};

export default function MotoristaScreen({ usuario }) {
  const [view, setView] = useState('lista');       // 'lista' | 'iniciar' | 'finalizar'
  const [rascunhoAtivo, setRascunhoAtivo] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [rotas, setRotas] = useState([]);
  const [todasRotas, setTodasRotas] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [pendentes, setPendentes] = useState([]);
  const [pendenteFinalizar, setPendenteFinalizar] = useState(null);
  const [erro, setErro] = useState('');
  const [formI, setFormI] = useState(FORM_INICIAR);
  const [formF, setFormF] = useState(FORM_FINALIZAR);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  const [kmAutoPreenchido, setKmAutoPreenchido] = useState(false);
  const [toast, setToast] = useState(null);

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {

    if (!navigator.onLine) {
      const [cont, veic, rotas, regs] = await Promise.all([
        cacheLoad('contratos'),
        cacheLoad('veiculos'),
        cacheLoad('rotas'),
        cacheLoad(`registros-${usuario.id}`),
      ]);
      if (cont) setContratos(cont);
      if (veic) setVeiculos(veic);
      if (rotas) setTodasRotas(rotas);
      if (regs) setRegistros(regs);
      if (!regs) setErro('Sem conexão e sem cache local. Conecte-se ao menos uma vez para habilitar o uso offline.');
      setCarregando(false);
      return;
    }

    const [{ data: cont }, { data: veic }, { data: todasR }, { data: regs, error: regsErr }] = await Promise.all([
      supabase.from('contratos').select('id, nome').order('nome'),
      supabase.from('veiculos').select('id, placa, descricao').order('placa'),
      supabase.from('rotas').select('id, nome, contrato_id').order('nome'),
      supabase
        .from('registros')
        .select('*')
        .eq('motorista_id', usuario.id)
        .order('data', { ascending: false })
        .order('criado_em', { ascending: false }),
    ]);

    if (cont) { setContratos(cont); cacheSave('contratos', cont); }
    if (veic) { setVeiculos(veic); cacheSave('veiculos', veic); }
    if (todasR) { setTodasRotas(todasR); cacheSave('rotas', todasR); }
    if (regsErr) { console.error(regsErr); setErro('Erro ao carregar registros: ' + regsErr.message); }
    else if (regs) { setRegistros(regs); cacheSave(`registros-${usuario.id}`, regs); }

    } catch (e) {
      console.error('[carregarDados] erro inesperado:', e);
      setErro('Erro ao carregar dados. Verifique a conexão.');
    } finally {
      setCarregando(false);
    }
  }, [usuario.id]);

  const sincronizarPendentes = useCallback(async () => {
    const itens = await queueGetAll();
    if (!itens.length) return;
    setSincronizando(true);
    let algumSucesso = false;

    for (const item of itens) {
      if (item.type === 'update') {
        const { error } = await supabase.from('registros').update(item.data).eq('id', item.recordId);
        if (!error) { await queueRemove(item._localId); algumSucesso = true; }
      } else {
        const { _localId, type, ...dados } = item;
        const { error } = await supabase.from('registros').insert(dados);
        if (!error) { await queueRemove(item._localId); algumSucesso = true; }
      }
    }

    const restantes = await queueGetAll();
    const sincronizados = itens.length - restantes.length;
    setPendentes(restantes);
    if (algumSucesso) {
      await carregarDados();
      const n = sincronizados;
      setToast(`${n} registro${n > 1 ? 's' : ''} sincronizado${n > 1 ? 's' : ''} ✓`);
      setTimeout(() => setToast(null), 3500);
    }
    setSincronizando(false);
  }, [carregarDados]);

  useEffect(() => {
    // Migra fila antiga do localStorage para IndexedDB (apenas uma vez)
    const legacyKey = 'medicao_offline_v1';
    const legacyRaw = localStorage.getItem(legacyKey);
    if (legacyRaw) {
      try {
        const legacyItems = JSON.parse(legacyRaw);
        Promise.all(legacyItems.map(item => queuePush({ ...item, type: 'insert' })))
          .then(() => { localStorage.removeItem(legacyKey); return queueGetAll(); })
          .then(setPendentes);
      } catch {
        localStorage.removeItem(legacyKey);
        queueGetAll().then(setPendentes);
      }
    } else {
      queueGetAll().then(setPendentes);
    }
  }, []);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

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

  // Carrega rotas ao mudar contrato — usa todasRotas cacheadas quando offline
  useEffect(() => {
    if (!formI.contrato_id) { setRotas([]); return; }
    setFormI(f => ({ ...f, rota_id: '' }));
    if (!navigator.onLine) {
      setRotas(todasRotas.filter(r => String(r.contrato_id) === String(formI.contrato_id)));
      return;
    }
    supabase.from('rotas').select('id, nome')
      .eq('contrato_id', formI.contrato_id).order('nome')
      .then(({ data }) => setRotas(data || []));
  }, [formI.contrato_id, todasRotas]);

  const buscarKmInicial = useCallback(async (veiculoId) => {
    if (!veiculoId) return;
    if (!navigator.onLine) {
      // Usa registros cacheados localmente
      const regsCache = await cacheLoad(`registros-${usuario.id}`);
      if (!regsCache) return;
      const ultimo = regsCache
        .filter(r => r.veiculo_id === Number(veiculoId) && r.status === 'completo' && !r.veiculo_troca_id && r.km_final != null)
        .sort((a, b) => `${b.data}${b.criado_em || ''}`.localeCompare(`${a.data}${a.criado_em || ''}`))
        [0];
      if (ultimo?.km_final != null) {
        setFormI(f => ({ ...f, km_inicial: String(ultimo.km_final) }));
        setKmAutoPreenchido(true);
      }
      return;
    }
    const { data } = await supabase.from('registros').select('km_final')
      .eq('veiculo_id', veiculoId)
      .eq('status', 'completo')
      .is('veiculo_troca_id', null)
      .not('km_final', 'is', null)
      .order('data', { ascending: false })
      .order('criado_em', { ascending: false })
      .limit(1);
    if (data?.[0]?.km_final != null) {
      setFormI(f => ({ ...f, km_inicial: String(data[0].km_final) }));
      setKmAutoPreenchido(true);
    }
  }, [usuario.id]);

  // Auto-preenche KM inicial quando o veículo muda manualmente
  useEffect(() => {
    buscarKmInicial(formI.veiculo_id);
  }, [formI.veiculo_id, buscarKmInicial]);

  // Auto-preenche KM Final pelo último registro do veículo substituto
  useEffect(() => {
    if (!formF.veiculo_troca_id) return;
    const vid = Number(formF.veiculo_troca_id);
    if (!navigator.onLine) {
      cacheLoad(`registros-${usuario.id}`).then(regsCache => {
        if (!regsCache) return;
        const ultimo = regsCache
          .filter(r => r.veiculo_id === vid && r.status === 'completo' && !r.veiculo_troca_id && r.km_final != null)
          .sort((a, b) => `${b.data}${b.criado_em || ''}`.localeCompare(`${a.data}${a.criado_em || ''}`))
          [0];
        if (ultimo?.km_final != null) setFormF(f => ({ ...f, km_final: String(ultimo.km_final) }));
      });
      return;
    }
    supabase.from('registros').select('km_final')
      .eq('veiculo_id', vid)
      .eq('status', 'completo')
      .is('veiculo_troca_id', null)
      .not('km_final', 'is', null)
      .order('data', { ascending: false })
      .order('criado_em', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]?.km_final != null) {
          setFormF(f => ({ ...f, km_final: String(data[0].km_final) }));
        }
      });
  }, [formF.veiculo_troca_id, usuario.id]);

  const rascunhos = registros.filter(r => r.status === 'rascunho');
  const mesAtual = hoje().slice(0, 7);
  const historico = registros.filter(r => r.status !== 'rascunho' && r.data?.startsWith(mesAtual));

  // Sugestões automáticas baseadas no histórico do motorista
  const sugestoes = useMemo(() => {
    if (!registros.length) return {};
    function maisFrequente(arr) {
      const counts = {};
      arr.filter(Boolean).forEach(v => { counts[v] = (counts[v] || 0) + 1; });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      return top ? top[0] : '';
    }
    const veiculo_id = maisFrequente(registros.map(r => String(r.veiculo_id)));
    const rota_id    = maisFrequente(registros.map(r => String(r.rota_id)));
    const rota       = todasRotas.find(r => r.id === Number(rota_id));
    const contrato_id = rota ? String(rota.contrato_id) : '';
    return { veiculo_id, rota_id, contrato_id };
  }, [registros, todasRotas]);

  const finalidadesFrequentes = useMemo(() => {
    const counts = {};
    registros.forEach(r => {
      const f = r.finalidade?.trim();
      if (f) counts[f] = (counts[f] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([f]) => f);
  }, [registros]);

  const resumoMes = useMemo(() => {
    const totalKm = historico.reduce((acc, r) => acc + kmRodados(r), 0);
    const dias = new Set(historico.map(r => r.data).filter(Boolean)).size;
    return { viagens: historico.length, totalKm, dias };
  }, [historico]);

  function rotaNome(rota_id) {
    return todasRotas.find(r => r.id === rota_id)?.nome || '—';
  }
  function veiculoPlaca(veiculo_id) {
    return veiculos.find(v => v.id === veiculo_id)?.placa || '—';
  }

  function ci(key) { return (e) => setFormI(f => ({ ...f, [key]: e.target.value })); }
  function cf(key) { return (e) => setFormF(f => ({ ...f, [key]: e.target.value })); }

  // ── INICIAR TRAJETO ──────────────────────────────────────────────────────────

  async function salvarRascunho(e) {
    e.preventDefault();
    setErro('');
    const dados = {
      motorista_id: usuario.id,
      uuid: crypto.randomUUID(),
      rota_id: Number(formI.rota_id) || null,
      veiculo_id: Number(formI.veiculo_id) || null,
      data: formI.data,
      horario_saida: formI.horario_saida,
      km_inicial: Number(formI.km_inicial) || 0,
      tipo_turno: formI.tipo_turno,
      finalidade: formI.finalidade,
      status: 'rascunho',
    };

    setSalvando(true);
    if (!navigator.onLine) {
      const item = { ...dados, _localId: `ins-${Date.now()}-${Math.random()}`, type: 'insert' };
      await queuePush(item);
      const novos = await queueGetAll();
      setPendentes(novos);
    } else {
      const { error } = await supabase.from('registros').insert(dados);
      if (error) { setErro('Erro ao salvar. Tente novamente.'); console.error(error); setSalvando(false); return; }
      await carregarDados();
    }
    setSalvando(false);
    setView('lista');
    setFormI(f => ({ ...FORM_INICIAR, contrato_id: f.contrato_id, veiculo_id: f.veiculo_id, data: hoje() }));
  }

  // ── FINALIZAR TRAJETO ────────────────────────────────────────────────────────

  function abrirFinalizar(rascunho) {
    setRascunhoAtivo(rascunho);
    setFormF({ ...FORM_FINALIZAR, horario_chegada: agora() });
    setErro('');
    setView('finalizar');
  }

  async function finalizarTrajeto(e) {
    e.preventDefault();
    setErro('');
    const kmi = Number(rascunhoAtivo.km_inicial);
    const kmf = Number(formF.km_final);
    if (!formF.trocarVeiculo && kmf < kmi) { setErro('KM Final deve ser maior ou igual ao KM Inicial.'); return; }

    const atualizacao = {
      horario_chegada: formF.horario_chegada,
      km_final: kmf,
      observacao: formF.observacao,
      status: 'completo',
      ...(formF.trocarVeiculo && {
        veiculo_troca_id: Number(formF.veiculo_troca_id) || null,
        troca_veiculo: formF.troca_veiculo,
        motivo_troca: formF.motivo_troca,
      }),
    };

    setSalvando(true);

    if (!navigator.onLine) {
      await queuePush({
        _localId: `upd-${Date.now()}-${Math.random()}`,
        type: 'update',
        recordId: rascunhoAtivo.id,
        data: atualizacao,
      });
      // Atualiza cache local imediatamente para UI refletir a mudança
      const cached = await cacheLoad(`registros-${usuario.id}`) || [];
      const atualizado = cached.map(r => r.id === rascunhoAtivo.id ? { ...r, ...atualizacao } : r);
      await cacheSave(`registros-${usuario.id}`, atualizado);
      setRegistros(atualizado);
      const novos = await queueGetAll();
      setPendentes(novos);
      setSalvando(false);
      setView('lista');
      setRascunhoAtivo(null);
      return;
    }

    const { error } = await supabase.from('registros').update(atualizacao).eq('id', rascunhoAtivo.id);
    if (error) { setErro('Erro ao finalizar. Tente novamente.'); console.error(error); }
    else { await carregarDados(); setView('lista'); setRascunhoAtivo(null); }
    setSalvando(false);
  }

  // ── FINALIZAR PENDENTE OFFLINE ───────────────────────────────────────────────

  function abrirFinalizarPendente(p) {
    setPendenteFinalizar(p);
    setFormF({ ...FORM_FINALIZAR, horario_chegada: agora() });
    setErro('');
    setView('finalizar-pendente');
  }

  async function finalizarPendente(e) {
    e.preventDefault();
    setErro('');
    const kmi = Number(pendenteFinalizar.km_inicial);
    const kmf = Number(formF.km_final);
    if (!formF.trocarVeiculo && kmf < kmi) { setErro('KM Final deve ser maior ou igual ao KM Inicial.'); return; }

    setSalvando(true);
    const itemFinalizado = {
      ...pendenteFinalizar,
      horario_chegada: formF.horario_chegada,
      km_final: kmf,
      observacao: formF.observacao,
      status: 'completo',
      ...(formF.trocarVeiculo && {
        veiculo_troca_id: Number(formF.veiculo_troca_id) || null,
        troca_veiculo: formF.troca_veiculo,
        motivo_troca: formF.motivo_troca,
      }),
    };
    await queuePush(itemFinalizado); // put substitui o item com mesmo _localId
    const novos = await queueGetAll();
    setPendentes(novos);
    setSalvando(false);
    setView('lista');
    setPendenteFinalizar(null);
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
                <VeiculoBusca
                  veiculos={veiculos}
                  value={formI.veiculo_id}
                  onChange={id => setFormI(f => ({ ...f, veiculo_id: id }))}
                  required
                />
              </div>
              <div>
                <label style={s.label}>Data</label>
                <input required type="date" value={formI.data} onChange={ci('data')} style={s.input} />
              </div>
              <div>
                <label style={s.label}>Horário de saída</label>
                <input required type="time" value={formI.horario_saida} onChange={ci('horario_saida')} style={s.input} />
              </div>
              <div>
                <label style={s.label}>KM Inicial</label>
                <input required type="number" min="0" value={formI.km_inicial}
                  onChange={e => { setKmAutoPreenchido(false); ci('km_inicial')(e); }}
                  style={s.input} placeholder="Auto-preenchido pelo veículo" />
                {kmAutoPreenchido && formI.km_inicial && (
                  <span style={{ fontSize: '0.72rem', color: '#16a34a', marginTop: 3, display: 'block', fontWeight: 600 }}>
                    ↑ do último registro do veículo
                  </span>
                )}
              </div>
              <div>
                <label style={s.label}>Turno</label>
                <select value={formI.tipo_turno} onChange={ci('tipo_turno')} style={s.input}>
                  <option value="rota">ROTA</option>
                  <option value="normal">Turno Normal</option>
                  <option value="turno extra">Turno Extra</option>
                  <option value="rodada interna">Rodada Interna</option>
                  <option value="manutencao">Manutenção</option>
                </select>
              </div>
              {formI.tipo_turno !== 'manutencao' && (
                <div>
                  <label style={s.label}>Finalidade</label>
                  {finalidadesFrequentes.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                      {finalidadesFrequentes.map(f => (
                        <button key={f} type="button"
                          onClick={() => setFormI(fi => ({ ...fi, finalidade: fi.finalidade === f ? '' : f }))}
                          style={{
                            padding: '4px 12px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600,
                            cursor: 'pointer', border: '1.5px solid',
                            background: formI.finalidade === f ? C.accent : C.accentSoft,
                            color: formI.finalidade === f ? '#fff' : C.accentDark,
                            borderColor: formI.finalidade === f ? C.accent : C.border,
                          }}>
                          {f}
                        </button>
                      ))}
                    </div>
                  )}
                  <input value={formI.finalidade} onChange={ci('finalidade')} style={s.input} placeholder="Ex: entrega de materiais" />
                </div>
              )}
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
              ['Rota', rotaNome(rascunhoAtivo.rota_id)],
              ['Veículo', veiculoPlaca(rascunhoAtivo.veiculo_id)],
              ['Data', rascunhoAtivo.data],
              ['Saída', rascunhoAtivo.horario_saida?.slice(0, 5)],
              ['KM Inicial', rascunhoAtivo.km_inicial],
              ['Turno', rascunhoAtivo.tipo_turno === 'rota' ? 'ROTA' : rascunhoAtivo.tipo_turno === 'turno extra' ? 'Turno Extra' : rascunhoAtivo.tipo_turno === 'rodada interna' ? 'Rodada Interna' : 'Turno Normal'],
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
                <input required type="time" value={formF.horario_chegada} onChange={cf('horario_chegada')} style={s.input} />
              </div>
              <div>
                <label style={s.label}>KM Final</label>
                <input required type="number" min={formF.trocarVeiculo ? 0 : rascunhoAtivo.km_inicial} value={formF.km_final} onChange={cf('km_final')} style={s.input} placeholder={formF.trocarVeiculo ? 'KM do veículo substituto' : `Mín: ${rascunhoAtivo.km_inicial}`} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={s.label}>Observações</label>
                <textarea value={formF.observacao} onChange={cf('observacao')} style={{ ...s.input, resize: 'vertical' }} rows={2} placeholder="Opcional" />
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
                    <VeiculoBusca
                      veiculos={veiculos}
                      value={formF.veiculo_troca_id}
                      onChange={id => setFormF(f => ({ ...f, veiculo_troca_id: id }))}
                      excluirId={rascunhoAtivo.veiculo_id}
                    />
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

  if (view === 'finalizar-pendente' && pendenteFinalizar) {
    return (
      <div style={s.layout}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <button style={s.btnSecondary} onClick={() => setView('lista')}>← Voltar</button>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Finalizar trajeto offline</h2>
        </div>

        <section style={{ ...s.card, background: '#fffbeb', border: '1px dashed #d97706' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {[
              ['Rota', rotaNome(pendenteFinalizar.rota_id)],
              ['Veículo', veiculoPlaca(pendenteFinalizar.veiculo_id)],
              ['Data', pendenteFinalizar.data],
              ['Saída', pendenteFinalizar.horario_saida?.slice(0, 5)],
              ['KM Inicial', pendenteFinalizar.km_inicial],
            ].map(([label, val]) => (
              <div key={label}>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>{label}</p>
                <p style={{ margin: '2px 0 0', fontWeight: 600 }}>{val}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={s.card}>
          <form onSubmit={finalizarPendente}>
            <div style={s.formGrid}>
              <div>
                <label style={s.label}>Horário de chegada</label>
                <input required type="time" value={formF.horario_chegada} onChange={cf('horario_chegada')} style={s.input} />
              </div>
              <div>
                <label style={s.label}>KM Final</label>
                <input required type="number" min={formF.trocarVeiculo ? 0 : pendenteFinalizar.km_inicial} value={formF.km_final} onChange={cf('km_final')} style={s.input} placeholder={`Mín: ${pendenteFinalizar.km_inicial}`} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={s.label}>Observações</label>
                <textarea value={formF.observacao} onChange={cf('observacao')} style={{ ...s.input, resize: 'vertical' }} rows={2} placeholder="Opcional" />
              </div>
            </div>
            {erro && <p style={s.errorText}>{erro}</p>}
            <p style={{ margin: '12px 0 0', fontSize: '0.8rem', color: '#b45309' }}>
              Offline — será sincronizado ao reconectar.
            </p>
            <button style={{ ...s.btn, marginTop: 12, opacity: salvando ? 0.7 : 1 }} type="submit" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Finalizar trajeto'}
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
        {(() => {
          const pendentesRascunho = pendentes.filter(p => p.status === 'rascunho');
          const bloqueado = rascunhos.length > 0 || pendentesRascunho.length > 0;
          return (
        <button
          style={{ ...s.btn, fontSize: '0.9rem', opacity: bloqueado ? 0.45 : 1, cursor: bloqueado ? 'not-allowed' : 'pointer' }}
          disabled={bloqueado}
          title={bloqueado ? 'Finalize o trajeto em andamento antes de iniciar um novo' : ''}
          onClick={() => {
            const novoForm = { ...FORM_INICIAR, ...sugestoes, data: hoje(), horario_saida: agora() };
            setFormI(novoForm);
            if (sugestoes.veiculo_id) buscarKmInicial(sugestoes.veiculo_id);
            setErro('');
            setView('iniciar');
          }}
        >
          + Iniciar novo trajeto
        </button>
          );
        })()}
        {(rascunhos.length > 0 || pendentes.filter(p => p.status === 'rascunho').length > 0) && (
          <span style={{ fontSize: '0.8rem', color: '#b45309', fontWeight: 600 }}>
            ⚠ Finalize o trajeto em andamento antes de iniciar um novo
          </span>
        )}

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
          {pendentes.filter(p => p.type === 'insert').map((p) => (
            <div key={p._localId} style={{ border: `1px dashed ${p.status === 'completo' ? '#16a34a' : '#d97706'}`, borderRadius: 8, padding: 12, marginBottom: 10, background: p.status === 'completo' ? '#f0fdf4' : '#fffbeb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600 }}>{p.status === 'completo' ? 'Trajeto offline completo' : 'Rascunho offline'}</p>
                  <p style={{ ...s.subtitle, margin: '2px 0 0' }}>
                    {rotaNome(p.rota_id)} · {veiculoPlaca(p.veiculo_id)} · {p.data} · Saída: {p.horario_saida?.slice(0,5)} · KM ini: {p.km_inicial}
                    {p.status === 'completo' && p.km_final ? ` · KM fin: ${p.km_final}` : ''}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  {p.status === 'rascunho' && (
                    <button style={{ ...s.btnGreen, whiteSpace: 'nowrap' }} onClick={() => abrirFinalizarPendente(p)}>
                      Finalizar
                    </button>
                  )}
                  <span style={{ ...s.badge, background: p.status === 'completo' ? '#dcfce7' : '#fef3c7', color: p.status === 'completo' ? '#166534' : '#92400e', whiteSpace: 'nowrap' }}>
                    {p.status === 'completo' ? 'Sync pendente' : 'Aguardando sync'}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Rascunhos no Supabase */}
          {rascunhos.map((r) => (
            <div key={r.id} style={{ border: '1px solid #bfdbfe', borderRadius: 8, padding: 12, marginBottom: 10, background: '#eff6ff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600 }}>{rotaNome(r.rota_id)}</p>
                  <p style={{ ...s.subtitle, margin: '2px 0 0' }}>
                    {veiculoPlaca(r.veiculo_id)} · Saída: {r.horario_saida?.slice(0, 5)} · KM ini: {r.km_inicial}
                    {r.finalidade ? ` · ${r.finalidade}` : ''}
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

      {/* Resumo do mês */}
      {!carregando && historico.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { label: 'Viagens', val: resumoMes.viagens, icon: '🚍' },
            { label: 'KM rodados', val: `${resumoMes.totalKm} km`, icon: '📍' },
            { label: 'Dias', val: resumoMes.dias, icon: '📅' },
          ].map(({ label, val, icon }) => (
            <div key={label} style={{ ...s.card, margin: 0, textAlign: 'center', padding: '12px 8px' }}>
              <div style={{ fontSize: '1.3rem', marginBottom: 2 }}>{icon}</div>
              <div style={{ fontWeight: 800, fontSize: '1.15rem', color: C.accent }}>{val}</div>
              <div style={{ fontSize: '0.72rem', color: C.muted, fontWeight: 600, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Histórico */}
      <section style={s.card}>
        <h2 style={s.h2}>
          Histórico — {MESES[new Date().getMonth()]}
          {historico.length > 0 && <span style={{ ...s.badge, marginLeft: 8, verticalAlign: 'middle' }}>{historico.length}</span>}
        </h2>
        {carregando
          ? <p style={s.subtitle}>Carregando...</p>
          : isMobile
            ? <HistoricoCards registros={historico} todasRotas={todasRotas} veiculos={veiculos} />
            : <RegistrosTable registros={historico} todasRotas={todasRotas} veiculos={veiculos} semToggleColunas />}
      </section>

      {/* Toast de sync */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: '#166534', color: '#fff', padding: '11px 22px', borderRadius: 12,
          fontSize: '0.875rem', fontWeight: 700, zIndex: 9999,
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)', pointerEvents: 'none',
          animation: 'fadeInUp 0.25s ease',
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
