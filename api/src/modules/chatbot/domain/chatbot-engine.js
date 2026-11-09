import { OFICINA, fmtMoeda } from './oficina-config.js';

const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();

const tem = (t, ...palavras) => palavras.some((p) => t.includes(norm(p)));
const primeiroNome = (nome) => String(nome ?? '').trim().split(/\s+/)[0] || '';

export const MENU = [
  { label: '🔧 Ver serviços', value: 'ver serviços' },
  { label: '🧩 Ver peças', value: 'ver peças' },
  { label: '💰 Pedir orçamento', value: 'pedir orçamento' },
  { label: '🕒 Horário e local', value: 'horário' },
  { label: '🚚 Taxa de entrega', value: 'taxa entrega' },
  { label: '👤 Falar com funcionário', value: 'falar com funcionário' },
];

export const OPCOES_DIAGNOSTICO = [
  { label: '✅ Quero fazer diagnóstico', value: 'quero diagnostico' },
  { label: '❌ Não quero diagnóstico', value: 'nao quero diagnostico' },
  { label: '👤 Falar com funcionário', value: 'falar com funcionário' },
];

// ★ Fase 3B — chegada do veículo À oficina (pré-OS). NÃO é a entrega final.
export const OPCOES_CHEGADA = [
  { label: '🚗 Vou levar eu próprio à oficina', value: 'LEVAR_OFICINA' },
  { label: '🏠 Quero que a oficina vá buscar o carro', value: 'RECOLHA_DOMICILIO' },
];

const res = ({ atualizar = {}, resposta, metadata = {} }) => ({
  atualizar,
  resposta,
  metadata,
});

function humano() {
  return res({
    atualizar: { status: 'EM_ATENDIMENTO', etapa: 'HUMANO' },
    resposta:
      'Vou encaminhar a tua conversa para um funcionário. ' +
      'Ele verá o histórico completo e continua contigo por aqui.',
    metadata: { badge: 'EM_ATENDIMENTO' },
  });
}

function saudacao(cliente) {
  const nome = primeiroNome(cliente?.nome);
  return (
    `Olá${nome ? `, ${nome}` : ''}! 👋\n` +
    `Sou o assistente virtual da ${OFICINA.nome}.\n` +
    'Posso ajudar com serviços, peças, orçamento, agendamento de diagnóstico e chegada do carro à oficina.\n\n' +
    'O que pretendes fazer?'
  );
}

function listarServicos(servicos) {
  if (!servicos.length) return 'De momento não tenho serviços ativos para listar.';

  const linhas = servicos
    .slice(0, 8)
    .map((s) => `• ${s.nome} — ${fmtMoeda(s.preco_base)}`)
    .join('\n');

  return `Estes são alguns serviços disponíveis:\n\n${linhas}\n\nQueres pedir orçamento para algum?`;
}

function listarPecas(pecas) {
  if (!pecas.length) return 'De momento não tenho peças disponíveis para listar.';

  const linhas = pecas
    .slice(0, 8)
    .map((p) => `• ${p.nome} — ${fmtMoeda(p.preco_unitario)} (stock: ${p.quantidade_stock})`)
    .join('\n');

  return `Estas são algumas peças disponíveis:\n\n${linhas}`;
}

const veiculoLabel = (v) => `${v.matricula} · ${v.marca} ${v.modelo}`.trim();

const quickVeiculos = (veiculos) =>
  veiculos.map((v) => ({
    label: veiculoLabel(v),
    value: `veiculo:${v.id}`,
  }));

function encontrarUnico(t, itens) {
  const matches = (itens ?? []).filter((i) => {
    const nome = norm(i.nome);
    if (!nome) return false;
    if (t === nome) return true;

    return nome
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .some((w) => t.includes(w));
  });

  return matches.length === 1 ? matches[0] : null;
}

