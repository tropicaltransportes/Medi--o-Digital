import React from 'react';
import ReactDOM from 'react-dom/client';

const cards = [
  { title: 'Rotas do Dia', value: '18', detail: '3 com atraso' },
  { title: 'Km Planejados', value: '1.240 km', detail: '+4% vs ontem' },
  { title: 'Tempo Médio', value: '01h42', detail: '-8 min' },
  { title: 'Entregas Concluídas', value: '86%', detail: 'Meta: 90%' },
];

const routes = [
  { id: 'R-102', motorista: 'Carlos Silva', origem: 'Guarulhos', destino: 'Campinas', status: 'Em rota' },
  { id: 'R-109', motorista: 'Ana Paula', origem: 'Santos', destino: 'Sorocaba', status: 'Aguardando coleta' },
  { id: 'R-114', motorista: 'João Mendes', origem: 'Jundiaí', destino: 'São José dos Campos', status: 'Concluída' },
];

function App() {
  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.h1}>Medição de Rotas</h1>
          <p style={styles.subtitle}>Painel operacional de acompanhamento logístico</p>
        </div>
        <button style={styles.button}>+ Nova Rota</button>
      </header>

      <section style={styles.grid}>
        {cards.map((card) => (
          <article key={card.title} style={styles.card}>
            <p style={styles.cardTitle}>{card.title}</p>
            <p style={styles.cardValue}>{card.value}</p>
            <p style={styles.cardDetail}>{card.detail}</p>
          </article>
        ))}
      </section>

      <section style={styles.section}>
        <h2 style={styles.h2}>Rotas em acompanhamento</h2>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Motorista</th>
                <th>Origem</th>
                <th>Destino</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {routes.map((route) => (
                <tr key={route.id}>
                  <td>{route.id}</td>
                  <td>{route.motorista}</td>
                  <td>{route.origem}</td>
                  <td>{route.destino}</td>
                  <td>{route.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const styles = {
  page: {
    fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
    minHeight: '100vh',
    background: '#f5f7fb',
    color: '#1f2937',
    padding: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  h1: { margin: 0, fontSize: '2rem' },
  subtitle: { marginTop: '6px', color: '#6b7280' },
  button: {
    border: 0,
    background: '#2563eb',
    color: '#fff',
    padding: '10px 16px',
    borderRadius: '8px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
    marginBottom: '24px',
  },
  card: {
    background: '#fff',
    borderRadius: '12px',
    padding: '14px',
    boxShadow: '0 2px 8px rgba(16,24,40,.08)',
  },
  cardTitle: { color: '#6b7280', margin: 0, fontSize: '.9rem' },
  cardValue: { fontSize: '1.6rem', fontWeight: 700, margin: '8px 0' },
  cardDetail: { margin: 0, color: '#16a34a', fontWeight: 500 },
  section: { background: '#fff', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(16,24,40,.08)' },
  h2: { marginTop: 0, marginBottom: '12px' },
  tableWrap: { overflowX: 'auto' },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
