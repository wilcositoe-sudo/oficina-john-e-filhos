import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useFeedback } from '../components/Feedback.jsx';

const COMPONENTES_MOTOR = [
  {
    id: 'pistao',
    nome: 'Pistão',
    descricao: 'Move-se dentro do cilindro e transmite força ao conjunto mecânico.',
    x: 118,
    y: 145,
  },
  {
    id: 'cilindro',
    nome: 'Cilindro',
    descricao: 'Guia o movimento do pistão no interior do bloco do motor.',
    x: 118,
    y: 100,
  },
  {
    id: 'valvulas',
    nome: 'Válvulas',
    descricao: 'Controlam a entrada da mistura e a saída dos gases no motor.',
    x: 118,
    y: 57,
  },
  {
    id: 'radiador',
    nome: 'Radiador',
    descricao: 'Ajuda a dissipar o calor do líquido de arrefecimento.',
    x: 278,
    y: 115,
  },
  {
    id: 'alternador',
    nome: 'Alternador',
    descricao: 'Gera energia elétrica para o veículo e carrega a bateria.',
    x: 216,
    y: 191,
  },
  {
    id: 'filtro',
    nome: 'Filtro de óleo',
    descricao: 'Retém partículas para ajudar a manter o óleo de lubrificação limpo.',
    x: 152,
    y: 203,
  },
  {
    id: 'turbo',
    nome: 'Turbocompressor',
    descricao: 'Utiliza os gases de escape para comprimir o ar admitido pelo motor.',
    x: 210,
    y: 75,
  },
];

function MotorDidatico() {
  const [componenteAtivo, setComponenteAtivo] = useState(COMPONENTES_MOTOR[0]);

  return (
    <section className="motor-explorer" aria-labelledby="motor-explorer-title">
      <div className="motor-explorer-heading">
        <div>
          <span className="landing-section-kicker">Explorar componentes</span>
          <h3 id="motor-explorer-title">Dentro do motor</h3>
          <p>Selecione um componente para o destacar no esquema.</p>
        </div>
        <span className="motor-diagram-label">Esquema 2D didático · não é modelo técnico</span>
      </div>
      <div className="motor-explorer-content">
        <div className="motor-diagram-wrap">
          <svg
            className="motor-diagram"
            viewBox="0 0 340 250"
            role="img"
            aria-label="Esquema didático de componentes de um motor"
          >
            <defs>
              <linearGradient id="motor-metal" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0" stopColor="#526579" />
                <stop offset="1" stopColor="#26384a" />
              </linearGradient>
            </defs>
            <path className="motor-block" d="M56 82h27V45h113v28h32v30h20v73h-28v29H83v-25H56z" />
            <path
              className={`motor-head motor-part${componenteAtivo.id === 'valvulas' ? ' selecionada' : ''}`}
              d="M84 36h120v42H84z"
            />
            <rect
              className={`motor-cylinder motor-part${componenteAtivo.id === 'cilindro' ? ' selecionada' : ''}`}
              x="103"
              y="78"
              width="30"
              height="91"
              rx="5"
            />
            <rect
              className={`motor-piston motor-part${componenteAtivo.id === 'pistao' ? ' selecionada' : ''}`}
              x="106"
              y="131"
              width="24"
              height="25"
              rx="4"
            />
            <path
              className={`motor-valves motor-part${componenteAtivo.id === 'valvulas' ? ' selecionada' : ''}`}
              d="M103 52v22m30-22v22m-34-22h8m22 0h8"
            />
            <path
              className={`motor-radiator motor-part${componenteAtivo.id === 'radiador' ? ' selecionada' : ''}`}
              d="M278 74h34v82h-34z"
            />
            <path className="motor-pipe" d="M204 91c26 0 33-4 38-17h36v22h-30c-7 12-18 17-44 17" />
            <circle
              className={`motor-alternator motor-part${componenteAtivo.id === 'alternador' ? ' selecionada' : ''}`}
              cx="215"
              cy="188"
              r="20"
            />
            <circle
              className={`motor-filter motor-part${componenteAtivo.id === 'filtro' ? ' selecionada' : ''}`}
              cx="151"
              cy="205"
              r="10"
            />
            <circle
              className={`motor-turbo motor-part${componenteAtivo.id === 'turbo' ? ' selecionada' : ''}`}
              cx="213"
              cy="74"
              r="14"
            />
            <path className="motor-belt" d="M215 168c26-3 29-20 19-36M196 184c-12 5-23 13-34 12" />
            <path className="motor-crank" d="M99 181h97m-75-7 18 14m-18 0 18-14m12 7 18 14m-18 0 18-14" />

            {COMPONENTES_MOTOR.map((componente) => {
              const ativo = componenteAtivo.id === componente.id;
              return (
                <g
                  key={componente.id}
                  className={`motor-hotspot${ativo ? ' ativo' : ''}`}
                  onClick={() => setComponenteAtivo(componente)}
                  role="button"
                  tabIndex="0"
                  aria-label={componente.nome}
                  aria-pressed={ativo}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setComponenteAtivo(componente);
                    }
                  }}
                >
                  <circle className="motor-hotspot-ring" cx={componente.x} cy={componente.y} r="12" />
                  <circle className="motor-hotspot-dot" cx={componente.x} cy={componente.y} r="4" />
                </g>
              );
            })}
          </svg>
          <div className="motor-legend">
            {COMPONENTES_MOTOR.map((componente) => (
              <button
                type="button"
                key={componente.id}
                className={componenteAtivo.id === componente.id ? 'ativa' : ''}
                onClick={() => setComponenteAtivo(componente)}
              >
                {componente.nome}
              </button>
            ))}
          </div>
        </div>
        <article className="motor-component-info" aria-live="polite">
          <span className="motor-component-number">
            {String(COMPONENTES_MOTOR.findIndex((item) => item.id === componenteAtivo.id) + 1).padStart(2, '0')}
          </span>
          <h4>{componenteAtivo.nome}</h4>
          <p>{componenteAtivo.descricao}</p>
          <span className="motor-info-caption">Componente selecionado no esquema</span>
        </article>
      </div>
    </section>
  );
}

