const SESSAO_KEY = 'medicao_sessao_v2';

export function salvarSessao(usuario) {
  localStorage.setItem(SESSAO_KEY, JSON.stringify(usuario));
}

export function carregarSessao() {
  try {
    const raw = localStorage.getItem(SESSAO_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function limparSessao() {
  localStorage.removeItem(SESSAO_KEY);
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
  const kmi = Number(registro.km_inicial);
  const kmf = Number(registro.km_final);
  if (isNaN(kmi) || isNaN(kmf) || kmf < kmi) return 0;
  return kmf - kmi;
}
