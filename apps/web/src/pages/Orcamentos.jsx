import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useFeedback } from '../components/Feedback.jsx';
import {
  IconSearch,
  IconCheck,
  IconX,
  IconEdit,
  IconPlus,
} from '../components/icons.jsx';

const ROTULO_ESTADO = {
  PENDENTE: 'Pendente',
  AGUARDANDO_DIAGNOSTICO: 'Aguarda diagnóstico',
  EM_DIAGNOSTICO: 'Em diagnóstico',
  AGUARDANDO_PRECO_FUNCIONARIO: 'Aguarda precificação',
  AGUARDANDO_APROVACAO_CLIENTE: 'Pronto para aprovação',
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

const ESTADOS_DECISAO = new Set(['AGUARDANDO_APROVACAO_CLIENTE']);
const ESTADOS_EM_REVISAO = new Set(['AGUARDANDO_VALIDACAO_FUNCIONARIO']);

const ESTADOS_HISTORICO = new Set([
  'AGUARDANDO_ATRIBUICAO_REPARACAO',
  'AGUARDANDO_REPARACAO',
  'EM_REPARACAO',
  'AGUARDANDO_PECAS',
  'CONCLUIDA',
  'PAGA',
  'ENTREGUE',
  'REJEITADA',
  'CANCELADA',
]);

const fmtData = (iso) =>
  iso ? new Date(iso).toLocaleString('pt-PT', { timeZone: 'Africa/Maputo' }) : '—';

const fmtMoeda = (v) =>
  v !== null && v !== undefined ? `${Number(v).toFixed(2)} MZN` : '—';

export default function Orcamentos({ perfil }) {
  const isStaff = ['FUNCIONARIO', 'ADMINISTRADOR'].includes(perfil);
  return isStaff ? <VistaStaff /> : <VistaCliente />;
}

// =====================================================
// CLIENTE: apenas aprovar / rejeitar / enviar revisão
// =====================================================
function VistaCliente() {
  const feedback = useFeedback();

  const [lista, setLista] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const [selecionadaId, setSelecionadaId] = useState(null);
  const [linhas, setLinhas] = useState(null);
  const [aCarregarLinhas, setACarregarLinhas] = useState(false);
  const [remover, setRemover] = useState({});
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setErro('');
    try {
      const data = await api('GET', '/ordens/meu');

      // Normalização defensiva: o api() já destrói { data }, mas cobrimos
      // formatos alternativos caso o backend mude o envelope.
      const arr = Array.isArray(data)
        ? data
        : Array.isArray(data?.ordens)
          ? data.ordens
          : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data?.lista)
              ? data.lista
              : Array.isArray(data?.results)
                ? data.results
                : [];

      setLista(arr);
    } catch (e) {
      setErro(e.message);
      setLista([]);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function abrirRevisao(osId) {
    setErro('');
    setSelecionadaId(osId);
    setLinhas(null);
    setRemover({});
    setACarregarLinhas(true);

    try {
      const data = await api('GET', `/ordens/${osId}/linhas`);
      setLinhas({
        servicos: Array.isArray(data?.servicos) ? data.servicos : [],
        pecas: Array.isArray(data?.pecas) ? data.pecas : [],
      });
    } catch (e) {
      setErro(e.message);
      setLinhas({ servicos: [], pecas: [] });
    } finally {
      setACarregarLinhas(false);
    }
  }

  function fecharRevisao() {
    setSelecionadaId(null);
    setLinhas(null);
    setRemover({});
  }

  function alternarRemocao(chave) {
    setRemover((r) => ({ ...r, [chave]: !r[chave] }));
  }

  function construirItensRemover() {
    return Object.entries(remover)
      .filter(([, marcado]) => Boolean(marcado))
      .map(([chave]) => {
        const tipo = chave.startsWith('s') ? 'servico' : 'peca';
        const linhaId = Number(chave.slice(1));
        return { tipo, linhaId };
      });
  }

  async function decidir(osId, acao) {
    if (salvando) return;

    setSalvando(true);
    setErro('');

    const mensagemSucesso =
      acao === 'aprovar'
        ? 'Orçamento aprovado'
        : acao === 'rejeitar'
          ? 'Orçamento rejeitado'
          : 'Revisão enviada ao funcionário';

    try {
      await api('POST', `/ordens/${osId}/decisao`, {
        body: {
          acao,
          itensRemover: acao === 'modificar' ? construirItensRemover() : [],
        },
      });

      feedback.mostrarSucesso?.(mensagemSucesso);
      fecharRevisao();
      await carregar();
    } catch (e) {
      setErro(e.message);
      feedback.mostrarErro?.('Falha ao enviar decisão', e.message);
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return <p className="centro">A carregar propostas…</p>;
  }

  const decidiveis = (lista ?? []).filter((o) => ESTADOS_DECISAO.has(o.estado));
  const emRevisao = (lista ?? []).filter((o) => ESTADOS_EM_REVISAO.has(o.estado));
  const historico = (lista ?? []).filter((o) => ESTADOS_HISTORICO.has(o.estado));

  return (
    <section>
      <h2>Orçamentos recebidos</h2>

      <p className="info">
        Estes orçamentos são enviados pelo funcionário depois do diagnóstico técnico
        do mecânico. Podes aprovar, rejeitar ou enviar uma revisão removendo itens.
      </p>

      {erro && <p className="erro" role="alert">{erro}</p>}

      {decidiveis.length === 0 ? (
        <p className="vazio">
          Ainda não tens nenhum orçamento pronto para aprovação.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {decidiveis.map((o) => (
            <article className="cartao" key={o.id}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <strong>{o.numeroOS ?? `#${o.id}`}</strong>
                  <span
                    className={`badge badge-${String(o.estado).toLowerCase()}`}
                    style={{ marginLeft: 8 }}
                  >
                    {ROTULO_ESTADO[o.estado] ?? o.estado}
                  </span>
                  <p className="hint" style={{ margin: '6px 0 0' }}>
                    Total: {fmtMoeda(o.valorTotal ?? o.valor_total)} ·{' '}
                    {fmtData(o.createdAt ?? o.created_at)}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    className="botao botao-secundario"
                    onClick={() =>
                      selecionadaId === o.id ? fecharRevisao() : abrirRevisao(o.id)
                    }
                    disabled={salvando}
                    aria-busy={salvando}
                  >
                    {selecionadaId === o.id ? 'Fechar revisão' : <><IconSearch /> Rever / editar itens</>}
                  </button>

                  <button
                    className="botao"
                    onClick={() => decidir(o.id, 'aprovar')}
                    disabled={salvando}
                    aria-busy={salvando}
                  >
                    <IconCheck /> Aprovar tudo
                  </button>

                  <button
                    className="botao botao-perigo"
                    onClick={() => decidir(o.id, 'rejeitar')}
                    disabled={salvando}
                    aria-busy={salvando}
                  >
                    <IconX /> Rejeitar
                  </button>
                </div>
              </div>

              {selecionadaId === o.id && (
                <PainelRevisao
                  os={o}
                  linhas={linhas}
                  aCarregarLinhas={aCarregarLinhas}
                  remover={remover}
                  alternarRemocao={alternarRemocao}
                  decidir={decidir}
                  salvando={salvando}
                  fechar={fecharRevisao}
                />
              )}
            </article>
          ))}
        </div>
      )}

      {emRevisao.length > 0 && (
        <>
          <h2 style={{ marginTop: 24 }}>Revisões enviadas</h2>
          <p className="hint">
            Estas ordens estão a aguardar validação do funcionário após removal de itens.
          </p>
          <table className="tabela">
            <thead>
              <tr>
                <th>Número</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {emRevisao.map((o) => (
                <tr key={o.id}>
                  <td>{o.numeroOS ?? `#${o.id}`}</td>
                  <td>{ROTULO_ESTADO[o.estado] ?? o.estado}</td>
                  <td>{fmtMoeda(o.valorTotal ?? o.valor_total)}</td>
                  <td>{fmtData(o.createdAt ?? o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {historico.length > 0 && (
        <>
          <h2 style={{ marginTop: 24 }}>Histórico</h2>
          <table className="tabela">
            <thead>
              <tr>
                <th>Número</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {historico.map((o) => (
                <tr key={o.id}>
                  <td>{o.numeroOS ?? `#${o.id}`}</td>
                  <td>{ROTULO_ESTADO[o.estado] ?? o.estado}</td>
                  <td>{fmtMoeda(o.valorTotal ?? o.valor_total)}</td>
                  <td>{fmtData(o.createdAt ?? o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}

function PainelRevisao({
  os,
  linhas,
  aCarregarLinhas,
  remover,
  alternarRemocao,
  decidir,
  salvando,
  fechar,
}) {
  if (aCarregarLinhas) {
    return (
      <p className="info" style={{ marginTop: 12 }}>
        A carregar itens da proposta…
      </p>
    );
  }

  const servicos = linhas?.servicos ?? [];
  const pecas = linhas?.pecas ?? [];

  const itens = [
    ...servicos.map((s) => ({
      chave: `s${s.id}`,
      tipo: 'servico',
      linhaId: s.id,
      nome:
        s.descricao_snapshot ||
        s.descricaoSnapshot ||
        (s.servico_id ? `Serviço #${s.servico_id}` : 'Serviço personalizado'),
      qtd: Number(s.quantidade ?? 1),
      preco: Number(s.preco_unitario ?? s.precoUnitario ?? 0),
      origem: s.origem ?? 'CATALOGO',
    })),
    ...pecas.map((p) => ({
      chave: `p${p.id}`,
      tipo: 'peca',
      linhaId: p.id,
      nome:
        p.descricao_snapshot ||
        p.descricaoSnapshot ||
        (p.peca_id ? `Peça #${p.peca_id}` : 'Peça personalizada'),
      qtd: Number(p.quantidade ?? 1),
      preco: Number(p.preco_unitario ?? p.precoUnitario ?? 0),
      origem: p.origem ?? 'CATALOGO',
    })),
  ];

  const taxaEntrega = Number(os.taxaEntrega ?? os.taxa_entrega ?? 0);

  const totalOriginal =
    itens.reduce((soma, i) => soma + i.preco * i.qtd, 0) + taxaEntrega;

  const totalRevisado =
    itens
      .filter((i) => !remover[i.chave])
      .reduce((soma, i) => soma + i.preco * i.qtd, 0) + taxaEntrega;

  const temSelecao = itens.some((i) => remover[i.chave]);
  const quantidadeRemovida = itens.filter((i) => remover[i.chave]).length;

  return (
    <div
      style={{
        marginTop: 16,
        paddingTop: 16,
        borderTop: '1px solid #E3EAF0',
      }}
    >
      <h3>Itens da proposta</h3>
      <p className="hint">
        Desmarca os itens que não queres e envia a revisão. O funcionário vai validar
        os cortes antes de avançar.
      </p>

      {itens.length === 0 ? (
        <p className="vazio">Sem itens lançados nesta proposta.</p>
      ) : (
        <table className="tabela" style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th>Manter?</th>
              <th>Tipo</th>
              <th>Descrição</th>
              <th>Qtd.</th>
              <th>Preço un.</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((i) => (
              <tr
                key={i.chave}
                className={remover[i.chave] ? 'linha-marcada' : ''}
                style={{ opacity: remover[i.chave] ? 0.45 : 1 }}
              >
                <td>
                  <input
                    type="checkbox"
                    checked={!remover[i.chave]}
                    onChange={() => alternarRemocao(i.chave)}
                    disabled={salvando}
                    aria-label={`Manter ${i.nome}`}
                  />
                </td>
                <td>{i.tipo === 'servico' ? 'Serviço' : 'Peça'}</td>
                <td>
                  <span
                    style={{
                      textDecoration: remover[i.chave] ? 'line-through' : 'none',
                    }}
                  >
                    {i.nome}
                  </span>
                  {i.origem === 'CUSTOM' && (
                    <span
                      className="badge-personalizado"
                      style={{ marginLeft: 8 }}
                    >
                      personalizado
                    </span>
                  )}
                </td>
                <td>{i.qtd}</td>
                <td>{fmtMoeda(i.preco)}</td>
                <td>{fmtMoeda(i.preco * i.qtd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div
        style={{
          marginTop: 12,
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <span>
          Total original: <strong>{fmtMoeda(totalOriginal)}</strong>
        </span>

        {temSelecao && (
          <span>
            Total revisado:{' '}
            <strong style={{ color: 'var(--destaque, #0b6bcb)' }}>
              {fmtMoeda(totalRevisado)}
            </strong>
          </span>
        )}
      </div>

      {taxaEntrega > 0 && (
        <p className="hint">
          Inclui taxa de entrega: {fmtMoeda(taxaEntrega)}
        </p>
      )}

      {Number(os.taxaDiagnostico ?? os.taxa_diagnostico ?? 0) > 0 && (
        <p className="hint">
          Nota: se rejeitares, pode ser aplicada a taxa de diagnóstico de{' '}
          {fmtMoeda(os.taxaDiagnostico ?? os.taxa_diagnostico)}.
        </p>
      )}

      <div
        style={{
          marginTop: 16,
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <button
          className="botao"
          onClick={() => decidir(os.id, 'aprovar')}
          disabled={salvando}
          aria-busy={salvando}
        >
          <IconCheck /> Aprovar tudo
        </button>

        <button
          className="botao botao-secundario"
          onClick={() => decidir(os.id, 'modificar')}
          disabled={salvando || !temSelecao}
          aria-busy={salvando}
        >
          <IconEdit /> Enviar revisão ({quantidadeRemovida} a remover)
        </button>

        <button
          className="botao botao-perigo"
          onClick={() => decidir(os.id, 'rejeitar')}
          disabled={salvando}
          aria-busy={salvando}
        >
          <IconX /> Rejeitar orçamento
        </button>

        <button
          className="botao botao-secundario"
          onClick={fechar}
          disabled={salvando}
          aria-busy={salvando}
        >
          Cancelar revisão
        </button>
      </div>
    </div>
  );
}

// =====================================================
// STAFF: mantém a fila antiga de orçamentos
// =====================================================
function VistaStaff() {
  const [orcamentos, setOrcamentos] = useState(null);
  const [aResponder, setAResponder] = useState(null);
  const [linhas, setLinhas] = useState([
    { descricao: '', quantidade: 1, precoUnitario: '' },
  ]);
  const [erro, setErro] = useState('');

  async function carregar() {
    try {
      const data = await api('GET', '/orcamentos');
      setOrcamentos(Array.isArray(data) ? data : []);
    } catch (e) {
      setErro(e.message);
      setOrcamentos([]);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function alterarLinha(idx, campo, valor) {
    setLinhas((ls) =>
      ls.map((l, i) => (i === idx ? { ...l, [campo]: valor } : l)),
    );
  }

  function addLinha() {
    setLinhas((ls) => [
      ...ls,
      { descricao: '', quantidade: 1, precoUnitario: '' },
    ]);
  }

  function removerLinha(idx) {
    setLinhas((ls) => ls.filter((_, i) => i !== idx));
  }

  async function enviarProposta(id) {
    setErro('');

    const itensValidos = linhas
      .filter((l) => String(l.descricao ?? '').trim())
      .map((l) => ({
        descricao: String(l.descricao).trim(),
        quantidade: Number(l.quantidade) || 1,
        precoUnitario: Number(l.precoUnitario) || 0,
      }));

    if (itensValidos.length === 0) {
      setErro('Adiciona pelo menos uma linha com descrição.');
      return;
    }

    try {
      await api('POST', `/orcamentos/${id}/resposta`, {
        body: { itens: itensValidos },
      });

      setAResponder(null);
      setLinhas([{ descricao: '', quantidade: 1, precoUnitario: '' }]);
      await carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  if (!orcamentos) {
    return <p className="centro">A carregar fila de orçamentos…</p>;
  }

  return (
    <section>
      <h2>Fila de orçamentos</h2>

      {erro && <p className="erro" role="alert">{erro}</p>}

      {orcamentos.length === 0 ? (
        <p className="vazio">Sem pedidos de orçamento.</p>
      ) : (
        orcamentos.map((o) => (
          <article className="cartao orcamento-item" key={o.id}>
            <div className="orcamento-cabecalho">
              <strong>{o.numero}</strong>
              <span className={`badge badge-${String(o.estado).toLowerCase()}`}>
                {ROTULO_ESTADO[o.estado] ?? o.estado}
              </span>
              <span className="orcamento-total">
                {fmtMoeda(o.totalEstimado)}
              </span>
            </div>

            {o.descricaoProblema && <p>{o.descricaoProblema}</p>}

            {o.estado === 'SOLICITADO' && aResponder !== o.id && (
              <button
                className="botao botao-secundario"
                onClick={() => setAResponder(o.id)}
              >
                Responder proposta
              </button>
            )}

            {aResponder === o.id && (
              <div className="proposta">
                {linhas.map((l, idx) => (
                  <div className="linha-row" key={idx}>
                    <input
                      placeholder="Descrição (ex.: Pastilhas)"
                      value={l.descricao}
                      onChange={(e) =>
                        alterarLinha(idx, 'descricao', e.target.value)
                      }
                    />

                    <input
                      type="number"
                      min="1"
                      className="input-pequeno"
                      value={l.quantidade}
                      onChange={(e) =>
                        alterarLinha(idx, 'quantidade', e.target.value)
                      }
                    />

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Preço"
                      value={l.precoUnitario}
                      onChange={(e) =>
                        alterarLinha(idx, 'precoUnitario', e.target.value)
                      }
                    />

                    {linhas.length > 1 && (
                      <button
                        type="button"
                        className="ligacao"
                        onClick={() => removerLinha(idx)}
                      >
                        remover
                      </button>
                    )}
                  </div>
                ))}

                <button type="button" className="ligacao" onClick={addLinha}>
                  <IconPlus /> adicionar linha
                </button>

                <div style={{ marginTop: 12 }}>
                  <button
                    className="botao"
                    onClick={() => enviarProposta(o.id)}
                  >
                    Enviar proposta
                  </button>{' '}
                  <button
                    className="botao botao-secundario"
                    onClick={() => setAResponder(null)}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </article>
        ))
      )}
    </section>
  );
}