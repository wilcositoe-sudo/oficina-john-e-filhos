import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { OFICINA_WEB } from '../lib/oficina.js';

const COORDENADAS_OFICINA = OFICINA_WEB.coordenadas;
const ESTADOS_ATIVOS = new Set([
  'CONCLUIDA',
  'PAGA',
  'PENDENTE',
  'AGUARDANDO_DIAGNOSTICO',
  'EM_DIAGNOSTICO',
  'AGUARDANDO_PRECO_FUNCIONARIO',
  'AGUARDANDO_APROVACAO_CLIENTE',
  'AGUARDANDO_VALIDACAO_FUNCIONARIO',
  'AGUARDANDO_ATRIBUICAO_REPARACAO',
  'AGUARDANDO_REPARACAO',
  'EM_REPARACAO',
  'AGUARDANDO_PECAS',
]);

function urlMapa(lat, lng) {
  const margem = 0.025;
  const parametros = new URLSearchParams({
    bbox: `${lng - margem},${lat - margem},${lng + margem},${lat + margem}`,
    layer: 'mapnik',
    marker: `${lat},${lng}`,
  });
  return `https://www.openstreetmap.org/export/embed.html?${parametros}`;
}

function urlRota(origem, destino) {
  if (!origem) {
    return `https://www.openstreetmap.org/?mlat=${destino.lat}&mlon=${destino.lng}#map=16/${destino.lat}/${destino.lng}`;
  }
  const rota = `${origem.lat},${origem.lng};${destino.lat},${destino.lng}`;
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${encodeURIComponent(rota)}`;
}

function montarEndereco(conversa) {
  return [
    conversa.chegadaBairro,
    conversa.chegadaQuarteirao && `Quarteirão ${conversa.chegadaQuarteirao}`,
    conversa.chegadaNumeroCasa && `Casa ${conversa.chegadaNumeroCasa}`,
    conversa.chegadaPontoReferencia && `Referência: ${conversa.chegadaPontoReferencia}`,
  ].filter(Boolean).join(', ');
}

function eCoordenadaValida(lat, lng) {
  return lat !== null
    && lat !== undefined
    && lat !== ''
    && lng !== null
    && lng !== undefined
    && lng !== ''
    && Number.isFinite(Number(lat))
    && Number.isFinite(Number(lng))
    && Number(lat) >= -90
    && Number(lat) <= 90
    && Number(lng) >= -180
    && Number(lng) <= 180;
}

export default function Mapa({ utilizador }) {
  const [alvos, setAlvos] = useState([]);
  const [alvoSelecionado, setAlvoSelecionado] = useState(null);
  const [localizacao, setLocalizacao] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(utilizador.perfil !== 'CLIENTE');
  const [atualizacaoAtiva, setAtualizacaoAtiva] = useState(false);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null);
  const watchId = useRef(null);

  const isMecanico = utilizador.perfil === 'MECANICO';
  const isStaff = ['FUNCIONARIO', 'ADMINISTRADOR'].includes(utilizador.perfil);
  const eCliente = utilizador.perfil === 'CLIENTE';

  useEffect(() => {
    let ativo = true;
    if (eCliente) {
      return () => { ativo = false; };
    }

    async function carregarAlvos() {
      setErro('');
      try {
        const ordens = await api('GET', isMecanico ? '/ordens/minhas' : '/ordens');
        const entregas = (Array.isArray(ordens) ? ordens : [])
          .filter((ordem) => ordem.modalidadeEntrega === 'DOMICILIO'
            && ESTADOS_ATIVOS.has(ordem.estado)
            && String(ordem.enderecoEntrega ?? '').trim())
          .map((ordem) => ({
            id: `os-${ordem.id}`,
            titulo: `Entrega · ${ordem.numeroOS || `OS #${ordem.id}`}`,
            endereco: ordem.enderecoEntrega,
            lat: ordem.entregaLat,
            lng: ordem.entregaLng,
            detalhe: `Estado: ${String(ordem.estado).replace(/_/g, ' ').toLowerCase()}`,
          }));

        let recolhas = [];
        if (isStaff) {
          const conversas = await api('GET', '/chatbot/staff/conversas');
          recolhas = (Array.isArray(conversas) ? conversas : [])
            .filter((conversa) => conversa.chegadaModalidade === 'RECOLHA_DOMICILIO')
            .map((conversa) => ({
              id: `chat-${conversa.id}`,
              titulo: `Recolha · ${conversa.nomeCliente || `Conversa #${conversa.id}`}`,
              endereco: montarEndereco(conversa) || 'Endereço indicado na conversa',
              lat: conversa.chegadaLat,
              lng: conversa.chegadaLng,
              detalhe: conversa.osId ? `Associada à OS #${conversa.osId}` : 'Recolha solicitada pelo cliente',
            }));
        }

        if (ativo) {
          const lista = [...entregas, ...recolhas];
          setAlvos(lista);
          setAlvoSelecionado((atual) => lista.find((item) => item.id === atual?.id) ?? lista[0] ?? null);
        }
      } catch (error) {
        if (ativo) setErro(error.message || 'Não foi possível carregar os endereços de recolha e entrega.');
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    carregarAlvos();
    return () => { ativo = false; };
  }, [eCliente, isMecanico, isStaff]);

  useEffect(() => () => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
  }, []);

  function alternarLocalizacao() {
    if (atualizacaoAtiva) {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
      setAtualizacaoAtiva(false);
      return;
    }
    if (!navigator.geolocation) {
      setErro('Este navegador não disponibiliza geolocalização.');
      return;
    }

    setErro('');
    watchId.current = navigator.geolocation.watchPosition(
      (posicao) => {
        setLocalizacao({
          lat: posicao.coords.latitude,
          lng: posicao.coords.longitude,
          precisao: posicao.coords.accuracy,
        });
        setUltimaAtualizacao(new Date());
      },
      (error) => {
        const mensagens = {
          1: 'A localização não foi autorizada. Pode ativá-la nas permissões do navegador.',
          2: 'Não foi possível determinar a localização deste dispositivo.',
          3: 'A localização demorou demasiado tempo. Tente novamente.',
        };
        setErro(mensagens[error.code] ?? 'Falha ao obter localização.');
        if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
        setAtualizacaoAtiva(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    setAtualizacaoAtiva(true);
  }

  const alvoComCoordenadas = useMemo(() => (
    alvoSelecionado && eCoordenadaValida(alvoSelecionado.lat, alvoSelecionado.lng)
      ? { lat: Number(alvoSelecionado.lat), lng: Number(alvoSelecionado.lng) }
      : null
  ), [alvoSelecionado]);

  const coordenadaMapa = localizacao
    ? { lat: Number(localizacao.lat.toFixed(3)), lng: Number(localizacao.lng.toFixed(3)) }
    : alvoComCoordenadas ?? COORDENADAS_OFICINA;
  const destino = eCliente
    ? COORDENADAS_OFICINA
    : alvoComCoordenadas;

  return (
    <section className="mapa-pagina">
      <header className="mapa-cabecalho">
        <div>
          <span className="landing-section-kicker">Localização e rotas</span>
          <h2>Mapa da oficina</h2>
          <p>{eCliente
            ? `Encontre a oficina ${OFICINA_WEB.morada} e planeie a sua rota.`
            : 'Consulte os endereços partilhados para recolhas e entregas pendentes.'}</p>
        </div>
        <button type="button" className={`botao ${atualizacaoAtiva ? 'botao-perigo' : ''}`} onClick={alternarLocalizacao}>
          {atualizacaoAtiva ? 'Parar atualização da minha posição' : 'Ativar atualização da minha posição'}
        </button>
      </header>

      <p className="mapa-privacidade">
        A posição deste dispositivo só é recolhida depois de autorizar o navegador e é usada apenas nesta sessão. Não é enviada nem guardada no servidor.
      </p>
      {eCliente && (
        <p className="mapa-referencia">
          O marcador da oficina usa o Mercado Municipal de Moatize como ponto de referência aproximado; confirme a localização exata junto da oficina.
        </p>
      )}
      {erro && <p className="erro" role="alert">{erro}</p>}

      {localizacao && (
        <p className="mapa-localizacao-status" role="status">
          Posição atualizada{ultimaAtualizacao ? ` às ${ultimaAtualizacao.toLocaleTimeString('pt-PT')}` : ''}
          {localizacao.precisao ? ` · precisão aproximada de ${Math.round(localizacao.precisao)} m` : ''}
        </p>
      )}

      <div className={`mapa-layout${eCliente ? ' mapa-layout-cliente' : ''}`}>
        {!eCliente && (
          <aside className="cartao mapa-lista">
            <div className="mapa-lista-titulo">
              <h3>Recolhas e entregas</h3>
              <span>{alvos.length}</span>
            </div>
            {carregando ? <p role="status">A carregar endereços…</p> : alvos.length === 0 ? (
              <p className="vazio">Não há recolhas ou entregas com endereço registado.</p>
            ) : (
              <ul>
                {alvos.map((alvo) => (
                  <li key={alvo.id}>
                    <button
                      type="button"
                      className={`mapa-alvo${alvoSelecionado?.id === alvo.id ? ' selecionado' : ''}`}
                      onClick={() => setAlvoSelecionado(alvo)}
                    >
                      <strong>{alvo.titulo}</strong>
                      <span>{alvo.endereco}</span>
                      <small>{alvo.detalhe}</small>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        )}

        <div className="cartao mapa-painel">
          <div className="mapa-painel-cabecalho">
            <div>
              <h3>{eCliente ? 'Direções para a oficina' : alvoSelecionado?.titulo || 'Localização da oficina'}</h3>
              <p>{eCliente ? OFICINA_WEB.morada : alvoSelecionado?.endereco || OFICINA_WEB.morada}</p>
            </div>
            {destino && (!eCliente || localizacao) && (
              <a
                className="botao botao-secundario"
                href={urlRota(localizacao ?? (eCliente ? null : COORDENADAS_OFICINA), destino)}
                target="_blank"
                rel="noreferrer"
              >
                Abrir rota
              </a>
            )}
            {eCliente && !localizacao && (
              <span className="mapa-rota-ajuda">Ative a localização para traçar a rota a partir daqui.</span>
            )}
          </div>
          {alvoSelecionado && !alvoComCoordenadas && (
            <p className="mapa-sem-coordenadas">
              Este endereço não tem coordenadas partilhadas.
              {alvoSelecionado.endereco && (
                <> <a href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(alvoSelecionado.endereco)}`} target="_blank" rel="noreferrer">Pesquisar endereço no OpenStreetMap</a>.</>
              )}
            </p>
          )}
          <iframe
            className="mapa-iframe"
            title={eCliente ? 'Mapa e localização da oficina' : 'Mapa da recolha ou entrega selecionada'}
            src={urlMapa(coordenadaMapa.lat, coordenadaMapa.lng)}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
          <footer className="mapa-creditos">
            <span>Mapa © OpenStreetMap contributors</span>
            {localizacao && <span>O marcador indica a posição atual deste dispositivo.</span>}
          </footer>
        </div>
      </div>
    </section>
  );
}
