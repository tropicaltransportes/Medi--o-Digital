import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase.js';
import { kmRodados } from '../storage.js';
import { cacheSave, cacheLoad, queuePush, queueGetAll, queueRemove } from '../db.js';
import RegistrosTable from './RegistrosTable.jsx';

// ── DARK THEME TOKENS ────────────────────────────────────────────────────────
const D = {
  bg:       'oklch(0.10 0.01 288)',
  screen:   'oklch(0.16 0.025 288)',
  card:     'oklch(0.19 0.028 288)',
  card2:    'oklch(0.215 0.03 288)',
  text:     'oklch(0.97 0.01 288)',
  textSec:  'oklch(0.66 0.02 288)',
  textTer:  'oklch(0.6 0.02 288)',
  accent:   'oklch(0.72 0.16 292)',
  accentDk: 'oklch(0.45 0.14 292)',
  green:    'oklch(0.74 0.14 152)',
  amber:    'oklch(0.78 0.14 80)',
  border:   'oklch(0.34 0.03 288 / 0.5)',
};

const dInput = {
  width: '100%', boxSizing: 'border-box',
  padding: '12px 13px', borderRadius: 12,
  background: D.card2, border: `1px solid ${D.border}`,
  color: D.text, fontSize: '0.9rem', outline: 'none',
  fontFamily: 'Manrope, sans-serif',
};
const dLabel = {
  display: 'block', fontSize: '0.78rem', fontWeight: 600,
  color: D.textSec, marginBottom: 6,
};

// ── CONSTANTS ────────────────────────────────────────────────────────────────
const hoje = () => new Date().toISOString().slice(0, 10);
const agora = () => new Date().toTimeString().slice(0, 5);

const MESES      = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MESES_LONG = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const DIAS_SEM   = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];

function formatDateLong() {
  const n = new Date();
  return `${DIAS_SEM[n.getDay()]}, ${n.getDate()} de ${MESES_LONG[n.getMonth()]}`;
}

const TURNO_CHIPS = [
  { value: 'rota',             label: 'Rota',            hue: 292 },
  { value: 'normal',           label: 'Normal',          hue: 230 },
  { value: 'turno extra',      label: 'Turno Extra',     hue: 80  },
  { value: 'rodada interna',   label: 'Rodada Interna',  hue: 200 },
  { value: 'manutencao',       label: 'Manutenção',      hue: 15  },
];

const TURNO_BADGE = {
  rota:             { bg: 'oklch(0.28 0.08 292)', color: 'oklch(0.82 0.12 292)', label: 'Rota'           },
  normal:           { bg: 'oklch(0.25 0.07 230)', color: 'oklch(0.78 0.10 230)', label: 'Normal'         },
  'turno extra':    { bg: 'oklch(0.28 0.08 80)',  color: 'oklch(0.82 0.12 80)',  label: 'Turno Extra'    },
  'rodada interna': { bg: 'oklch(0.25 0.07 200)', color: 'oklch(0.78 0.10 200)', label: 'Rodada Interna' },
  manutencao:       { bg: 'oklch(0.25 0.07 15)',  color: 'oklch(0.78 0.10 15)',  label: 'Manutenção'     },
};

// ── SUB-COMPONENTS ────────────────────────────────────────────────────────────

function GloboSVG() {
  return (
    <svg viewBox="0 0 180 180" width="240" height="240"
      style={{ position: 'absolute', right: -28, top: '50%', transform: 'translateY(-50%)', opacity: 0.38, pointerEvents: 'none', zIndex: 0 }}>
      <defs>
        <radialGradient id="globeBg" cx="38%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#b8aff8" stopOpacity="0.55"/>
          <stop offset="100%" stopColor="#3d2f8c" stopOpacity="0.05"/>
        </radialGradient>
        <clipPath id="globeClip">
          <circle cx="90" cy="90" r="78"/>
        </clipPath>
      </defs>

      {/* Sphere base */}
      <circle cx="90" cy="90" r="78" fill="url(#globeBg)" stroke="#a39aeb" strokeOpacity="0.3" strokeWidth="1"/>

      {/* Latitude lines */}
      <g clipPath="url(#globeClip)" stroke="#a39aeb" strokeOpacity="0.22" strokeWidth="0.7" fill="none">
        <ellipse cx="90" cy="90" rx="78" ry="22"/>
        <ellipse cx="90" cy="66" rx="68" ry="17"/>
        <ellipse cx="90" cy="114" rx="68" ry="17"/>
        <ellipse cx="90" cy="44" rx="48" ry="12"/>
        <ellipse cx="90" cy="136" rx="48" ry="12"/>
        <ellipse cx="90" cy="25"  rx="24" ry="6"/>
        <ellipse cx="90" cy="155" rx="24" ry="6"/>
      </g>

      {/* Longitude lines */}
      <g clipPath="url(#globeClip)" stroke="#a39aeb" strokeOpacity="0.22" strokeWidth="0.7" fill="none">
        <line x1="90" y1="12" x2="90" y2="168"/>
        <ellipse cx="90" cy="90" rx="24" ry="78"/>
        <ellipse cx="90" cy="90" rx="48" ry="78"/>
      </g>

      {/* Route arcs + dots */}
      <g clipPath="url(#globeClip)">
        <circle cx="112" cy="68" r="3" fill="#86efac" opacity="0.9"/>
        <circle cx="62"  cy="98" r="2.5" fill="#86efac" opacity="0.7"/>
        <circle cx="118" cy="108" r="2" fill="#a39aeb" opacity="0.8"/>
        <path d="M62,98 Q88,72 112,68" stroke="#86efac" strokeWidth="1.2" fill="none" strokeOpacity="0.65" strokeDasharray="4 3">
          <animate attributeName="stroke-dashoffset" values="0;-28" dur="3s" repeatCount="indefinite"/>
        </path>
        <path d="M112,68 Q120,90 118,108" stroke="#a39aeb" strokeWidth="1" fill="none" strokeOpacity="0.55" strokeDasharray="3 3">
          <animate attributeName="stroke-dashoffset" values="0;-24" dur="2.5s" repeatCount="indefinite"/>
        </path>
      </g>
    </svg>
  );
}

