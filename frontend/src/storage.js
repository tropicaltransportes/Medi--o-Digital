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

// Supabase retorna time como "HH:mm:ss" — exibe apenas "HH:mm"
export function formatarHora(hora) {
  if (!hora) return '';
  return hora.slice(0, 5);
}

export function gerarId() {
  return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}
