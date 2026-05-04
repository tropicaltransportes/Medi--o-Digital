import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';

const STORAGE_KEY = 'medicao_rotas_registros_v1';

const usuarios = {
  motorista: ['Carlos Silva', 'Ana Paula', 'João Mendes'],
  gestor: ['Gestor Operacional'],
};

function gerarId() {
  return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function carregarRegistros() {
  try {
    const bruto = localStorage.getItem(STORAGE_KEY);
    if (!bruto) return [];
    const parsed = JSON.parse(bruto);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function salvarRegistros(registros) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(registros));
}

function App() {
  const [sessao, setSessao] = useState(null);

  if (!sessao) {
    return <LoginScreen onLogin={setSessao} />;
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.h1}>Medição de Rotas para Faturamento</h1>
          <p style={styles.subtitle}>Usuário: {sessao.nome} ({sessao.tipo})</p>
        </div>
        <button style={styles.secondaryButton} onClick={() => setSessao(null)}>Sair</button>
      </header>

      {sessao.tipo === 'motorista' ? <MotoristaScreen sessao={sessao} /> : <GestorScreen />}
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [tipo, setTipo] = useState('motorista');
  const [nome, setNome] = useState(usuarios.motorista[0]);

  function trocarTipo(novoTipo) {
    setTipo(novoTipo);
    setNome(usuarios[novoTipo][0]);
  }

  return (
    <div style={styles.loginPage}>
      <div style={styles.loginCard}>
        <h1 style={styles.h1}>Login</h1>
        <p style={styles.subtitle}>Acesso para motorista ou gestor</p>

        <label style={styles.label}>Perfil</label>
        <select value={tipo} onChange={(e) => trocarTipo(e.target.value)} style={styles.input}>
          <option value="motorista">Motorista</option>
          <option value="gestor">Gestor</option>
        </select>

        <label style={styles.label}>Nome</label>
        <select value={nome} onChange={(e) => setNome(e.target.value)} style={styles.input}>
          {usuarios[tipo].map((usuario) => (
            <option key={usuario} value={usuario}>{usuario}</option>
          ))}
        </select>

        <button style={styles.button} onClick={() => onLogin({ tipo, nome })}>Entrar</button>
      </div>
    </div>
  );
}

function MotoristaScreen({ sessao }) {
  const [registros, setRegistros] = useState(() => carregarRegistros());
  const [form, setForm] = useState({
    cliente: 'Cliente A',
    contrato: 'Contrato 001',
    rota: '',
    data: '',
    saida: '',
    chegada: '',
    kmInicial: '',
    kmFinal: '',
    turno: 'normal',
    finalidade: '',
    observacoes: '',
  });

  const meusRegistros = registros
    .filter((r) => r.nome === sessao.nome)
    .sort((a, b) => `${b.data} ${b.chegada}`.localeCompare(`${a.data} ${a.chegada}`));

  function atualizarCampo(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  function salvar(event) {
    event.preventDefault();
    const novo = { ...form, id: gerarId(), nome: sessao.nome, criadoEm: new Date().toISOString() };
    const atualizados = [...registros, novo];
    setRegistros(atualizados);
    salvarRegistros(atualizados);
    setForm((atual) => ({ ...atual, rota: '', data: '', saida: '', chegada: '', kmInicial: '', kmFinal: '', finalidade: '', observacoes: '' }));
  }

  return (
    <div style={styles.layout}>
      <section style={styles.card}>
        <h2 style={styles.h2}>Preenchimento diário</h2>
        <form onSubmit={salvar} style={styles.formGrid}>
          {[
            ['cliente', 'Cliente/Empresa'], ['contrato', 'Contrato'], ['rota', 'Rota'], ['data', 'Data'], ['saida', 'Horário de saída'],
            ['chegada', 'Horário de chegada'], ['kmInicial', 'KM inicial'], ['kmFinal', 'KM final'], ['finalidade', 'Finalidade da viagem'],
          ].map(([campo, label]) => (
            <div key={campo}>
              <label style={styles.label}>{label}</label>
              <input
                required={campo !== 'finalidade' ? true : false}
                type={campo === 'data' ? 'date' : campo.includes('saida') || campo.includes('chegada') ? 'time' : campo.includes('km') ? 'number' : 'text'}
                value={form[campo]}
                onChange={(e) => atualizarCampo(campo, e.target.value)}
                style={styles.input}
              />
            </div>
          ))}

          <div>
            <label style={styles.label}>Tipo de turno</label>
            <select value={form.turno} onChange={(e) => atualizarCampo('turno', e.target.value)} style={styles.input}>
              <option value="normal">Normal</option>
              <option value="turno extra">Turno extra</option>
            </select>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={styles.label}>Observações</label>
            <textarea value={form.observacoes} onChange={(e) => atualizarCampo('observacoes', e.target.value)} style={styles.input} rows={3} />
          </div>

          <button style={styles.button} type="submit">Salvar registro</button>
        </form>
      </section>

      <section style={styles.card}>
        <h2 style={styles.h2}>Histórico das suas entradas</h2>
        <RegistrosTable registros={meusRegistros} />
      </section>
    </div>
  );
}

function GestorScreen() {
  const [registros] = useState(() => carregarRegistros());
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroMes, setFiltroMes] = useState('');

  const folhas = useMemo(() => {
    const agrupado = new Map();
    for (const registro of registros) {
      const mes = registro.data?.slice(0, 7) || 'sem-data';
      const chave = `${registro.cliente}__${mes}`;
      if (!agrupado.has(chave)) agrupado.set(chave, { cliente: registro.cliente, contrato: registro.contrato, mes, registros: [] });
      agrupado.get(chave).registros.push(registro);
    }
    return Array.from(agrupado.values()).filter((f) => (!filtroCliente || f.cliente === filtroCliente) && (!filtroMes || f.mes === filtroMes));
  }, [registros, filtroCliente, filtroMes]);

  const clientes = [...new Set(registros.map((r) => r.cliente))];
  const meses = [...new Set(registros.map((r) => r.data?.slice(0, 7)).filter(Boolean))];

  function exportarExcel(folha) {
    const linhas = [
      ['Nome', 'Rota', 'Data', 'Saída', 'Chegada', 'KM Inicial', 'KM Final', 'Turno', 'Finalidade', 'Observações'],
      ...folha.registros.map((r) => [r.nome, r.rota, r.data, r.saida, r.chegada, r.kmInicial, r.kmFinal, r.turno, r.finalidade, r.observacoes]),
    ];

    const csv = linhas.map((linha) => linha.map((v) => `"${String(v ?? '').replaceAll('"', '""')}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `folha-${folha.cliente}-${folha.mes}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section style={styles.card}>
      <h2 style={styles.h2}>Folhas por cliente/mês</h2>
      <div style={styles.filters}>
        <select value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)} style={styles.input}>
          <option value="">Todos os clientes</option>
          {clientes.map((cliente) => <option key={cliente} value={cliente}>{cliente}</option>)}
        </select>
        <select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} style={styles.input}>
          <option value="">Todos os meses</option>
          {meses.map((mes) => <option key={mes} value={mes}>{mes}</option>)}
        </select>
      </div>

      {folhas.map((folha) => (
        <article key={`${folha.cliente}-${folha.mes}`} style={styles.sheet}>
          <div style={styles.sheetHeader}>
            <h3 style={{ margin: 0 }}>{folha.cliente} — {folha.mes}</h3>
            <button style={styles.button} onClick={() => exportarExcel(folha)}>Exportar Excel (CSV)</button>
          </div>
          <p style={styles.subtitle}>Contrato: {folha.contrato} | Registros: {folha.registros.length}</p>
          <RegistrosTable registros={folha.registros} />
        </article>
      ))}
    </section>
  );
}