function HistoricoCards({ registros, todasRotas, veiculos }) {
  if (!registros.length) {
    return <p style={{ color: D.textSec, fontSize: '0.875rem', margin: 0 }}>Nenhum registro este mês.</p>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {registros.map(r => {
        const rota    = todasRotas.find(x => x.id === r.rota_id)?.nome || '—';
        const veiculo = veiculos.find(x => x.id === r.veiculo_id)?.placa || '—';
        const km      = kmRodados(r);
        const parts   = (r.data || '').split('-');
        const mesAbrev = MESES[parseInt(parts[1]) - 1] || '';
        const dia      = parseInt(parts[2]) || '';
        const badge    = TURNO_BADGE[r.tipo_turno] || TURNO_BADGE.normal;
        return (
          <div key={r.id} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 16, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
            {/* Date block */}
            <div style={{ width: 38, height: 38, borderRadius: 10, background: D.card2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 9, fontWeight: 600, color: D.textSec, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{mesAbrev}</span>
              <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: 15, color: D.text, lineHeight: 1.1 }}>{dia}</span>
            </div>
            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: D.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rota}</div>
              <div style={{ fontSize: '0.78rem', color: D.textSec, marginTop: 2 }}>
                {veiculo} · {r.horario_saida?.slice(0,5)} → {r.horario_chegada?.slice(0,5) || '...'}
              </div>
            </div>
            {/* KM + badge */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
              <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: 14, color: D.accent }}>{km} km</span>
              <span style={{ fontSize: 10, fontWeight: 600, borderRadius: 6, padding: '2px 7px', background: badge.bg, color: badge.color }}>{badge.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function VeiculoBusca({ veiculos, value, onChange, excluirId, required }) {
  const lista      = excluirId ? veiculos.filter(v => v.id !== Number(excluirId)) : veiculos;
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

  function selecionar(v) { onChange(v.id); setQuery(`${v.placa} — ${v.descricao}`); setAberto(false); }
  function handleInput(e) { setQuery(e.target.value); setAberto(true); if (!e.target.value) onChange(''); }

  return (
    <div style={{ position: 'relative' }}>
      <input
        required={required}
        value={query}
        onChange={handleInput}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
        placeholder="Placa ou nº de frota..."
        style={dInput}
        autoComplete="off"
      />
      <input type="hidden" value={value || ''} required={required} />
      {aberto && filtrados.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: D.card, border: `1px solid ${D.border}`, borderRadius: 10, boxShadow: '0 8px 24px oklch(0.05 0.01 288 / 0.6)', maxHeight: 220, overflowY: 'auto', marginTop: 4 }}>
          {filtrados.map(v => (
            <div key={v.id} onMouseDown={() => selecionar(v)}
              style={{ padding: '10px 13px', cursor: 'pointer', fontSize: '0.875rem', borderBottom: `1px solid ${D.border}`, color: D.text, background: v.id === Number(value) ? D.card2 : 'transparent' }}
              onMouseEnter={e => e.currentTarget.style.background = D.card2}
              onMouseLeave={e => e.currentTarget.style.background = v.id === Number(value) ? D.card2 : 'transparent'}
            >
              <span style={{ fontWeight: 600 }}>{v.placa}</span>
              {v.descricao && <span style={{ color: D.textSec, marginLeft: 8 }}>{v.descricao}</span>}
            </div>
          ))}
        </div>
      )}
      {aberto && query.trim() !== '' && filtrados.length === 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: D.card, border: `1px solid ${D.border}`, borderRadius: 10, padding: '10px 13px', fontSize: '0.85rem', color: D.textSec, marginTop: 4 }}>
          Nenhum veículo encontrado
        </div>
      )}
    </div>
  );
}

