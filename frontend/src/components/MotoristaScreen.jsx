import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase.js';
import { kmRodados } from '../storage.js';
import RegistrosTable from './RegistrosTable.jsx';
import { s } from '../styles.js';

const hoje = () => new Date().toISOString().slice(0, 10);

const FORM_VAZIO = {
  contrato_id: '',
  rota_id: '',
  veiculo_id: '',
  data: hoje(),
  saida: '',
  chegada: '',
  km_inicial: '',
  km_final: '',
  turno: 'normal',
  status: 'completo',
  troca_veiculo: '',
  finalidade: '',
  observacoes: '',
};

export default function MotoristaScreen({ usuario }) {
  const [registros, setRegistros] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [rotas, setRotas] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [form, setForm] = useState(FORM_VAZIO);

  useEffect(() => { carregarDados(); }, []);

  // Recarrega rotas quando contrato muda
  useEffect(() => {
    if (form.contrato_id) {
      supabase
        .from('rotas')
        .select('id, nome')
        .eq('contrato_id', form.contrato_id)
        .eq('ativo', true)
        .order('nome')
        .then(({ data }) => setRotas(data || []));
    } else {
      setRotas([]);
    }
    setForm((f) => ({ ...f, rota_id: '' }));
  }, [form.contrato_id]);

  async function carregarDados() {
    setCarregando(true);
    const [{ data: cont }, { data: veic }, { data: regs }] = await Promise.all([
      supabase.from('contratos').select('id, nome, cliente').eq('ativo', true).order('nome'),
      supabase.from('veiculos').select('id, placa, descricao').eq('ativo', true).order('placa'),
      supabase
        .from('registros')
        .select('*, rotas(nome, contratos(nome, cliente)), veiculos(placa, descricao)')
        .eq('motorista_id', usuario.id)
        .order('data', { ascending: false })
        .order('saida', { ascending: false }),
    ]);

    if (cont) setContratos(cont);
    if (veic) setVeiculos(veic);
    if (regs) setRegistros(regs);
    setCarregando(false);
  }

  function campo(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function salvar(e) {
    e.preventDefault();
    setErro('');

    const kmi = Number(form.km_inicial);
    const kmf = Number(form.km_final);
    if (kmf < kmi) {
      setErro('KM Final deve ser maior ou igual ao KM Inicial.');
      return;
    }

    setSalvando(true);
    const { error } = await supabase.from('registros').insert({
      motorista_id: usuario.id,
      nome: usuario.nome,
      rota_id: Number(form.rota_id) || null,
      veiculo_id: Number(form.veiculo_id) || null,
      data: form.data,
      saida: form.saida,
      chegada: form.chegada,
      km_inicial: kmi,
      km_final: kmf,
      turno: form.turno,
      status: form.status,
      troca_veiculo: form.troca_veiculo || null,
      finalidade: form.finalidade,
      observacoes: form.observacoes,
    });

    if (error) {
      setErro('Erro ao salvar. Tente novamente.');
      console.error(error);
    } else {
      await carregarDados();
      // Mantém contrato e veículo selecionados
      setForm((f) => ({
        ...FORM_VAZIO,
        contrato_id: f.contrato_id,
        veiculo_id: f.veiculo_id,
        data: hoje(),
      }));
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
              <label style={s.label}>Contrato</label>
              <select required value={form.contrato_id} onChange={campo('contrato_id')} style={s.input}>
                <option value="">Selecione...</option>
                {contratos.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>

            <div>
              <label style={s.label}>Rota</label>
              <select required value={form.rota_id} onChange={campo('rota_id')} style={s.input} disabled={!form.contrato_id}>
                <option value="">{form.contrato_id ? 'Selecione...' : 'Selecione o contrato primeiro'}</option>
                {rotas.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
              </select>
            </div>

            <div>
              <label style={s.label}>Veículo</label>
              <select value={form.veiculo_id} onChange={campo('veiculo_id')} style={s.input}>
                <option value="">Selecione...</option>
                {veiculos.map((v) => <option key={v.id} value={v.id}>{v.placa} — {v.descricao}</option>)}
              </select>
            </div>

            <div>
              <label style={s.label}>Troca de veículo</label>
              <input value={form.troca_veiculo} onChange={campo('troca_veiculo')} style={s.input} placeholder="Placa do veículo substituto" />
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
              <input required type="number" min="0" value={form.km_inicial} onChange={campo('km_inicial')} style={s.input} placeholder="0" />
            </div>

            <div>
              <label style={s.label}>KM Final</label>
              <input required type="number" min="0" value={form.km_final} onChange={campo('km_final')} style={s.input} placeholder="0" />
            </div>

            <div>
              <label style={s.label}>Tipo de turno</label>
              <select value={form.turno} onChange={campo('turno')} style={s.input}>
                <option value="normal">Normal</option>
                <option value="turno extra">Turno extra</option>
              </select>
            </div>

            <div>
              <label style={s.label}>Status</label>
              <select value={form.status} onChange={campo('status')} style={s.input}>
                <option value="completo">Completo</option>
                <option value="rascunho">Rascunho</option>
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
            <span style={{ ...s.badge, marginLeft: 8, verticalAlign: 'middle' }}>{registros.length}</span>
          )}
        </h2>
        {carregando
          ? <p style={s.subtitle}>Carregando...</p>
          : <RegistrosTable registros={registros} />}
      </section>
    </div>
  );
}
