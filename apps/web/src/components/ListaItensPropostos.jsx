import CampoCatalogoOuCustom from './CampoCatalogoOuCustom.jsx';
import { IconPlus, IconTrash } from './icons.jsx';

export default function ListaItensPropostos({
  titulo,
  subtitle,
  tipo,
  options = [],
  itens = [],
  onChange,
  moeda = 'MZN',
  mostrarPreco = true,
  disabled = false,
}) {
  function atualizarItem(index, patch) {
    const novos = [...itens];
    novos[index] = { ...novos[index], ...patch };
    onChange(novos);
  }

  function removerItem(index) {
    onChange(itens.filter((_, i) => i !== index));
  }

  function addItem() {
    onChange([
      ...itens,
      { id: null, nome: '', preco: 0, quantidade: 1, custom: true, tipo },
    ]);
  }

  const total = itens.reduce((soma, item) => {
    const preco = Number(item.preco ?? 0);
    const qtd = Number(item.quantidade ?? 1);
    return soma + preco * qtd;
  }, 0);

  return (
    <section className="cartao lista-itens">
      <div className="lista-itens-cabecalho">
        <div>
          <h3>{titulo}</h3>
          {subtitle && <p className="hint">{subtitle}</p>}
        </div>
        <button
          type="button"
          className="botao botao-secundario"
          onClick={addItem}
          disabled={disabled}
        >
          <IconPlus /> Adicionar
        </button>
      </div>

      {itens.length === 0 ? (
        <p className="vazio">
          Nenhum item. Podes escolher do catálogo ou escrever um item personalizado.
        </p>
      ) : (
        <div className="lista-itens-itens">
          {itens.map((item, index) => {
            const preco = Number(item.preco ?? 0);
            const qtd = Number(item.quantidade ?? 1);
            const subtotal = preco * qtd;

            return (
              <div key={`${tipo}-${index}`} className="item-proposto-row">
                <div className="item-proposto-main">
                  <CampoCatalogoOuCustom
                    label={tipo === 'SERVICO' ? 'Serviço' : 'Peça'}
                    options={options}
                    value={item}
                    onChange={(novo) => atualizarItem(index, novo)}
                    disabled={disabled}
                    moeda={moeda}
                    mostrarPreco={mostrarPreco}
                  />
                </div>

                <div className="item-proposto-nums">
                  <label>
                    Qtd.
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantidade ?? 1}
                      onChange={(e) =>
                        atualizarItem(index, {
                          quantidade: Math.max(1, Number(e.target.value || 1)),
                        })
                      }
                      disabled={disabled}
                    />
                  </label>

                  {mostrarPreco && (
                    <label>
                      Preço unit.
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.preco ?? 0}
                        onChange={(e) =>
                          atualizarItem(index, {
                            preco: Math.max(0, Number(e.target.value || 0)),
                          })
                        }
                        disabled={disabled}
                      />
                    </label>
                  )}

                  {mostrarPreco && (
                    <div className="item-subtotal">
                      <small>Subtotal</small>
                      <strong>
                        {subtotal.toFixed(2)} {moeda}
                      </strong>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="botao botao-perigo item-remover"
                  onClick={() => removerItem(index)}
                  disabled={disabled}
                  title="Remover item"
                  aria-label="Remover item"
                >
                  <IconTrash />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {mostrarPreco && (
        <div className="lista-itens-total">
          <strong>Total estimado desta lista:</strong>
          <span>
            {total.toFixed(2)} {moeda}
          </span>
        </div>
      )}
    </section>
  );
}