// ── FORM STATE ────────────────────────────────────────────────────────────────

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

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────

export default function MotoristaScreen({ usuario, onSair }) {
  const [view, setView] = useState('lista');
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
  const [kmAutoPreenchido, setKmAutoPreenchido] = useState(false);
  const [toast, setToast] = useState(null);

  // ── DATA LOADING ─────────────────────────────────────────────────────────

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      if (!navigator.onLine) {
        const [cont, veic, rots, regs] = await Promise.all([
          cacheLoad('contratos'),
          cacheLoad('veiculos'),
          cacheLoad('rotas'),
          cacheLoad(`registros-${usuario.id}`),
        ]);
        if (cont) setContratos(cont);
        if (veic) setVeiculos(veic);
        if (rots) setTodasRotas(rots);
        if (regs) setRegistros(regs);
        if (!regs) setErro('Sem conexão e sem cache local. Conecte-se ao menos uma vez para habilitar o uso offline.');
        setCarregando(false);
        return;
      }

      const [{ data: cont }, { data: veic }, { data: todasR }, { data: regs, error: regsErr }] = await Promise.all([
        supabase.from('contratos').select('id, nome').order('nome'),
        supabase.from('veiculos').select('id, placa, descricao').order('placa'),
        supabase.from('rotas').select('id, nome, contrato_id').order('nome'),
        supabase.from('registros')
          .select('*')
          .eq('motorista_id', usuario.id)
          .order('data', { ascending: false })
          .order('criado_em', { ascending: false }),
      ]);

      if (cont)   { setContratos(cont);   cacheSave('contratos', cont); }
      if (veic)   { setVeiculos(veic);    cacheSave('veiculos', veic); }
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

  // ── EFFECTS ───────────────────────────────────────────────────────────────

  useEffect(() => {
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
    carregarDados();
    const handleOnline  = () => { setOnline(true);  sincronizarPendentes(); };
    const handleOffline = () => setOnline(false);
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [carregarDados, sincronizarPendentes]);

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

  // ── KM AUTO-FILL ─────────────────────────────────────────────────────────

  const buscarKmInicial = useCallback(async (veiculoId) => {
    if (!veiculoId) return;
    if (!navigator.onLine) {
      const regsCache = await cacheLoad(`registros-${usuario.id}`);
      if (!regsCache) return;
      const ultimo = regsCache
        .filter(r => r.veiculo_id === Number(veiculoId) && r.status === 'completo' && !r.veiculo_troca_id && r.km_final != null)
        .sort((a, b) => `${b.data}${b.criado_em || ''}`.localeCompare(`${a.data}${a.criado_em || ''}`))
        [0];
      if (ultimo?.km_final != null) { setFormI(f => ({ ...f, km_inicial: String(ultimo.km_final) })); setKmAutoPreenchido(true); }
      return;
    }
    const { data } = await supabase.from('registros').select('km_final')
      .eq('veiculo_id', veiculoId).eq('status', 'completo')
      .is('veiculo_troca_id', null).not('km_final', 'is', null)
      .order('data', { ascending: false }).order('criado_em', { ascending: false }).limit(1);
    if (data?.[0]?.km_final != null) {
      setFormI(f => ({ ...f, km_inicial: String(data[0].km_final) }));
      setKmAutoPreenchido(true);
    }
  }, [usuario.id]);

  useEffect(() => { buscarKmInicial(formI.veiculo_id); }, [formI.veiculo_id, buscarKmInicial]);

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
      .eq('veiculo_id', vid).eq('status', 'completo')
      .is('veiculo_troca_id', null).not('km_final', 'is', null)
      .order('data', { ascending: false }).order('criado_em', { ascending: false }).limit(1)
      .then(({ data }) => {
        if (data?.[0]?.km_final != null) setFormF(f => ({ ...f, km_final: String(data[0].km_final) }));
      });
  }, [formF.veiculo_troca_id, usuario.id]);

  // ── DERIVED STATE ─────────────────────────────────────────────────────────

  const rascunhos = registros.filter(r => r.status === 'rascunho');
  const mesAtual  = hoje().slice(0, 7);
  const historico = registros.filter(r => r.status !== 'rascunho' && r.data?.startsWith(mesAtual));

  const pendentesInsertRascunho = pendentes.filter(p => p.type === 'insert' && p.status === 'rascunho');
  const bloqueado = rascunhos.length > 0 || pendentesInsertRascunho.length > 0;
  const trajetoAtivo = rascunhos[0] || pendentesInsertRascunho[0] || null;
  const trajetoAtivoIsOffline = !rascunhos[0] && pendentesInsertRascunho.length > 0;

  const sugestoes = useMemo(() => {
    if (!registros.length) return {};
    function maisFrequente(arr) {
      const counts = {};
      arr.filter(Boolean).forEach(v => { counts[v] = (counts[v] || 0) + 1; });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      return top ? top[0] : '';
    }
    const veiculo_id  = maisFrequente(registros.map(r => String(r.veiculo_id)));
    const rota_id     = maisFrequente(registros.map(r => String(r.rota_id)));
    const rota        = todasRotas.find(r => r.id === Number(rota_id));
    const contrato_id = rota ? String(rota.contrato_id) : '';
    return { veiculo_id, rota_id, contrato_id };
  }, [registros, todasRotas]);

  const resumoMes = useMemo(() => {
    const totalKm = historico.reduce((acc, r) => acc + kmRodados(r), 0);
    const dias    = new Set(historico.map(r => r.data).filter(Boolean)).size;
    return { viagens: historico.length, totalKm, dias };
  }, [historico]);

  // ── HELPERS ───────────────────────────────────────────────────────────────

  function rotaNome(rota_id) {
    return todasRotas.find(r => r.id === rota_id)?.nome || '—';
  }
  function veiculoPlaca(veiculo_id) {
    return veiculos.find(v => v.id === veiculo_id)?.placa || '—';
  }
  function ci(key) { return (e) => setFormI(f => ({ ...f, [key]: e.target.value })); }
  function cf(key) { return (e) => setFormF(f => ({ ...f, [key]: e.target.value })); }

  // ── ACTIONS ───────────────────────────────────────────────────────────────

  async function salvarRascunho(e) {
    e.preventDefault();
    setErro('');
    const dados = {
      motorista_id: usuario.id,
      uuid: crypto.randomUUID(),
      rota_id:       Number(formI.rota_id) || null,
      veiculo_id:    Number(formI.veiculo_id) || null,
      data:          formI.data,
      horario_saida: formI.horario_saida,
      km_inicial:    Number(formI.km_inicial) || 0,
      tipo_turno:    formI.tipo_turno,
      finalidade:    formI.finalidade,
      status:        'rascunho',
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
      km_final:        kmf,
      observacao:      formF.observacao,
      status:          'completo',
      ...(formF.trocarVeiculo && {
        veiculo_troca_id: Number(formF.veiculo_troca_id) || null,
        troca_veiculo:    formF.troca_veiculo,
        motivo_troca:     formF.motivo_troca,
      }),
    };

    setSalvando(true);
    if (!navigator.onLine) {
      await queuePush({ _localId: `upd-${Date.now()}-${Math.random()}`, type: 'update', recordId: rascunhoAtivo.id, data: atualizacao });
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
    else       { await carregarDados(); setView('lista'); setRascunhoAtivo(null); }
    setSalvando(false);
  }

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
      km_final:        kmf,
      observacao:      formF.observacao,
      status:          'completo',
      ...(formF.trocarVeiculo && {
        veiculo_troca_id: Number(formF.veiculo_troca_id) || null,
        troca_veiculo:    formF.troca_veiculo,
        motivo_troca:     formF.motivo_troca,
      }),
    };
    await queuePush(itemFinalizado);
    const novos = await queueGetAll();
    setPendentes(novos);
    setSalvando(false);
    setView('lista');
    setPendenteFinalizar(null);
  }

  // ── SHARED STYLES ─────────────────────────────────────────────────────────

  const primeiroNome = (usuario.nome || '').split(' ')[0];
  const initials = (usuario.nome || 'M').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const wrap = {
    maxWidth: 480,
    margin: '0 auto',
    minHeight: '100vh',
    background: D.screen,
  };

  const sectionHeader = {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '16px 16px 12px',
    position: 'sticky', top: 0, zIndex: 20,
    background: D.screen, borderBottom: `1px solid ${D.border}`,
  };

  const backBtn = {
    width: 34, height: 34, borderRadius: 11,
    background: D.card, border: `1px solid ${D.border}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: D.text, fontSize: '1rem',
    flexShrink: 0,
  };

  const stickyBtn = {
    position: 'sticky', bottom: 0, left: 0, right: 0,
    padding: '12px 16px 20px',
    background: D.screen, borderTop: `1px solid ${D.border}`,
    marginTop: 24,
  };

  const btnGreen = {
    width: '100%', background: D.green,
    color: 'oklch(0.15 0.05 152)', border: 'none',
    borderRadius: 14, padding: '14px 20px',
    fontFamily: 'Space Grotesk, sans-serif',
    fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
  };

  const btnViolet = {
    width: '100%', background: D.accent,
    color: 'oklch(0.10 0.02 292)', border: 'none',
    borderRadius: 14, padding: '14px 20px',
    fontFamily: 'Space Grotesk, sans-serif',
    fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
  };

  const fieldGap = { marginBottom: 16 };

  // ── VIEW: INICIAR ─────────────────────────────────────────────────────────

  if (view === 'iniciar') {
    return (
      <div style={wrap}>
        <div style={sectionHeader}>
          <button style={backBtn} onClick={() => setView('lista')}>←</button>
          <h2 style={{ margin: 0, fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.05rem', fontWeight: 600, color: D.text }}>
            Novo trajeto
          </h2>
        </div>

        <form onSubmit={salvarRascunho}>
          <div style={{ padding: '20px 16px 0' }}>

            <div style={fieldGap}>
              <label style={dLabel}>Contrato</label>
              <select required value={formI.contrato_id} onChange={ci('contrato_id')} style={{ ...dInput, appearance: 'none', cursor: 'pointer' }}>
                <option value="">Selecione...</option>
                {contratos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>

            <div style={fieldGap}>
              <label style={dLabel}>Rota</label>
              <select required value={formI.rota_id} onChange={ci('rota_id')} style={{ ...dInput, appearance: 'none', cursor: 'pointer' }} disabled={!formI.contrato_id}>
                <option value="">{formI.contrato_id ? 'Selecione...' : 'Selecione o contrato primeiro'}</option>
                {rotas.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
              </select>
            </div>

            <div style={fieldGap}>
              <label style={dLabel}>Veículo</label>
              <VeiculoBusca veiculos={veiculos} value={formI.veiculo_id} onChange={id => setFormI(f => ({ ...f, veiculo_id: id }))} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, ...fieldGap }}>
              <div>
                <label style={dLabel}>Data</label>
                <input required type="date" value={formI.data} onChange={ci('data')} style={dInput} />
              </div>
              <div>
                <label style={dLabel}>Saída</label>
                <input required type="time" value={formI.horario_saida} onChange={ci('horario_saida')} style={dInput} />
              </div>
            </div>

            <div style={fieldGap}>
              <label style={dLabel}>KM Inicial</label>
              <input required type="number" min="0" value={formI.km_inicial}
                onChange={e => { setKmAutoPreenchido(false); ci('km_inicial')(e); }}
                style={dInput} placeholder="Auto-preenchido pelo veículo" />
              {kmAutoPreenchido && formI.km_inicial && (
                <span style={{ fontSize: '0.72rem', color: D.green, marginTop: 5, display: 'block', fontWeight: 600 }}>
                  ↑ do último registro do veículo
                </span>
              )}
            </div>

            <div style={fieldGap}>
              <label style={dLabel}>Turno</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {TURNO_CHIPS.map(chip => {
                  const sel = formI.tipo_turno === chip.value;
                  return (
                    <button key={chip.value} type="button"
                      onClick={() => setFormI(f => ({ ...f, tipo_turno: chip.value }))}
                      style={{
                        borderRadius: 100, padding: '8px 16px',
                        fontSize: '0.82rem', fontWeight: 600,
                        border: sel ? 'none' : `1px solid ${D.border}`,
                        background: sel ? `oklch(0.42 0.14 ${chip.hue})` : D.card2,
                        color: sel ? `oklch(0.92 0.08 ${chip.hue})` : D.textSec,
                        cursor: 'pointer',
                      }}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {formI.tipo_turno !== 'manutencao' && (
              <div style={fieldGap}>
                <label style={dLabel}>Finalidade</label>
                <input value={formI.finalidade} onChange={ci('finalidade')} style={dInput} placeholder="Ex: entrega de materiais" />
              </div>
            )}

            {!online && (
              <p style={{ fontSize: '0.82rem', color: D.amber, marginTop: 0, marginBottom: 8 }}>
                Sem conexão — o rascunho será salvo localmente e sincronizado ao reconectar.
              </p>
            )}
            {erro && <p style={{ fontSize: '0.85rem', color: '#f87171', marginTop: 0 }}>{erro}</p>}
          </div>

          <div style={stickyBtn}>
            <button style={{ ...btnViolet, opacity: salvando ? 0.7 : 1 }} type="submit" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar rascunho'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── VIEW: FINALIZAR ────────────────────────────────────────────────────────

  if (view === 'finalizar' && rascunhoAtivo) {
    const turnoLabel = TURNO_CHIPS.find(c => c.value === rascunhoAtivo.tipo_turno)?.label || rascunhoAtivo.tipo_turno;
    return (
      <div style={wrap}>
        <div style={sectionHeader}>
          <button style={backBtn} onClick={() => setView('lista')}>←</button>
          <h2 style={{ margin: 0, fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.05rem', fontWeight: 600, color: D.text }}>
            Finalizar trajeto
          </h2>
        </div>

        {/* Resumo rascunho */}
        <div style={{ margin: '16px 16px 0', borderRadius: 16, padding: '16px', background: 'oklch(0.22 0.06 152 / 0.25)', border: '1px solid oklch(0.40 0.10 152 / 0.35)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              ['Rota', rotaNome(rascunhoAtivo.rota_id)],
              ['Veículo', veiculoPlaca(rascunhoAtivo.veiculo_id)],
              ['Saída', rascunhoAtivo.horario_saida?.slice(0, 5)],
              ['KM Inicial', rascunhoAtivo.km_inicial],
              ['Turno', turnoLabel],
              ['Data', rascunhoAtivo.data],
            ].map(([label, val]) => (
              <div key={label}>
                <p style={{ margin: 0, fontSize: '0.7rem', color: D.textSec, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
                <p style={{ margin: '3px 0 0', fontWeight: 600, fontSize: '0.88rem', color: D.text }}>{val}</p>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={finalizarTrajeto}>
          <div style={{ padding: '16px 16px 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, ...fieldGap }}>
              <div>
                <label style={dLabel}>Chegada</label>
                <input required type="time" value={formF.horario_chegada} onChange={cf('horario_chegada')} style={dInput} />
              </div>
              <div>
                <label style={dLabel}>KM Final</label>
                <input required type="number"
                  min={formF.trocarVeiculo ? 0 : rascunhoAtivo.km_inicial}
                  value={formF.km_final} onChange={cf('km_final')} style={dInput}
                  placeholder={formF.trocarVeiculo ? 'KM substituto' : `Mín: ${rascunhoAtivo.km_inicial}`} />
              </div>
            </div>

            <div style={fieldGap}>
              <label style={dLabel}>Observações</label>
              <textarea value={formF.observacao} onChange={cf('observacao')}
                style={{ ...dInput, resize: 'vertical', fontFamily: 'Manrope, sans-serif' }} rows={2} placeholder="Opcional" />
            </div>

            {/* Troca de veículo */}
            <div style={{ border: `1px solid ${D.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
              <button type="button"
                style={{ width: '100%', textAlign: 'left', padding: '12px 14px', background: formF.trocarVeiculo ? 'oklch(0.22 0.06 80 / 0.2)' : D.card2, border: 0, cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', color: D.text, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onClick={() => setFormF(f => ({ ...f, trocarVeiculo: !f.trocarVeiculo }))}>
                <span>🔄 Houve troca de veículo?</span>
                <span style={{ color: D.textSec, fontSize: '0.8rem' }}>{formF.trocarVeiculo ? '▲ Fechar' : '▼ Registrar troca'}</span>
              </button>
              {formF.trocarVeiculo && (
                <div style={{ padding: 14, borderTop: `1px solid ${D.border}`, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, background: D.card }}>
                  <div>
                    <label style={dLabel}>Veículo substituto</label>
                    <VeiculoBusca veiculos={veiculos} value={formF.veiculo_troca_id} onChange={id => setFormF(f => ({ ...f, veiculo_troca_id: id }))} excluirId={rascunhoAtivo.veiculo_id} />
                  </div>
                  <div>
                    <label style={dLabel}>Placa (se não listado)</label>
                    <input value={formF.troca_veiculo} onChange={cf('troca_veiculo')} style={dInput} placeholder="Ex: ABC1D23" />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={dLabel}>Motivo da troca</label>
                    <input value={formF.motivo_troca} onChange={cf('motivo_troca')} style={dInput} placeholder="Ex: pane mecânica..." />
                  </div>
                </div>
              )}
            </div>

            {erro && <p style={{ fontSize: '0.85rem', color: '#f87171', marginTop: 0 }}>{erro}</p>}
          </div>

          <div style={stickyBtn}>
            <button style={{ ...btnGreen, opacity: salvando ? 0.7 : 1 }} type="submit" disabled={salvando}>
              {salvando ? 'Finalizando...' : 'Finalizar trajeto'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── VIEW: FINALIZAR PENDENTE ───────────────────────────────────────────────

  if (view === 'finalizar-pendente' && pendenteFinalizar) {
    return (
      <div style={wrap}>
        <div style={sectionHeader}>
          <button style={backBtn} onClick={() => setView('lista')}>←</button>
          <h2 style={{ margin: 0, fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.05rem', fontWeight: 600, color: D.text }}>
            Finalizar trajeto offline
          </h2>
        </div>

        <div style={{ margin: '16px 16px 0', borderRadius: 16, padding: '16px', background: 'oklch(0.22 0.07 80 / 0.15)', border: `1px dashed oklch(0.78 0.14 80 / 0.5)` }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              ['Rota', rotaNome(pendenteFinalizar.rota_id)],
              ['Veículo', veiculoPlaca(pendenteFinalizar.veiculo_id)],
              ['Saída', pendenteFinalizar.horario_saida?.slice(0, 5)],
              ['KM Inicial', pendenteFinalizar.km_inicial],
              ['Data', pendenteFinalizar.data],
            ].map(([label, val]) => (
              <div key={label}>
                <p style={{ margin: 0, fontSize: '0.7rem', color: D.textSec, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
                <p style={{ margin: '3px 0 0', fontWeight: 600, fontSize: '0.88rem', color: D.text }}>{val}</p>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={finalizarPendente}>
          <div style={{ padding: '16px 16px 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, ...fieldGap }}>
              <div>
                <label style={dLabel}>Chegada</label>
                <input required type="time" value={formF.horario_chegada} onChange={cf('horario_chegada')} style={dInput} />
              </div>
              <div>
                <label style={dLabel}>KM Final</label>
                <input required type="number" min={formF.trocarVeiculo ? 0 : pendenteFinalizar.km_inicial}
                  value={formF.km_final} onChange={cf('km_final')} style={dInput} placeholder={`Mín: ${pendenteFinalizar.km_inicial}`} />
              </div>
            </div>

            <div style={fieldGap}>
              <label style={dLabel}>Observações</label>
              <textarea value={formF.observacao} onChange={cf('observacao')}
                style={{ ...dInput, resize: 'vertical', fontFamily: 'Manrope, sans-serif' }} rows={2} placeholder="Opcional" />
            </div>

            {erro && <p style={{ fontSize: '0.85rem', color: '#f87171', marginTop: 0 }}>{erro}</p>}
            <p style={{ fontSize: '0.8rem', color: D.amber, margin: '0 0 8px' }}>Offline — será sincronizado ao reconectar.</p>
          </div>

          <div style={stickyBtn}>
            <button style={{ ...btnGreen, opacity: salvando ? 0.7 : 1 }} type="submit" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Finalizar trajeto'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── VIEW: LISTA ────────────────────────────────────────────────────────────

  function iniciarNovo() {
    const novoForm = { ...FORM_INICIAR, ...sugestoes, data: hoje(), horario_saida: agora() };
    setFormI(novoForm);
    if (sugestoes.veiculo_id) buscarKmInicial(sugestoes.veiculo_id);
    setErro('');
    setView('iniciar');
  }

  return (
    <div style={wrap}>
      <div style={{ padding: '20px 16px 24px' }}>

        {/* ── GREETING ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: `linear-gradient(135deg, ${D.accent}, ${D.accentDk})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: '1rem', color: '#fff', flexShrink: 0 }}>
              {initials}
            </div>
            <div>
              <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, fontSize: 17, color: D.text }}>Olá, {primeiroNome}</div>
              <div style={{ fontSize: 12.5, color: D.textSec, marginTop: 1 }}>{formatDateLong()}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: D.card, borderRadius: 100, padding: '5px 10px' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: online ? D.green : '#ef4444', flexShrink: 0 }} />
              <span style={{ fontSize: 11.5, color: D.textSec, fontWeight: 500 }}>{online ? 'Online' : 'Offline'}</span>
            </div>
            {onSair && (
              <button onClick={onSair} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 8, padding: '6px 10px', color: D.textSec, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500 }}>
                Sair
              </button>
            )}
          </div>
        </div>

        {/* ── PENDING BANNER ── */}
        {pendentes.length > 0 && (
          <div style={{ borderRadius: 12, padding: '9px 14px', background: 'oklch(0.78 0.14 80 / 0.13)', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', color: D.amber, fontWeight: 600 }}>
              {sincronizando ? 'Sincronizando...' : `${pendentes.length} pendente${pendentes.length > 1 ? 's' : ''} de sincronização`}
            </span>
            {online && !sincronizando && (
              <button onClick={sincronizarPendentes} style={{ background: 'none', border: 'none', color: D.amber, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', padding: 0 }}>
                Sincronizar agora
              </button>
            )}
          </div>
        )}

        {/* ── ACTIVE TRIP CARD ── */}
        {trajetoAtivo ? (
          <div style={{ borderRadius: 22, padding: 20, background: 'linear-gradient(160deg, oklch(0.30 0.08 292) 0%, oklch(0.19 0.03 288) 65%)', border: '1px solid oklch(0.55 0.14 292 / 0.4)', boxShadow: '0 12px 32px oklch(0.15 0.02 288 / 0.5)', position: 'relative', overflow: 'hidden', marginBottom: 20 }}>
            {/* Glow */}
            <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: 'oklch(0.72 0.16 292 / 0.10)', filter: 'blur(32px)', pointerEvents: 'none' }} />
            {/* Globo decorativo */}
            <GloboSVG />

            {/* Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: D.green, flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', color: D.textSec, textTransform: 'uppercase', fontFamily: 'Space Grotesk' }}>
                {trajetoAtivoIsOffline ? 'TRAJETO OFFLINE EM ANDAMENTO' : 'TRAJETO EM ANDAMENTO'}
              </span>
            </div>

            {/* Route name */}
            <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: 20, color: D.text, marginBottom: 4 }}>
              {rotaNome(trajetoAtivo.rota_id)}
            </div>
            <div style={{ fontSize: 12.5, color: D.textSec, marginBottom: 16 }}>
              {trajetoAtivo.finalidade || (TURNO_CHIPS.find(c => c.value === trajetoAtivo.tipo_turno)?.label) || trajetoAtivo.tipo_turno}
            </div>

            {/* 3-column grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
              {[
                ['VEÍCULO',    veiculoPlaca(trajetoAtivo.veiculo_id)],
                ['SAÍDA',      trajetoAtivo.horario_saida?.slice(0,5) || '—'],
                ['KM INICIAL', trajetoAtivo.km_inicial],
              ].map(([label, val]) => (
                <div key={label}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: D.textTer, textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
                  <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, fontSize: 13.5, color: D.text }}>{val}</div>
                </div>
              ))}
            </div>

            {/* Finalizar button */}
            <button
              onClick={() => trajetoAtivoIsOffline ? abrirFinalizarPendente(trajetoAtivo) : abrirFinalizar(trajetoAtivo)}
              style={{ ...btnGreen, position: 'relative', zIndex: 1 }}>
              Finalizar trajeto
            </button>
          </div>
        ) : (
          /* ── CTA INICIAR ── */
          <button
            onClick={iniciarNovo}
            style={{ width: '100%', border: `1.5px dashed oklch(0.38 0.04 288 / 0.8)`, borderRadius: 16, background: 'transparent', padding: '18px 20px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${D.accent}, ${D.accentDk})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: '#fff', fontSize: 24, fontWeight: 300, lineHeight: 1, marginTop: -2 }}>+</span>
            </div>
            <div>
              <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, fontSize: 15, color: D.text }}>Iniciar novo trajeto</div>
              {(sugestoes.rota_id || sugestoes.veiculo_id) && (
                <div style={{ fontSize: 12, color: D.textSec, marginTop: 3 }}>
                  {sugestoes.rota_id ? rotaNome(Number(sugestoes.rota_id)) : ''}
                  {sugestoes.rota_id && sugestoes.veiculo_id ? ' · ' : ''}
                  {sugestoes.veiculo_id ? veiculoPlaca(Number(sugestoes.veiculo_id)) : ''}
                </div>
              )}
            </div>
          </button>
        )}

        {/* ── RESUMO DO MÊS ── */}
        {!carregando && historico.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
            {[
              { label: 'Viagens',    val: resumoMes.viagens },
              { label: 'KM rodados', val: resumoMes.totalKm },
              { label: 'Dias',       val: resumoMes.dias },
            ].map(({ label, val }) => (
              <div key={label} style={{ background: D.card, borderRadius: 14, padding: '12px 10px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: 16, color: 'oklch(0.82 0.1 292)', lineHeight: 1 }}>{val}</div>
                <div style={{ fontSize: 11, color: D.textSec, marginTop: 5, fontWeight: 500 }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── HISTÓRICO ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, fontSize: '0.9rem', color: D.text }}>
              Histórico — {MESES[new Date().getMonth()]}
            </span>
            {historico.length > 0 && (
              <span style={{ background: D.card2, color: D.textSec, borderRadius: 10, padding: '1px 7px', fontSize: '0.72rem', fontWeight: 600 }}>
                {historico.length}
              </span>
            )}
          </div>
          {carregando
            ? <p style={{ color: D.textSec, fontSize: '0.875rem', margin: 0 }}>Carregando...</p>
            : <HistoricoCards registros={historico} todasRotas={todasRotas} veiculos={veiculos} />}
          {erro && <p style={{ fontSize: '0.85rem', color: '#f87171', marginTop: 8 }}>{erro}</p>}
        </div>

      </div>

      {/* ── TOAST ── */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', background: '#166534', color: '#fff', padding: '11px 22px', borderRadius: 12, fontSize: '0.875rem', fontWeight: 700, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.25)', pointerEvents: 'none', animation: 'fadeInUp 0.25s ease' }}>
          {toast}
        </div>
      )}
    </div>
  );
}