// UI19 (peças): staff gere catálogo de peças e stock.
export default function Pecas() {
  const feedback = useFeedback();
  const [pecas, setPecas] = useState(null);
  const [erro, setErro] = useState('');
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [preco, setPreco] = useState('');
  const [stock, setStock] = useState('0');
  const [aGuardar, setAGuardar] = useState(false);
  const [idEdicao, setIdEdicao] = useState(null);
  const [idAcao, setIdAcao] = useState(null);

  async function carregar() {
    try {
      setPecas(await api('GET', '/pecas'));
      setErro('');
    } catch (err) {
      setErro(err.message);
    }
  }
  useEffect(() => { carregar(); }, []);

  function limparFormulario() {
    setNome('');
    setDescricao('');
    setPreco('');
    setStock('0');
    setIdEdicao(null);
  }

  function editar(peca) {
    setIdEdicao(peca.id);
    setNome(peca.nome);
    setDescricao(peca.descricao ?? '');
    setPreco(String(peca.precoUnitario));
    setStock(String(peca.quantidadeStock));
    setErro('');
  }

  async function guardar(e) {
    e.preventDefault();
    setAGuardar(true);
    setErro('');
    try {
      const body = {
        nome,
        descricao: descricao.trim() || null,
        precoUnitario: preco,
        quantidadeStock: Number(stock),
      };
      if (idEdicao) {
        await api('PATCH', `/pecas/${idEdicao}`, { body });
      } else {
        await api('POST', '/pecas', { body });
      }
      limparFormulario();
      await carregar();
    } catch (err) {
      setErro(err.message || 'Não foi possível guardar a peça.');
    } finally {
      setAGuardar(false);
    }
  }

  async function apagar(peca) {
    const confirmado = await feedback.confirmar({
      titulo: 'Apagar peça',
      mensagem: `Apagar a peça "${peca.nome}"? As linhas e os preços históricos das OS serão preservados.`,
      textoConfirmar: 'Apagar peça',
      perigo: true,
    });
    if (!confirmado) return;

    setIdAcao(peca.id);
    setErro('');
    try {
      await api('DELETE', `/pecas/${peca.id}`);
      if (String(idEdicao) === String(peca.id)) limparFormulario();
      await carregar();
    } catch (err) {
      setErro(err.message || 'Não foi possível apagar a peça.');
    } finally {
      setIdAcao(null);
    }
  }

  async function alternarAtivo(peca) {
    setIdAcao(peca.id);
    setErro('');
    try {
      await api('PATCH', `/pecas/${peca.id}`, { body: { ativo: !peca.ativo } });
      await carregar();
    } catch (err) {
      setErro(err.message || 'Não foi possível atualizar o estado da peça.');
    } finally {
      setIdAcao(null);
    }
  }

  if (pecas === null) {
    return erro
      ? <p className="erro" role="alert">Falha ao carregar peças: {erro}</p>
      : <p>A carregar…</p>;
  }

  return (
    <section>
      <h2>Gestão de peças</h2>
      <MotorDidatico />
      <form className="cartao form-servico" onSubmit={guardar}>
        <h3>{idEdicao ? 'Editar peça' : 'Nova peça'}</h3>
        <label htmlFor="nomePeca">Nome</label>
        <input id="nomePeca" value={nome} onChange={(e) => setNome(e.target.value)} required />
        <label htmlFor="descricaoPeca">Descrição (opcional)</label>
        <input id="descricaoPeca" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        <label htmlFor="precoPeca">Preço unitário (MZN)</label>
        <input id="precoPeca" type="number" min="0" step="0.01" value={preco} onChange={(e) => setPreco(e.target.value)} required />
        <label htmlFor="stockPeca">Stock inicial</label>
        <input id="stockPeca" type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} required />
        <button className="botao" type="submit" disabled={aGuardar}>
          {aGuardar ? 'A guardar…' : idEdicao ? 'Guardar alterações' : 'Criar peça'}
        </button>
        {idEdicao && (
          <button type="button" className="botao botao-secundario" onClick={limparFormulario} disabled={aGuardar}>
            Cancelar edição
          </button>
        )}
      </form>

      {erro && <p className="erro" role="alert">{erro}</p>}
      {pecas.length === 0 ? (
        <p className="vazio">Sem peças registadas.</p>
      ) : (
        <table className="tabela">
          <thead>
            <tr><th>Nome</th><th>Preço un.</th><th>Stock</th><th>Estado</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {pecas.map((p) => (
              <tr key={p.id}>
                <td>{p.nome}</td>
                <td>{Number(p.precoUnitario).toFixed(2)} MZN</td>
                <td className={p.quantidadeStock === 0 ? 'erro' : ''}>{p.quantidadeStock}</td>
                <td>{p.ativo ? 'Ativa' : 'Inativa'}</td>
                <td className="acoes-tabela">
                  <button type="button" className="botao botao-secundario" onClick={() => editar(p)} disabled={idAcao !== null}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className={`botao ${p.ativo ? 'botao-perigo' : 'botao-secundario'}`}
                    onClick={() => alternarAtivo(p)}
                    disabled={idAcao === p.id}
                  >
                    {idAcao === p.id ? 'A atualizar…' : p.ativo ? 'Desativar' : 'Ativar'}
                  </button>
                  <button
                    type="button"
                    className="botao botao-perigo"
                    onClick={() => apagar(p)}
                    disabled={idAcao === p.id}
                  >
                    {idAcao === p.id ? 'A apagar…' : 'Apagar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}