function RegistrosTable({ registros }) {
  if (!registros.length) return <p style={styles.subtitle}>Nenhum registro encontrado.</p>;

  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th>Nome</th><th>Rota</th><th>Data</th><th>Saída</th><th>Chegada</th><th>KM Inicial</th><th>KM Final</th><th>Turno</th><th>Finalidade</th>
          </tr>
        </thead>
        <tbody>
          {registros.map((r) => (
            <tr key={r.id}>
              <td>{r.nome}</td><td>{r.rota}</td><td>{r.data}</td><td>{r.saida}</td><td>{r.chegada}</td><td>{r.kmInicial}</td><td>{r.kmFinal}</td><td>{r.turno}</td><td>{r.finalidade}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  page: { fontFamily: 'Inter, Segoe UI, Arial, sans-serif', minHeight: '100vh', background: '#f5f7fb', color: '#1f2937', padding: '24px' },
  loginPage: { minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#eef2ff' },
  loginCard: { width: '100%', maxWidth: '420px', background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 10px 28px rgba(16,24,40,.1)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  h1: { margin: 0, fontSize: '1.8rem' },
  h2: { marginTop: 0, marginBottom: 12 },
  subtitle: { marginTop: 6, color: '#6b7280' },
  layout: { display: 'grid', gap: 16 },
  card: { background: '#fff', borderRadius: '12px', padding: 16, boxShadow: '0 2px 8px rgba(16,24,40,.08)' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 },
  label: { display: 'block', marginBottom: 6, fontWeight: 600 },
  input: { width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', boxSizing: 'border-box' },
  button: { border: 0, background: '#2563eb', color: '#fff', padding: '10px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' },
  secondaryButton: { border: '1px solid #d1d5db', background: '#fff', color: '#1f2937', padding: '10px 16px', borderRadius: 8, cursor: 'pointer' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  filters: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 14 },
  sheet: { border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, marginTop: 12 },
  sheetHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
