import { useEffect, useMemo, useRef, useState } from 'react';

const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();

export default function CampoCatalogoOuCustom({
  label,
  options = [],
  value,
  onChange,
  placeholder = 'Pesquisar no catálogo ou escrever...',
  moeda = 'MZN',
  mostrarPreco = true,
  disabled = false,
}) {
  const [query, setQuery] = useState(value?.nome ?? '');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    setQuery(value?.nome ?? '');
  }, [value?.nome, value?.id]);

  useEffect(() => {
    function onPointerDown(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = norm(query);
    if (!q) return options.slice(0, 30);

    return options
      .filter((o) => norm(o.nome).includes(q))
      .slice(0, 30);
  }, [query, options]);

  const selectedIsCatalog =
    value?.id != null &&
    options.some((o) => String(o.id) === String(value.id));

  const exactCatalog = useMemo(() => {
    const q = norm(query);
    if (!q) return null;
    return options.find((o) => norm(o.nome) === q) ?? null;
  }, [query, options]);

  const canCreateCustom =
    String(query ?? '').trim().length >= 2 && !selectedIsCatalog;

  function escolherCatalogo(item) {
    onChange({
      id: item.id,
      nome: item.nome,
      preco: mostrarPreco
        ? Number(item.preco ?? item.preco_base ?? item.preco_unitario ?? 0)
        : 0,
      custom: false,
    });
    setOpen(false);
  }

  function criarPersonalizado() {
    const nome = String(query ?? '').trim();
    if (!nome) return;

    onChange({
      id: null,
      nome,
      preco: 0,
      custom: true,
    });

    setOpen(false);
  }

  function confirmarEnter(event) {
    if (event.key !== 'Enter') return;

    event.preventDefault();

    // Se existe match exacto no catálogo, usa catálogo.
    if (exactCatalog) {
      escolherCatalogo(exactCatalog);
      return;
    }

    // Se só existe uma sugestão parcial, também pode ser útil escolher.
    if (filtered.length === 1) {
      escolherCatalogo(filtered[0]);
      return;
    }

    // Caso contrário, se o texto for razoável, cria personalizado.
    if (canCreateCustom) {
      criarPersonalizado();
      return;
    }

    // Se não houver nada válido, fecha dropdown.
    setOpen(false);
  }

  return (
    <div className="campo-catalogo-wrapper" ref={wrapRef}>
      {label && <label className="campo-catalogo-label">{label}</label>}

      <div className="campo-catalogo-input-row">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={confirmarEnter}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
        />

        {value?.custom && (
          <span className="badge-personalizado">personalizado</span>
        )}
      </div>

      {open && !disabled && (
        <ul className="dropdown-catalogo">
          {filtered.length === 0 && !canCreateCustom && (
            <li className="dropdown-vazio">
              Sem resultados. Escreve pelo menos 2 caracteres para criar item personalizado.
            </li>
          )}

          {filtered.map((o) => {
            const preco = Number(
              o.preco ?? o.preco_base ?? o.preco_unitario ?? 0,
            );

            return (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => escolherCatalogo(o)}
                >
                  <strong>{o.nome}</strong>
                  {mostrarPreco && (
                    <span>
                      {preco.toFixed(2)} {moeda}
                    </span>
                  )}
                </button>
              </li>
            );
          })}

          {canCreateCustom && (
            <li>
              <button
                type="button"
                className="dropdown-custom"
                onClick={criarPersonalizado}
              >
                ➕ Usar “{String(query).trim()}” como item personalizado
              </button>
            </li>
          )}
        </ul>
      )}

      <small className="hint">
        Dica: para item personalizado, escreve o nome e prima Enter ou clica na opção “➕”.
      </small>
    </div>
  );
}