import { useEffect, useState } from 'react';
import { api, absolutaUrl } from '../lib/api.js';
import { useFeedback } from '../components/Feedback.jsx';
import ListaItensPropostos from '../components/ListaItensPropostos.jsx';
import CarregarEvidencias from '../components/CarregarEvidencias.jsx';
import {
  IconWrench, IconPlay, IconCheck, IconPlus, IconArrowLeft, IconClipboard,
  IconBolt, IconClock, IconSend, IconTrash, IconeEstadoCheck,
} from '../components/icons.jsx';

const ROTULO_ESTADO = {
  PENDENTE: 'Pendente',
  AGUARDANDO_DIAGNOSTICO: 'Aguarda início do mecânico',
  EM_DIAGNOSTICO: 'Em diagnóstico',
  AGUARDANDO_PRECO_FUNCIONARIO: 'Aguarda precificação',
  AGUARDANDO_APROVACAO_CLIENTE: 'Aguarda cliente',
  AGUARDANDO_VALIDACAO_FUNCIONARIO: 'Aguarda validação da edição',
  AGUARDANDO_ATRIBUICAO_REPARACAO: 'Aguarda atribuição de reparação',
  AGUARDANDO_REPARACAO: 'Aguarda reparação',
  EM_REPARACAO: 'Em reparação',
  AGUARDANDO_PECAS: 'Aguarda peças',
  CONCLUIDA: 'Reparação concluída',
  PAGA: 'Paga',
  ENTREGUE: 'Entregue',
  REJEITADA: 'Rejeitada',
  CANCELADA: 'Cancelada',
};

const ROTULO_ESTADO_CHECK = {
  OK: 'OK',
  DESGASTE: 'Desgaste',
  AVARIADO: 'Avariado',
  SUBSTITUIR: 'Substituir',
};

const fmtData = (iso) =>
  iso ? new Date(iso).toLocaleDateString('pt-PT', { timeZone: 'Africa/Maputo' }) : '—';