function estimarProblema({ problema, servicos, pecas }) {
  const t = norm(problema);
  const servico = encontrarUnico(t, servicos);
  const peca = encontrarUnico(t, pecas);

  if (servico && peca) return null;
  if (servico) return { tipo: 'servico', item: servico, valor: Number(servico.preco_base) };
  if (peca) return { tipo: 'peca', item: peca, valor: Number(peca.preco_unitario) };

  return null;
}

export function processarMensagem({ texto, conversa, cliente, veiculos, servicos, pecas }) {
  const t = norm(texto);
  const etapa = conversa.etapa || 'INICIO';

  // Pedido global de humano.
  if (tem(t, 'funcionario', 'atendente', 'humano', 'falar com pessoa', 'ajuda humana')) {
    return humano();
  }

  // Início / saudação.
  if (
    etapa === 'INICIO' ||
    !t ||
    tem(t, 'oi', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'inicio', 'comecar')
  ) {
    return res({
      atualizar: { etapa: 'MENU' },
      resposta: saudacao(cliente),
      metadata: { quickReplies: MENU },
    });
  }

  // Menu principal.
  if (etapa === 'MENU') {
    if (tem(t, 'ver servicos', 'servicos')) {
      return res({
        atualizar: { etapa: 'MENU' },
        resposta: listarServicos(servicos),
        metadata: { quickReplies: MENU },
      });
    }

    if (tem(t, 'ver pecas', 'pecas')) {
      return res({
        atualizar: { etapa: 'MENU' },
        resposta: listarPecas(pecas),
        metadata: { quickReplies: MENU },
      });
    }

    if (tem(t, 'horario', 'local', 'morada', 'onde estao')) {
      return res({
        atualizar: { etapa: 'MENU' },
        resposta:
          `🕒 Horário: ${OFICINA.horario}\n` +
          `📍 Local: ${OFICINA.morada}\n` +
          `📞 Telefone: ${OFICINA.telefone}\n` +
          `✉️ E-mail: ${OFICINA.email}`,
        metadata: { quickReplies: MENU },
      });
    }

    if (tem(t, 'taxa entrega', 'entrega', 'domicilio')) {
      return res({
        atualizar: { etapa: 'MENU' },
        resposta:
          `🚚 Entrega final ao domicílio (após reparação): ${fmtMoeda(OFICINA.taxaDomicilio)}.\n` +
          'Levantamento na oficina: grátis.\n\n' +
          'Para já, no orçamento, o que interessa é como o carro CHEGA à oficina.',
        metadata: { quickReplies: MENU },
      });
    }

    if (tem(t, 'pedir orcamento', 'orcamento', 'preco')) {
      if (!veiculos.length) {
        return res({
          atualizar: { etapa: 'MENU' },
          resposta:
            'Não encontrei veículos registados no teu perfil. ' +
            'Regista um veículo ou fala com um funcionário.',
          metadata: { quickReplies: MENU },
        });
      }

      if (veiculos.length === 1) {
        return res({
          atualizar: {
            etapa: 'DESCRIVER_PROBLEMA',
            veiculoId: veiculos[0].id,
          },
          resposta:
            `Perfeito. Vamos usar o veículo ${veiculoLabel(veiculos[0])}.\n\n` +
            'Descreve o problema que o carro apresenta.',
          metadata: {},
        });
      }

      return res({
        atualizar: { etapa: 'ESCOLHER_VEICULO' },
        resposta: 'Qual veículo queres analisar?',
        metadata: { quickReplies: quickVeiculos(veiculos) },
      });
    }

    if (conversa.veiculoId) {
      return res({
        atualizar: {
          etapa: 'DESCRIVER_PROBLEMA',
          problema: texto,
        },
        resposta: 'Ok, estou a analisar o problema...',
        metadata: {},
      });
    }

    return res({
      atualizar: { etapa: 'MENU' },
      resposta:
        'Não percebi. Posso ajudar com serviços, peças, orçamento, horário, entrega ou encaminhar para funcionário.',
      metadata: { quickReplies: MENU },
    });
  }

  // Escolher veículo.
  if (etapa === 'ESCOLHER_VEICULO') {
    let veiculo = null;

    if (t.startsWith('veiculo:')) {
      const id = Number(t.split(':')[1]);
      veiculo = veiculos.find((v) => Number(v.id) === id);
    } else {
      veiculo = veiculos.find((v) => norm(veiculoLabel(v)) === t);
    }

    if (!veiculo) {
      return res({
        atualizar: { etapa: 'ESCOLHER_VEICULO' },
        resposta: 'Escolhe um dos veículos listados.',
        metadata: { quickReplies: quickVeiculos(veiculos) },
      });
    }

    return res({
      atualizar: {
        etapa: 'DESCRIVER_PROBLEMA',
        veiculoId: veiculo.id,
      },
      resposta:
        `Veículo selecionado: ${veiculoLabel(veiculo)}.\n\n` +
        'Agora descreve o problema do carro.',
      metadata: {},
    });
  }

  // Descrever problema.
  if (etapa === 'DESCRIVER_PROBLEMA') {
    const problema = String(texto ?? '').trim();

    if (problema.length < 5) {
      return res({
        atualizar: { etapa: 'DESCRIVER_PROBLEMA' },
        resposta: 'Podes descrever o problema com um pouco mais de detalhe?',
        metadata: {},
      });
    }

    const est = estimarProblema({ problema, servicos, pecas });

    if (!est) {
      return res({
        atualizar: {
          etapa: 'HUMANO',
          status: 'EM_ATENDIMENTO',
          problema,
        },
        resposta:
          'Este problema precisa de análise humana. ' +
          'Vou encaminhar a conversa para um funcionário com o histórico completo.',
        metadata: { badge: 'EM_ATENDIMENTO' },
      });
    }

    const tipoTexto = est.tipo === 'servico' ? 'serviço' : 'peça';

    return res({
      atualizar: {
        etapa: 'ORCAMENTO',
        problema,
        orcamentoEstimado: est.valor,
      },
      resposta:
        `Com base na descrição, encontrei este ${tipoTexto}: ${est.item.nome}.\n\n` +
        `Estimativa base: ${fmtMoeda(est.valor)}.\n\n` +
        'Nota: o valor final pode mudar após diagnóstico técnico.\n\n' +
        'Queres fazer o diagnóstico técnico ou ficar apenas pelo orçamento?',
      metadata: {
        quickReplies: OPCOES_DIAGNOSTICO,
      },
    });
  }

  // Orçamento apresentado → decidir diagnóstico.
  if (etapa === 'ORCAMENTO') {
    // ★ IMPORTANTE: avaliar primeiro o "não quero", porque
    // "nao quero diagnostico" contém a substring "quero diagnostico".
    const naoDiag =
      t === 'nao quero diagnostico' ||
      tem(
        t,
        'nao quero',
        'sem diagnostico',
        'apenas orcamento',
        'so orcamento',
        'nao preciso',
        'nao necessito',
        'ficar so pelo orcamento',
        'nao fazer diagnostico',
      );

    const querDiag =
      !naoDiag &&
      (t === 'quero diagnostico' ||
        tem(t, 'quero diagnostico', 'fazer diagnostico', 'agendar', 'marcar', 'sim, quero'));

    if (querDiag) {
      return res({
        atualizar: {
          etapa: 'AGENDAR',
          querDiagnostico: true,
        },
        resposta: 'Ótimo. Vou mostrar apenas os horários disponíveis para diagnóstico.',
        metadata: { precisaSlots: true },
      });
    }

    if (naoDiag) {
      return res({
        atualizar: {
          etapa: 'SEM_DIAGNOSTICO',
          status: 'AGUARDANDO_FUNCIONARIO',
          querDiagnostico: false,
        },
        resposta:
          'Sem problema. Vou registar que não queres diagnóstico.\n\n' +
          'Um funcionário pode confirmar/encerrar a conversa. ' +
          'Esta conversa ficará guardada por 24 horas e depois será eliminada automaticamente, ' +
          'a menos que seja convertida em ordem de serviço.',
        metadata: {
          badge: 'AGUARDANDO_FUNCIONARIO',
          semDiagnostico: true,
          quickReplies: [
            { label: '👤 Falar com funcionário', value: 'falar com funcionário' },
          ],
        },
      });
    }

    return res({
      atualizar: { etapa: 'ORCAMENTO' },
      resposta: 'Queres fazer o diagnóstico técnico ou ficar apenas pelo orçamento?',
      metadata: { quickReplies: OPCOES_DIAGNOSTICO },
    });
  }

  // Cliente mudou de ideias depois de dizer que não queria diagnóstico.
  if (etapa === 'SEM_DIAGNOSTICO') {
    const naoDiag =
      tem(t, 'nao quero', 'sem diagnostico', 'apenas orcamento', 'so orcamento');

    const querDiag =
      !naoDiag &&
      (t === 'quero diagnostico' ||
        tem(t, 'quero diagnostico', 'agendar', 'mudar de ideias', 'final quero', 'sim'));

    if (querDiag) {
      return res({
        atualizar: {
          etapa: 'AGENDAR',
          querDiagnostico: true,
        },
        resposta: 'Perfeito. Vou mostrar os horários disponíveis para diagnóstico.',
        metadata: { precisaSlots: true },
      });
    }

    return res({
      atualizar: { etapa: 'SEM_DIAGNOSTICO' },
      resposta:
        'A conversa está registada como sem diagnóstico. ' +
        'Podes falar com um funcionário se quiseres mudar de ideias.',
      metadata: {
        quickReplies: [
          { label: '✅ Quero fazer diagnóstico', value: 'quero diagnostico' },
          { label: '👤 Falar com funcionário', value: 'falar com funcionário' },
        ],
      },
    });
  }

  // Agendamento.
  if (etapa === 'AGENDAR') {
    return res({
      atualizar: { etapa: 'AGENDAR' },
      resposta: 'Escolhe uma das datas/horários apresentados nos botões.',
      metadata: { precisaSlots: true },
    });
  }

  // ★ Fase 3B — chegada À oficina (pré-OS).
  if (etapa === 'CHEGADA_OFICINA') {
    return res({
      atualizar: { etapa: 'CHEGADA_OFICINA' },
      resposta:
        'Escolhe uma das opções abaixo para eu registar como o veículo vai chegar à oficina.',
      metadata: { chegada: OPCOES_CHEGADA },
    });
  }

  // Resumo / lead pronto.
  if (etapa === 'RESUMO') {
    if (tem(t, 'obrigado', 'valeu', 'ok')) {
      return res({
        atualizar: { etapa: 'RESUMO' },
        resposta: 'De nada! O funcionário vai analisar e criar a ordem de serviço.',
        metadata: {},
      });
    }

    return res({
      atualizar: { etapa: 'RESUMO' },
      resposta: 'Os dados já foram guardados para o funcionário converter em OS.',
      metadata: {},
    });
  }

  // Atendimento humano.
  if (etapa === 'HUMANO') {
    return res({
      atualizar: {
        etapa: 'HUMANO',
        status: 'EM_ATENDIMENTO',
      },
      resposta: 'A conversa está com um funcionário. Podes continuar a escrever aqui.',
      metadata: { badge: 'EM_ATENDIMENTO' },
    });
  }

  // Fallback.
  return res({
    atualizar: { etapa: 'MENU' },
    resposta: 'Não percebi. Queres ver serviços, pedir orçamento ou falar com funcionário?',
    metadata: { quickReplies: MENU },
  });
}