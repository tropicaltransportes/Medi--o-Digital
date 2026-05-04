import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase.js';
import { kmRodados, formatarHora } from '../storage.js';
import RegistrosTable from './RegistrosTable.jsx';
import { s } from '../styles.js';

const hoje = () => new Date().toISOString().slice(0, 10);

const FORM_VAZIO = {
  cliente: '',
  contrato: '',
  rota: '',
  data: hoje(),
  saida: '',
  chegada: '',
  kmInicial: '',
  kmFinal: '',
  turno: 'normal',
  finalidade: '',
  observacoes: '',
};

export default function MotoristaScreen({ sessao }) {
  const [registros, setRegistros] = useState([]);
  const [form, setForm] = useState(FORM_VAZIO);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregarRegistros();
  }, []);

  async function carregarRegistros() {
    setCarregando(true);
    const { data, error } = await supabase
      .from('registros')
      .select('*')
      .eq('motorista_id', sessao.user.id)
      .order('data', { ascending: false })
      .order('saida', { ascending: false });

    if (!error && data) setRegistros(data);
    setCarregando(false);
  }

  function campo(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function salvar(e) {
    e.preventDefault();
    setErro('');

    const kmi = Number(form.kmInicial);
    const kmf = Number(form.kmFinal);
    if (kmf < kmi) {
      setErro('KM Final deve ser maior ou igual ao KM Inicial.');
      return;
    }

    setSalvando(true);
    const { error } = await supabase.from('registros').insert({
      motorista_id: sessao.user.id,
      nome: sessao.perfil.nome,
      cliente: form.cliente,
      contrato: form.contrato,
      rota: form.rota,
      data: form.data,
      saida: form.saida,
      chegada: form.chegada,
      km_inicial: kmi,
      km_final: kmf,
      turno: form.turno,
      finalidade: form.finalidade,
      observacoes: form.observacoes,
    });

    if (error) {
      setErro('Erro ao salvar. Tente novamente.');
    } else {
      await carregarRegistros();
      setForm((f) => ({ ...FORM_VAZIO, cliente: f.cliente, contrato: f.contrato, data: hoje() }));
    }
    setSalvando(false);
  }

  return (
    <div style={s.layout}>
      <section style={s.card}>
        <h2 style={s.h2}>Registro diário</h2>
        <form onSubmit={salvar}>
          <div style={s.formGrid}>
            <div>
              <label style={s.label}>Cliente / Empresa</label>
              <input required value={form.cliente} onChange={campo('cliente')} style={s.input} placeholder="Nome do cliente" />
            </div>
            <div>
              <label style={s.label}>Contrato</label>
              <input required value={form.contrato} onChange={campo('contrato')} style={s.input} placeholder="Número do contrato" />
            </div>
            <div>
              <label style={s.label}>Rota</label>
              <input required value={form.rota} onChange={campo('rota')} style={s.input} placeholder="Descrição da rota" />
            </div>
            <div>
              <label style={s.label}>Data</label>
              <input required type="date" value={form.data} onChange={campo('data')} style={s.input} />
            </div>
            <div>
              <label style={s.label}>Horário de saída</label>
              <input required type="time" value={form.saida} onChange={campo('saida')} style={s.input} />
            </div>
            <div>
              <label style={s.label}>Horário de chegada</label>
              <input required type="time" value={form.chegada} onChange={campo('chegada')} style={s.input} />
            </div>
            <div>
              <label style={s.label}>KM Inicial</label>
              <input required type="number" min="0" value={form.kmInicial} onChange={campo('kmInicial')} style={s.input} placeholder="0" />
            </div>
            <div>
              <label style={s.label}>KM Final</label>
              <input required type="number" min="0" value={form.kmFinal} onChange={campo('kmFinal')} style={s.input} placeholder="0" />
            </div>
            <div>
              <label style={s.label}>Tipo de turno</label>
              <select value={form.turno} onChange={campo('turno')} style={s.input}>
                <option value="normal">Normal</option>
                <option value="turno extra">Turno extra</option>
              </select>
            </div>
            <div>
              <label style={s.label}>Finalidade da viagem</label>
              <input value={form.finalidade} onChange={campo('finalidade')} style={s.input} placeholder="Ex: entrega de materiais" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={s.label}>Observações</label>
              <textarea value={form.observacoes} onChange={campo('observacoes')} style={{ ...s.input, resize: 'vertical' }} rows={3} placeholder="Opcional" />
            </div>
          </div>

          {erro && <p style={s.errorText}>{erro}</p>}

          <button style={{ ...s.btn, marginTop: 16, opacity: salvando ? 0.7 : 1 }} type="submit" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar registro'}
          </button>
        </form>
      </section>

      <section style={s.card}>
        <h2 style={s.h2}>
          Histórico de registros
          {registros.length > 0 && (
            <span style={{ ...s.badge, marginLeft: 8, verticalAlign: 'middle' }}>
              {registros.length}
            </span>
          )}
        </h2>
        {carregando
          ? <p style={s.subtitle}>Carregando...</p>
          : <RegistrosTable registros={registros} />}
      </section>
    </div>
  );
}