export default function Mecanico() {
  const feedback = useFeedback();
  const [lista, setLista] = useState(null);
  const [osAberta, setOsAberta] = useState(null);
  const [erro, setErro] = useState('');

  async function carregar() {
    try {
      setLista(await api('GET', '/ordens/minhas'));
      setErro('');
    } catch (e) {
      setErro(e.message);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function abrirOs(id) {
    setErro('');
    try {
      const os = await api('GET', `/ordens/${id}`);
      setOsAberta(os);
    } catch (e) {
      setErro(e.message);
    }
  }

  function fecharOs() {
    setOsAberta(null);
  }

  async function iniciarDiagnostico(id) {
    const r = await feedback.executar(
      () => api('POST', `/ordens/${id}/iniciar-diagnostico`),
      {
        sucesso: 'Diagnóstico iniciado',
        sucessoDetalhe: 'Já podes preencher o checklist técnico.',
        carregando: 'A iniciar diagnóstico…',
      },
    );

    if (r.ok) {
      await carregar();
      await abrirOs(id);
    }
  }

  async function iniciarReparacao(id) {
    const r = await feedback.executar(
      () => api('POST', `/ordens/${id}/iniciar-reparacao`),
      {
        sucesso: 'Reparação iniciada',
        sucessoDetalhe: 'A OS passou para em reparação.',
        carregando: 'A iniciar reparação…',
      },
    );

    if (r.ok) {
      await carregar();
      if (osAberta?.id === id) await abrirOs(id);
    }
  }

  async function concluirReparacao(id) {
    const r = await feedback.executar(
      () => api('POST', `/ordens/${id}/concluir-reparacao`),
      {
        sucesso: 'Reparação concluída',
        sucessoDetalhe: 'O cliente foi notificado para pagamento/entrega.',
        carregando: 'A concluir reparação…',
      },
    );

    if (r.ok) {
      await carregar();
      fecharOs();
    }
  }

  async function recarregarOsAberta(id) {
    await carregar();
    await abrirOs(id);
  }

  if (lista === null) return <p className="centro">A carregar as tuas ordens…</p>;

  return (
    <section>
      <h2><IconWrench /> Painel do Mecânico</h2>

      {erro && <p className="erro" role="alert">{erro}</p>}

      {osAberta ? (
        <div className="cartao" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3>{osAberta.numeroOS} — {ROTULO_ESTADO[osAberta.estado] ?? osAberta.estado}</h3>
            <button className="botao botao-secundario" onClick={fecharOs}>
              <IconArrowLeft /> Voltar à lista
            </button>
          </div>

          <div style={{ background: '#F3F7FA', padding: 12, borderRadius: 8, marginBottom: 16 }}>
            <p><strong>Problema reportado:</strong> {osAberta.descricaoProblema}</p>
            <p><small>Estado: {ROTULO_ESTADO[osAberta.estado] ?? osAberta.estado} · Criada: {fmtData(osAberta.createdAt)}</small></p>
          </div>

          {osAberta.estado === 'AGUARDANDO_DIAGNOSTICO' && (
            <div className="cartao">
              <h4>Iniciar diagnóstico</h4>
              <p>Esta OS foi atribuída a ti. Inicia o diagnóstico para poderes registar checklist, peças e serviços necessários.</p>
              <button className="botao" onClick={() => iniciarDiagnostico(osAberta.id)} disabled={feedback.aExecutando} aria-busy={feedback.aExecutando}>
                <IconPlay /> Iniciar diagnóstico
              </button>
            </div>
          )}

          {osAberta.estado === 'EM_DIAGNOSTICO' && (
            <FormularioDiagnostico os={osAberta} aoVoltar={fecharOs} aoSubmeter={carregar} />
          )}

          {osAberta.estado === 'AGUARDANDO_REPARACAO' && (
            <div className="cartao">
              <h4>Iniciar reparação</h4>
              <p>O funcionário atribuiu esta OS a ti para reparação. Inicia quando estiveres pronto.</p>
              <button className="botao" onClick={() => iniciarReparacao(osAberta.id)} disabled={feedback.aExecutando} aria-busy={feedback.aExecutando}>
                <IconPlay /> Iniciar reparação
              </button>
            </div>
          )}

          {osAberta.estado === 'AGUARDANDO_PECAS' && (
            <div className="cartao">
              <h4>Retomar reparação</h4>
              <p>Se as peças já estiverem disponíveis, podes retomar a reparação.</p>
              <button className="botao" onClick={() => iniciarReparacao(osAberta.id)} disabled={feedback.aExecutando} aria-busy={feedback.aExecutando}>
                <IconPlay /> Retomar reparação
              </button>
            </div>
          )}

          {osAberta.estado === 'AGUARDANDO_PRECO_FUNCIONARIO' && (
            <div className="cartao" style={{ background: '#FFF8E1', border: '1px solid #FFE082' }}>
              <h4><IconClock /> A OS foi para precificação</h4>
              <p className="hint">
                Registaste necessidade extra. O funcionário vai atribuir preços e o cliente aprova.
                Depois a OS volta para ti para reparação. Podes consultar os itens lançados.
              </p>
            </div>
          )}

          {osAberta.estado === 'EM_REPARACAO' && (
            <div className="cartao">
              <h4>Reparação em curso</h4>
              <p>Quando o veículo estiver tecnicamente pronto, valida a conclusão. Se aparecer novo serviço/peça, regista necessidade extra e a OS volta para precificação.</p>

              <button
                className="botao"
                onClick={() => concluirReparacao(osAberta.id)}
                disabled={feedback.aExecutando}
                aria-busy={feedback.aExecutando}
                style={{ marginBottom: 16 }}
              >
                <IconCheck /> Concluir reparação
              </button>

              <FormularioNovaNecessidade
                os={osAberta}
                aoSubmeter={() => recarregarOsAberta(osAberta.id)}
              />
            </div>
          )}

          {!['AGUARDANDO_DIAGNOSTICO', 'EM_DIAGNOSTICO', 'AGUARDANDO_REPARACAO', 'AGUARDANDO_PECAS', 'EM_REPARACAO', 'AGUARDANDO_PRECO_FUNCIONARIO'].includes(osAberta.estado) && (
            <p className="info">Esta OS não está numa fase em que possas agir. Apenas podes consultar.</p>
          )}
        </div>
      ) : (
        <>
          {lista.length === 0 ? (
            <p className="vazio">Não tens ordens de serviço atribuídas de momento.</p>
          ) : (
            <table className="tabela">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Estado</th>
                  <th>Problema</th>
                  <th>Criada</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lista.map((o) => (
                  <tr key={o.id}>
                    <td><strong>{o.numeroOS}</strong></td>
                    <td>
                      <span className={`badge badge-${o.estado.toLowerCase()}`}>
                        {ROTULO_ESTADO[o.estado] ?? o.estado}
                      </span>
                    </td>
                    <td>
                      {o.descricaoProblema?.slice(0, 60)}
                      {o.descricaoProblema?.length > 60 ? '…' : ''}
                    </td>
                    <td>{fmtData(o.createdAt)}</td>
                    <td>
                      {o.estado === 'AGUARDANDO_DIAGNOSTICO' && (
                        <button className="botao" onClick={() => iniciarDiagnostico(o.id)} disabled={feedback.aExecutando} aria-busy={feedback.aExecutando}>
                          <IconPlay /> Iniciar diagnóstico
                        </button>
                      )}

                      {o.estado === 'EM_DIAGNOSTICO' && (
                        <button className="botao" onClick={() => abrirOs(o.id)}>
                          Diagnosticar
                        </button>
                      )}

                      {o.estado === 'AGUARDANDO_REPARACAO' && (
                        <button className="botao" onClick={() => iniciarReparacao(o.id)} disabled={feedback.aExecutando} aria-busy={feedback.aExecutando}>
                          <IconPlay /> Iniciar reparação
                        </button>
                      )}

                      {o.estado === 'AGUARDANDO_PECAS' && (
                        <button className="botao" onClick={() => iniciarReparacao(o.id)} disabled={feedback.aExecutando} aria-busy={feedback.aExecutando}>
                          <IconPlay /> Retomar
                        </button>
                      )}

                      {o.estado === 'EM_REPARACAO' && (
                        <button className="botao" onClick={() => abrirOs(o.id)}>
                          Concluir / Extra
                        </button>
                      )}

                      {!['AGUARDANDO_DIAGNOSTICO', 'EM_DIAGNOSTICO', 'AGUARDANDO_REPARACAO', 'AGUARDANDO_PECAS', 'EM_REPARACAO'].includes(o.estado) && (
                        <button className="botao botao-secundario" onClick={() => abrirOs(o.id)}>
                          Ver
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  );
}

// ==========================================
// FORMULÁRIO DE DIAGNÓSTICO
// ==========================================
function FormularioDiagnostico({ os, aoVoltar, aoSubmeter }) {
  const feedback = useFeedback();

  const [checklist, setChecklist] = useState([
    { item: '', estado: 'OK', observacao: '', valorMedicao: '' },
  ]);

  const [servicos, setServicos] = useState([]);
  const [pecas, setPecas] = useState([]);

  const [catalogoServicos, setCatalogoServicos] = useState([]);
  const [catalogoPecas, setCatalogoPecas] = useState([]);

  const [evidencias, setEvidencias] = useState([]);

  const ocupado = feedback.aExecutando;

  useEffect(() => {
    api('GET', '/servicos/todos')
      .then((s) => setCatalogoServicos(Array.isArray(s) ? s.filter((x) => x.ativo) : []))
      .catch(() => {});

    api('GET', '/pecas')
      .then((p) => setCatalogoPecas(Array.isArray(p) ? p.filter((x) => x.ativo) : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    api('GET', `/ordens/${os.id}/evidencias`)
      .then((r) => {
        const lista = Array.isArray(r) ? r : [];
        setEvidencias(
          lista.map((ev) => ({
            ...ev,
            previewUrl: absolutaUrl(ev.url),
          })),
        );
      })
      .catch(() => {});
  }, [os.id]);

  function addChecklistItem() {
    setChecklist([
      ...checklist,
      { item: '', estado: 'OK', observacao: '', valorMedicao: '' },
    ]);
  }

  function removeChecklistItem(i) {
    setChecklist(checklist.filter((_, idx) => idx !== i));
  }

  function updateChecklist(i, campo, valor) {
    const nova = [...checklist];
    nova[i][campo] = valor;
    setChecklist(nova);
  }

  async function submeter(e) {
    e.preventDefault();

    const servicosValidos = servicos.filter((s) => String(s.nome ?? '').trim());
    const pecasValidas = pecas.filter((p) => String(p.nome ?? '').trim());

    if (servicosValidos.length === 0 && pecasValidas.length === 0) {
      feedback.mostrarErro(
        'Sem itens',
        'Adiciona pelo menos um serviço ou uma peça, do catálogo ou personalizado.',
      );
      return;
    }

    const payload = {
      checklist: checklist.filter((c) => c.item.trim()),

      servicos: servicosValidos.map((s) => {
        const nome = String(s.nome ?? '').trim();

        return {
          servicoId: s.id != null ? Number(s.id) : null,
          id: s.id != null ? Number(s.id) : null,
          nome,
          descricao: nome,
          quantidade: Number(s.quantidade) || 1,
          custom: Boolean(s.custom),
        };
      }),

      pecas: pecasValidas.map((p) => {
        const nome = String(p.nome ?? '').trim();

        return {
          pecaId: p.id != null ? Number(p.id) : null,
          id: p.id != null ? Number(p.id) : null,
          nome,
          descricao: nome,
          quantidade: Number(p.quantidade) || 1,
          custom: Boolean(p.custom),
        };
      }),
    };

    const r = await feedback.executar(
      () => api('POST', `/ordens/${os.id}/diagnostico`, { body: payload }),
      {
        sucesso: 'Diagnóstico enviado',
        sucessoDetalhe: 'A OS foi para precificação pelo funcionário.',
        carregando: 'A enviar diagnóstico…',
      },
    );

    if (r.ok) {
      aoSubmeter();
      aoVoltar();
    }
  }

  const podeEditar = os.estado === 'EM_DIAGNOSTICO';

  return (
    <div className="cartao" style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3>{os.numeroOS} — Diagnóstico Técnico</h3>
        <button className="botao botao-secundario" onClick={aoVoltar} disabled={ocupado}>
          <IconArrowLeft /> Voltar à lista
        </button>
      </div>

      <div style={{ background: '#F3F7FA', padding: 12, borderRadius: 8, marginBottom: 16 }}>
        <p><strong>Problema reportado:</strong> {os.descricaoProblema}</p>
        <p>
          <small>
            Estado: {ROTULO_ESTADO[os.estado] ?? os.estado} · Criada: {fmtData(os.createdAt)}
          </small>
        </p>
      </div>

      {!podeEditar && (
        <p className="info">Esta OS não está em estado de diagnóstico. Apenas podes consultar.</p>
      )}

      {podeEditar && (
        <form onSubmit={submeter}>
          <fieldset style={{ border: '1px solid #E3EAF0', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <legend><strong><IconClipboard /> Checklist Técnico</strong></legend>

            {checklist.map((c, i) => (
              <div
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1.2fr 2fr 1fr auto',
                  gap: 8,
                  marginBottom: 8,
                  alignItems: 'end',
                }}
              >
                <div>
                  <label>Componente / Sistema</label>
                  <input
                    value={c.item}
                    onChange={(e) => updateChecklist(i, 'item', e.target.value)}
                    placeholder="Ex: Travões dianteiros"
                    required
                    disabled={ocupado}
                  />
                </div>

                <div>
                  <label>Estado</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <IconeEstadoCheck valor={c.estado} style={{ marginRight: 0 }} />
                    <select
                      value={c.estado}
                      onChange={(e) => updateChecklist(i, 'estado', e.target.value)}
                      disabled={ocupado}
                      style={{ flex: 1 }}
                    >
                      {Object.entries(ROTULO_ESTADO_CHECK).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label>Observação</label>
                  <input
                    value={c.observacao}
                    onChange={(e) => updateChecklist(i, 'observacao', e.target.value)}
                    placeholder="Ex: 30% de vida restante"
                    disabled={ocupado}
                  />
                </div>

                <div>
                  <label>Medição</label>
                  <input
                    value={c.valorMedicao}
                    onChange={(e) => updateChecklist(i, 'valorMedicao', e.target.value)}
                    placeholder="Ex: 3.2mm"
                    disabled={ocupado}
                  />
                </div>

                <button
                  type="button"
                  className="botao botao-perigo"
                  onClick={() => removeChecklistItem(i)}
                  style={{ height: 38 }}
                  disabled={ocupado}
                  aria-label="Remover item do checklist"
                  title="Remover item"
                >
                  <IconTrash />
                </button>
              </div>
            ))}

            <button
              type="button"
              className="botao botao-secundario"
              onClick={addChecklistItem}
              disabled={ocupado}
            >
              <IconPlus /> Adicionar item
            </button>
          </fieldset>

          <ListaItensPropostos
            titulo={<><IconWrench /> Serviços Necessários</>}
            subtitle="Escolhe do catálogo ou escreve um serviço personalizado. O funcionário atribuirá os preços."
            tipo="SERVICO"
            options={catalogoServicos}
            itens={servicos}
            onChange={setServicos}
            mostrarPreco={false}
            disabled={ocupado}
          />

          <div style={{ marginTop: 16 }}>
            <ListaItensPropostos
              titulo={<><IconBolt /> Peças Necessárias</>}
              subtitle="Escolhe do catálogo ou escreve uma peça personalizada. O funcionário atribuirá os preços."
              tipo="PECA"
              options={catalogoPecas}
              itens={pecas}
              onChange={setPecas}
              mostrarPreco={false}
              disabled={ocupado}
            />
          </div>

          <div style={{ marginTop: 16 }}>
            <CarregarEvidencias
              ordemId={os.id}
              valor={evidencias}
              onChange={setEvidencias}
              maxArquivos={10}
              maxMB={25}
              disabled={ocupado}
              titulo="Evidências (fotos e vídeos)"
              hint="Tira foto, grava vídeo ou escolhe do dispositivo. Os ficheiros são enviados imediatamente."
            />
          </div>

          <button
            className="botao botao-grande"
            type="submit"
            disabled={ocupado}
            aria-busy={ocupado}
            style={{ width: '100%', marginTop: 16 }}
          >
            {ocupado ? 'A enviar…' : <><IconCheck /> Finalizar Diagnóstico e Enviar ao Funcionário</>}
          </button>
        </form>
      )}
    </div>
  );
}

// ==========================================
// FORMULÁRIO DE NECESSIDADE EXTRA DURANTE REPARAÇÃO
// ==========================================
function FormularioNovaNecessidade({ os, aoSubmeter }) {
  const feedback = useFeedback();

  const [servicos, setServicos] = useState([]);
  const [pecas, setPecas] = useState([]);
  const [catalogoServicos, setCatalogoServicos] = useState([]);
  const [catalogoPecas, setCatalogoPecas] = useState([]);
  const [evidencias, setEvidencias] = useState([]);

  const ocupado = feedback.aExecutando;

  useEffect(() => {
    api('GET', '/servicos/todos')
      .then((s) => setCatalogoServicos(Array.isArray(s) ? s.filter((x) => x.ativo) : []))
      .catch(() => {});

    api('GET', '/pecas')
      .then((p) => setCatalogoPecas(Array.isArray(p) ? p.filter((x) => x.ativo) : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    api('GET', `/ordens/${os.id}/evidencias`)
      .then((r) => {
        const lista = Array.isArray(r) ? r : [];
        setEvidencias(
          lista.map((ev) => ({
            ...ev,
            previewUrl: absolutaUrl(ev.url),
          })),
        );
      })
      .catch(() => {});
  }, [os.id]);

  async function submeter(e) {
    e.preventDefault();

    const servicosValidos = servicos.filter((s) => String(s.nome ?? '').trim());
    const pecasValidas = pecas.filter((p) => String(p.nome ?? '').trim());

    if (servicosValidos.length === 0 && pecasValidas.length === 0) {
      feedback.mostrarErro(
        'Sem itens extras',
        'Adiciona pelo menos um serviço ou peça extra.',
      );
      return;
    }

    const payload = {
      servicos: servicosValidos.map((s) => {
        const nome = String(s.nome ?? '').trim();

        return {
          servicoId: s.id != null ? Number(s.id) : null,
          id: s.id != null ? Number(s.id) : null,
          nome,
          descricao: nome,
          quantidade: Number(s.quantidade) || 1,
          custom: Boolean(s.custom),
        };
      }),

      pecas: pecasValidas.map((p) => {
        const nome = String(p.nome ?? '').trim();

        return {
          pecaId: p.id != null ? Number(p.id) : null,
          id: p.id != null ? Number(p.id) : null,
          nome,
          descricao: nome,
          quantidade: Number(p.quantidade) || 1,
          custom: Boolean(p.custom),
        };
      }),
    };

    const r = await feedback.executar(
      () => api('POST', `/ordens/${os.id}/nova-necessidade`, { body: payload }),
      {
        sucesso: 'Necessidade extra registada',
        sucessoDetalhe: 'A OS voltou para precificação pelo funcionário.',
        carregando: 'A enviar necessidade extra…',
      },
    );

    if (r.ok) {
      setServicos([]);
      setPecas([]);
      aoSubmeter?.();
    }
  }

  return (
    <form onSubmit={submeter} className="cartao" style={{ background: '#FBFCFD' }}>
      <h4><IconPlus /> Nova necessidade durante a reparação</h4>
      <p className="hint">
        Se descobrires outro serviço/peça necessário, regista aqui. A OS voltará para precificação e aprovação do cliente.
      </p>

      <ListaItensPropostos
        titulo="Serviços extras"
        subtitle="Escolhe do catálogo ou escreve serviço personalizado."
        tipo="SERVICO"
        options={catalogoServicos}
        itens={servicos}
        onChange={setServicos}
        mostrarPreco={false}
        disabled={ocupado}
      />

      <div style={{ marginTop: 16 }}>
        <ListaItensPropostos
          titulo="Peças extras"
          subtitle="Escolhe do catálogo ou escreve peça personalizada."
          tipo="PECA"
          options={catalogoPecas}
          itens={pecas}
          onChange={setPecas}
          mostrarPreco={false}
          disabled={ocupado}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <CarregarEvidencias
          ordemId={os.id}
          valor={evidencias}
          onChange={setEvidencias}
          maxArquivos={10}
          maxMB={25}
          disabled={ocupado}
          titulo="Evidências da necessidade extra"
          hint="Foto/vídeo ajudam o funcionário e o cliente a entender o novo serviço."
        />
      </div>

      <button
        className="botao"
        type="submit"
        disabled={ocupado}
        aria-busy={ocupado}
        style={{ marginTop: 16 }}
      >
        {ocupado ? 'A enviar…' : <><IconSend /> Enviar necessidade extra para precificação</>}
      </button>
    </form>
  );
}