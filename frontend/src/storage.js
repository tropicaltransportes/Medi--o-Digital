const STORAGE_KEY = 'medicao_rotas_registros_v1';

export const USUARIOS = {
  motorista: ['Carlos Silva', 'Ana Paula', 'João Mendes'],
  gestor: ['Gestor Operacional'],
};

export function gerarId() {
  return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export function carregarRegistros() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function salvarRegistros(registros) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(registros));
}

export function formatarMes(mesISO) {
  if (!mesISO || !mesISO.includes('-')) return mesISO;
  const [ano, mes] = mesISO.split('-');
  const nomes = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
  return `${nomes[parseInt(mes, 10) - 1]} ${ano}`;
}

export function kmRodados(registro) {
  const kmi = Number(registro.kmInicial);
  const kmf = Number(registro.kmFinal);
  if (isNaN(kmi) || isNaN(kmf) || kmf < kmi) return 0;
  return kmf - kmi;
}
