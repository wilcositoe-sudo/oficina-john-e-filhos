import { erros } from '../../../shared/errors/domain-error.js';
import { processarMensagem, OPCOES_CHEGADA } from '../domain/chatbot-engine.js';
import {
  OFICINA,
  fmtMoeda,
  distanciaKm,
  tempoEstimadoMin,
} from '../domain/oficina-config.js';

const MAPUTO_OFFSET_MS = 2 * 60 * 60 * 1000; // Africa/Maputo = UTC+2, sem DST
const VINTE_E_QUATRO_HORAS_MS = 24 * 60 * 60 * 1000;

function expiraEm24h() {
  return new Date(Date.now() + VINTE_E_QUATRO_HORAS_MS).toISOString();
}

function gerarSlotsBase() {
  const slots = [];
  const agoraMaputo = new Date(Date.now() + MAPUTO_OFFSET_MS);

  for (let dia = 0; dia < OFICINA.diasAntecipacaoSlots; dia++) {
    const base = new Date(
      Date.UTC(
        agoraMaputo.getUTCFullYear(),
        agoraMaputo.getUTCMonth(),
        agoraMaputo.getUTCDate() + dia,
      ),
    );

    if (!OFICINA.diasFuncionamento.includes(base.getUTCDay())) continue;

    for (let hora = OFICINA.horaAbertura; hora < OFICINA.horaFechamento; hora++) {
      const maputoWall = new Date(
        Date.UTC(
          base.getUTCFullYear(),
          base.getUTCMonth(),
          base.getUTCDate(),
          hora,
          0,
          0,
        ),
      );

      const inicioUtc = new Date(maputoWall.getTime() - MAPUTO_OFFSET_MS);
      const fimUtc = new Date(inicioUtc.getTime() + OFICINA.duracaoSlotMinutos * 60 * 1000);

      if (inicioUtc.getTime() <= Date.now()) continue;

      slots.push({
        inicioAt: inicioUtc.toISOString(),
        fimAt: fimUtc.toISOString(),
        rotulo:
          maputoWall.toLocaleString('pt-PT', {
            timeZone: 'UTC',
            weekday: 'short',
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }) + ' (Maputo)',
      });
    }
  }

  return slots;
}

async function listarDisponiveis(chatRepo) {
  const base = gerarSlotsBase();
  if (!base.length) return [];

  const ocupados = await chatRepo.listarReservasEntre(
    base[0].inicioAt,
    base[base.length - 1].fimAt,
  );

  const ocupadoSet = new Set(
    ocupados.map((r) => new Date(r.inicio_at).toISOString()),
  );

  return base.filter((s) => !ocupadoSet.has(s.inicioAt));
}

export function criarIniciarConversa({ chatRepo }) {
  return async function iniciarConversa({ utilizador, nova = false }) {
    // Limpa conversas expiradas sem OS antes de reabrir/criar conversa.
    await chatRepo.apagarExpiradas();

    const cliente = await chatRepo.obterClientePorUtilizador(utilizador.id);

    const conversa = await chatRepo.garantirConversa({
      utilizadorId: utilizador.id,
      clienteId: cliente?.cliente_id ?? null,
      nome: cliente?.nome ?? utilizador.nome,
      email: cliente?.email ?? utilizador.email,
      telefone: cliente?.telefone ?? utilizador.telefone,
      nova,
    });

    let mensagens = await chatRepo.listarMensagens(conversa.id);

    if (mensagens.length === 0) {
      await chatRepo.criarMensagem({
        conversaId: conversa.id,
        remetente: 'BOT',
        conteudo:
          `Olá${cliente?.nome ? `, ${String(cliente.nome).split(' ')[0]}` : ''}! 👋\n` +
          `Sou o assistente virtual da ${OFICINA.nome}.\n` +
          'Posso ajudar com serviços, peças, orçamento, agendamento de diagnóstico e chegada do carro à oficina.',
        metadata: {
          quickReplies: [
            { label: '🔧 Ver serviços', value: 'ver serviços' },
            { label: '🧩 Ver peças', value: 'ver peças' },
            { label: '💰 Pedir orçamento', value: 'pedir orçamento' },
            { label: '🕒 Horário e local', value: 'horário' },
            { label: '🚚 Taxa de entrega', value: 'taxa entrega' },
            { label: '👤 Falar com funcionário', value: 'falar com funcionário' },
          ],
        },
      });

      await chatRepo.atualizarConversa({
        id: conversa.id,
        etapa: 'MENU',
      });

      mensagens = await chatRepo.listarMensagens(conversa.id);
    }

    return {
      conversa: await chatRepo.obterConversa(conversa.id),
      mensagens,
    };
  };
}

export function criarEnviarMensagemCliente({ chatRepo }) {
  return async function enviarMensagemCliente({ utilizador, conversaId, texto }) {
    await chatRepo.apagarExpiradas();

    const conteudo = String(texto ?? '').trim();
    if (!conteudo) throw erros.contaInternaInvalida('Mensagem vazia.');

    let conversa = conversaId ? await chatRepo.obterConversa(conversaId) : null;

    if (!conversa) {
      const cliente = await chatRepo.obterClientePorUtilizador(utilizador.id);

      conversa = await chatRepo.garantirConversa({
        utilizadorId: utilizador.id,
        clienteId: cliente?.cliente_id ?? null,
        nome: cliente?.nome ?? utilizador.nome,
        email: cliente?.email ?? utilizador.email,
        telefone: cliente?.telefone ?? utilizador.telefone,
      });
    }

    if (String(conversa.utilizadorId) !== String(utilizador.id)) {
      throw erros.naoAutorizado();
    }

    if (conversa.status === 'FECHADA' || conversa.status === 'CONVERTIDA') {
      throw erros.contaInternaInvalida(
        'Esta conversa foi encerrada. Inicia uma nova conversa.',
      );
    }

    await chatRepo.criarMensagem({
      conversaId: conversa.id,
      remetente: 'CLIENTE',
      remetenteId: utilizador.id,
      conteudo,
    });

    // Em atendimento humano ou aguardando funcionário, o bot não responde.
    if (
      conversa.status === 'EM_ATENDIMENTO' ||
      conversa.status === 'AGUARDANDO_FUNCIONARIO'
    ) {
      await chatRepo.incrementarNaoLidasStaff(conversa.id);
      if (conversa.querDiagnostico === false) {
        await chatRepo.atualizarConversa({
          id: conversa.id,
          expiraEm: expiraEm24h(),
        });
      }

      return {
        conversa: await chatRepo.obterConversa(conversa.id),
        mensagens: await chatRepo.listarMensagens(conversa.id),
        botReply: null,
      };
    }

    const cliente = await chatRepo.obterClientePorUtilizador(utilizador.id);
    const veiculos = cliente?.cliente_id
      ? await chatRepo.listarVeiculos(cliente.cliente_id)
      : [];

    const servicos = await chatRepo.listarServicos();
    const pecas = await chatRepo.listarPecas();

    const resultado = processarMensagem({
      texto: conteudo,
      conversa,
      cliente,
      veiculos,
      servicos,
      pecas,
    });

    const atualizar = { ...(resultado.atualizar || {}) };

    const querDiagnostico = atualizar.querDiagnostico ?? conversa.querDiagnostico;
    if (querDiagnostico === false) {
      atualizar.expiraEm = expiraEm24h();
    }

    if (querDiagnostico === true) {
      atualizar.expiraEm = null;
    }

    if (Object.keys(atualizar).length > 0) {
      await chatRepo.atualizarConversa({
        id: conversa.id,
        ...atualizar,
      });
    }

    const metadata = { ...(resultado.metadata ?? {}) };

    if (metadata.precisaSlots) {
      delete metadata.precisaSlots;

      const slots = await listarDisponiveis(chatRepo);
      metadata.slots = slots;

      if (!slots.length) {
        metadata.aviso =
          'Não há horários disponíveis nos próximos dias. Vamos encaminhar para funcionário.';
        metadata.badge = 'EM_ATENDIMENTO';

        await chatRepo.atualizarConversa({
          id: conversa.id,
          status: 'EM_ATENDIMENTO',
          etapa: 'HUMANO',
          expiraEm: null,
        });
      }
    }

    const botReply = await chatRepo.criarMensagem({
      conversaId: conversa.id,
      remetente: 'BOT',
      conteudo: resultado.resposta,
      metadata,
    });

    if (
      metadata.badge === 'EM_ATENDIMENTO' ||
      metadata.badge === 'AGUARDANDO_FUNCIONARIO' ||
      atualizar.status === 'AGUARDANDO_FUNCIONARIO'
    ) {
      await chatRepo.incrementarNaoLidasStaff(conversa.id);
    }

    if (querDiagnostico === false) {
      await chatRepo.atualizarConversa({
        id: conversa.id,
        expiraEm: expiraEm24h(),
      });
    }

    return {
      conversa: await chatRepo.obterConversa(conversa.id),
      mensagens: await chatRepo.listarMensagens(conversa.id),
      botReply,
    };
  };
}

export function criarObterConversa({ chatRepo }) {
  return async function obterConversa({ id, utilizador, isStaff }) {
    await chatRepo.apagarExpiradas();
    const conversa = await chatRepo.obterConversa(id);
    if (!conversa) throw erros.contaInternaInvalida('Conversa não encontrada.');

    if (!isStaff && String(conversa.utilizadorId) !== String(utilizador.id)) {
      throw erros.naoAutorizado();
    }
    if (await chatRepo.conversaOcultada({ conversaId: id, utilizadorId: utilizador.id })) {
      throw erros.contaInternaInvalida('Conversa não encontrada.');
    }

    if (isStaff) await chatRepo.zerarNaoLidasStaff(conversa.id);
    else await chatRepo.zerarNaoLidasCliente(conversa.id);

    return {
      conversa,
      mensagens: await chatRepo.listarMensagens(conversa.id),
    };
  };
}

export function criarAgendarDiagnostico({ chatRepo }) {
  return async function agendarDiagnostico({
    conversaId,
    utilizador,
    inicioAt,
    fimAt,
  }) {
    const conversa = await chatRepo.obterConversa(conversaId);
    if (!conversa) throw erros.contaInternaInvalida('Conversa não encontrada.');

    if (String(conversa.utilizadorId) !== String(utilizador.id)) {
      throw erros.naoAutorizado();
    }

    if (!inicioAt || !fimAt) {
      throw erros.contaInternaInvalida('Horário inválido.');
    }

    const disponiveis = await listarDisponiveis(chatRepo);
    const escolhido = disponiveis.find((s) => s.inicioAt === inicioAt);

    if (!escolhido) {
      throw erros.contaInternaInvalida('Este horário já não está disponível.');
    }

    try {
      await chatRepo.criarReserva({ conversaId, inicioAt, fimAt });
    } catch {
      throw erros.contaInternaInvalida(
        'Este horário acabou de ser reservado. Escolhe outro.',
      );
    }

    await chatRepo.atualizarConversa({
      id: conversaId,
      agendadoAt: inicioAt,
      etapa: 'CHEGADA_OFICINA',
      status: 'BOT',
      querDiagnostico: true,
      expiraEm: null,
    });

    const botReply = await chatRepo.criarMensagem({
      conversaId,
      remetente: 'BOT',
      conteudo:
        `Diagnóstico reservado para ${escolhido.rotulo}.\n\n` +
        'Agora preciso de saber como o veículo vai chegar à oficina.',
      metadata: {
        chegada: OPCOES_CHEGADA,
      },
    });

    return {
      conversa: await chatRepo.obterConversa(conversaId),
      mensagens: await chatRepo.listarMensagens(conversaId),
      botReply,
    };
  };
}

// ★ Fase 3B — chegada do veículo À oficina (pré-OS).
export function criarDefinirChegadaOficina({ chatRepo }) {
  return async function definirChegadaOficina({
    conversaId,
    utilizador,
    modalidade,
    bairro,
    quarteirao,
    numeroCasa,
    pontoReferencia,
    lat,
    lng,
    precisao,
  }) {
    const conversa = await chatRepo.obterConversa(conversaId);
    if (!conversa) throw erros.contaInternaInvalida('Conversa não encontrada.');

    if (String(conversa.utilizadorId) !== String(utilizador.id)) {
      throw erros.naoAutorizado();
    }

    if (!['LEVAR_OFICINA', 'RECOLHA_DOMICILIO'].includes(modalidade)) {
      throw erros.contaInternaInvalida('Modalidade de chegada inválida.');
    }

    const linha = (rotulo, valor) => (valor ? `${rotulo}: ${valor}\n` : '');

    const cabecalho =
      '✅ Dados guardados para criação da OS:\n' +
      linha('Cliente', conversa.nomeCliente) +
      linha('E-mail', conversa.email) +
      linha('Problema', conversa.problema) +
      (conversa.orcamentoEstimado
        ? `Estimativa: ${fmtMoeda(conversa.orcamentoEstimado)}\n`
        : '') +
      (conversa.agendadoAt
        ? `Diagnóstico: ${new Date(conversa.agendadoAt).toLocaleString('pt-PT')}\n`
        : '');

    if (modalidade === 'LEVAR_OFICINA') {
      await chatRepo.atualizarConversa({
        id: conversaId,
        chegadaModalidade: 'LEVAR_OFICINA',
        chegadaBairro: null,
        chegadaQuarteirao: null,
        chegadaNumeroCasa: null,
        chegadaPontoReferencia: null,
        chegadaLat: null,
        chegadaLng: null,
        chegadaPrecisaoM: null,
        chegadaDistanciaKm: null,
        chegadaTempoMin: null,
        chegadaTaxa: 0,
        chegadaConsentimentoAt: null,
        etapa: 'RESUMO',
        status: 'AGUARDANDO_FUNCIONARIO',
        querDiagnostico: true,
        expiraEm: null,
      });

      const resumo =
        cabecalho +
        'Chegada à oficina: o cliente levará o carro pessoalmente.\n' +
        `Morada: ${OFICINA.morada}\n` +
        `Horário: ${OFICINA.horario}`;

      const botReply = await chatRepo.criarMensagem({
        conversaId,
        remetente: 'BOT',
        conteudo: `${resumo}\n\nUm funcionário vai analisar e criar a ordem de serviço.`,
        metadata: {
          resumo: { texto: resumo },
          chegadaConfirmada: true,
          chegadaModalidade: 'LEVAR_OFICINA',
        },
      });

      await chatRepo.incrementarNaoLidasStaff(conversaId);

      return {
        conversa: await chatRepo.obterConversa(conversaId),
        mensagens: await chatRepo.listarMensagens(conversaId),
        botReply,
      };
    }

    // RECOLHA_DOMICILIO
    const latNum = Number(lat);
    const lngNum = Number(lng);

    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      throw erros.contaInternaInvalida(
        'Localização inválida. Ativa a geolocalização.',
      );
    }

    const bairroTxt = String(bairro ?? '').trim();
    const quartTxt = String(quarteirao ?? '').trim();
    const numTxt = String(numeroCasa ?? '').trim();
    const pontoTxt = String(pontoReferencia ?? '').trim();

    if (!bairroTxt || !quartTxt || !numTxt) {
      throw erros.contaInternaInvalida(
        'Para recolha ao domicílio, preenche bairro, quarteirão e número da casa.',
      );
    }

    const distancia = distanciaKm(
      latNum,
      lngNum,
      OFICINA.coordenadas.lat,
      OFICINA.coordenadas.lng,
    );

    const tempo = tempoEstimadoMin(distancia, OFICINA.velocidadeMediaKmH);
    const taxa = Number(OFICINA.taxaRecolhaParaOficina ?? 0);

    await chatRepo.atualizarConversa({
      id: conversaId,
      chegadaModalidade: 'RECOLHA_DOMICILIO',
      chegadaBairro: bairroTxt,
      chegadaQuarteirao: quartTxt,
      chegadaNumeroCasa: numTxt,
      chegadaPontoReferencia: pontoTxt || null,
      chegadaLat: latNum,
      chegadaLng: lngNum,
      chegadaPrecisaoM: Number.isFinite(Number(precisao))
        ? Number(precisao)
        : null,
      chegadaDistanciaKm: Number(distancia.toFixed(2)),
      chegadaTempoMin: tempo,
      chegadaTaxa: taxa,
      chegadaConsentimentoAt: new Date().toISOString(),
      etapa: 'RESUMO',
      status: 'AGUARDANDO_FUNCIONARIO',
      querDiagnostico: true,
      expiraEm: null,
    });

    const endereco = [
      bairroTxt,
      `Quarteirão ${quartTxt}`,
      `Casa ${numTxt}`,
      pontoTxt ? `Ref: ${pontoTxt}` : null,
    ]
      .filter(Boolean)
      .join(' · ');

    const resumo =
      cabecalho +
      'Chegada à oficina: recolha ao domicílio\n' +
      `Endereço: ${endereco}\n` +
      `Distância aproximada: ${distancia.toFixed(1)} km\n` +
      `Tempo estimado: ${tempo} min\n` +
      `Taxa de recolha: ${fmtMoeda(taxa)}`;

    const botReply = await chatRepo.criarMensagem({
      conversaId,
      remetente: 'BOT',
      conteudo: `${resumo}\n\nUm funcionário vai confirmar a recolha e criar a ordem de serviço.`,
      metadata: {
        resumo: { texto: resumo },
        chegadaConfirmada: true,
        chegadaModalidade: 'RECOLHA_DOMICILIO',
        endereco,
        distanciaKm: Number(distancia.toFixed(1)),
        tempoMin: tempo,
        taxa,
      },
    });

    await chatRepo.incrementarNaoLidasStaff(conversaId);

    return {
      conversa: await chatRepo.obterConversa(conversaId),
      mensagens: await chatRepo.listarMensagens(conversaId),
      botReply,
    };
  };
}

export function criarListarConversasStaff({ chatRepo }) {
  return async function listarConversasStaff({ utilizador }) {
    await chatRepo.apagarExpiradas();
    return chatRepo.listarConversasStaff(utilizador.id);
  };
}

export function criarListarConversasCliente({ chatRepo }) {
  return async function listarConversasCliente({ utilizador }) {
    await chatRepo.apagarExpiradas();
    return chatRepo.listarConversasCliente(utilizador.id);
  };
}

export function criarOcultarConversa({ chatRepo }) {
  return async function ocultarConversa({ conversaId, utilizador, isStaff }) {
    const conversa = await chatRepo.obterConversa(conversaId);
    if (!conversa) throw erros.contaInternaInvalida('Conversa não encontrada.');
    if (!isStaff && String(conversa.utilizadorId) !== String(utilizador.id)) {
      throw erros.naoAutorizado();
    }

    await chatRepo.ocultarConversa({ conversaId, utilizadorId: utilizador.id });
  };
}

export function criarAtenderConversaStaff({ chatRepo }) {
  return async function atenderConversaStaff({ conversaId, utilizador }) {
    const conversa = await chatRepo.obterConversa(conversaId);
    if (!conversa) throw erros.contaInternaInvalida('Conversa não encontrada.');

    await chatRepo.atualizarConversa({
      id: conversaId,
      status: 'EM_ATENDIMENTO',
      atendidoPor: utilizador.id,
      etapa: 'HUMANO',
      expiraEm: conversa.querDiagnostico === false ? expiraEm24h() : null,
    });

    await chatRepo.criarMensagem({
      conversaId,
      remetente: 'STAFF',
      remetenteId: utilizador.id,
      conteudo: `Olá! Aqui é ${utilizador.nome}, da ${OFICINA.nome}. Vou continuar a tua conversa.`,
      metadata: {},
    });

    await chatRepo.zerarNaoLidasStaff(conversaId);
    await chatRepo.incrementarNaoLidasCliente(conversaId);
    if (conversa.querDiagnostico === false) {
      await chatRepo.atualizarConversa({
        id: conversaId,
        expiraEm: expiraEm24h(),
      });
    }

    return {
      conversa: await chatRepo.obterConversa(conversaId),
      mensagens: await chatRepo.listarMensagens(conversaId),
    };
  };
}

export function criarResponderStaff({ chatRepo }) {
  return async function responderStaff({ conversaId, utilizador, conteudo }) {
    const texto = String(conteudo ?? '').trim();
    if (!texto) throw erros.contaInternaInvalida('Mensagem vazia.');

    const conversa = await chatRepo.obterConversa(conversaId);
    if (!conversa) throw erros.contaInternaInvalida('Conversa não encontrada.');

    await chatRepo.atualizarConversa({
      id: conversaId,
      status: 'EM_ATENDIMENTO',
      atendidoPor: conversa.atendidoPor ?? utilizador.id,
      etapa: 'HUMANO',
      expiraEm: conversa.querDiagnostico === false ? expiraEm24h() : null,
    });

    await chatRepo.criarMensagem({
      conversaId,
      remetente: 'STAFF',
      remetenteId: utilizador.id,
      conteudo: texto,
      metadata: {},
    });

    await chatRepo.zerarNaoLidasStaff(conversaId);
    await chatRepo.incrementarNaoLidasCliente(conversaId);
    if (conversa.querDiagnostico === false) {
      await chatRepo.atualizarConversa({
        id: conversaId,
        expiraEm: expiraEm24h(),
      });
    }

    return {
      conversa: await chatRepo.obterConversa(conversaId),
      mensagens: await chatRepo.listarMensagens(conversaId),
    };
  };
}

// ★ Fase 3C — funcionário marca se o cliente quer ou não diagnóstico.
export function criarDefinirDecisaoDiagnosticoStaff({ chatRepo }) {
  return async function definirDecisaoDiagnosticoStaff({
    conversaId,
    utilizador,
    querDiagnostico,
  }) {
    const conversa = await chatRepo.obterConversa(conversaId);
    if (!conversa) throw erros.contaInternaInvalida('Conversa não encontrada.');

    if (conversa.status === 'CONVERTIDA') {
      throw erros.contaInternaInvalida('Esta conversa já foi convertida em OS.');
    }

    if (conversa.status === 'FECHADA') {
      throw erros.contaInternaInvalida('Esta conversa já foi encerrada.');
    }

    const flag = Boolean(querDiagnostico);

    if (flag) {
      // Se o cliente quer diagnóstico, devolvemos o fluxo ao assistente/híbrido
      // para ele poder agendar e escolher chegada, mesmo estando em atendimento.
      let etapa = conversa.etapa;

      if (!conversa.agendadoAt) {
        etapa = 'AGENDAR';
      } else if (!conversa.chegadaModalidade) {
        etapa = 'CHEGADA_OFICINA';
      } else {
        etapa = 'RESUMO';
      }

      await chatRepo.atualizarConversa({
        id: conversaId,
        querDiagnostico: true,
        expiraEm: null,
        status: 'EM_ATENDIMENTO',
        etapa,
        atendidoPor: conversa.atendidoPor ?? utilizador.id,
      });

      await chatRepo.criarMensagem({
        conversaId,
        remetente: 'STAFF',
        remetenteId: utilizador.id,
        conteudo:
          'Registado: o cliente quer fazer diagnóstico. ' +
          'Agora falta agendar e definir a chegada à oficina, se ainda não estiverem definidos.',
        metadata: { decisaoDiagnostico: true },
      });

      // Mensagem do bot com opções práticas para o cliente continuar.
      if (etapa === 'AGENDAR') {
        const slots = await listarDisponiveis(chatRepo);

        await chatRepo.criarMensagem({
          conversaId,
          remetente: 'BOT',
          conteudo: slots.length
            ? 'Escolhe um horário disponível para o diagnóstico.'
            : 'Não há horários disponíveis nos próximos dias. Um funcionário vai ajudar-te.',
          metadata: {
            slots,
            aviso: slots.length ? undefined : 'Sem horários disponíveis.',
          },
        });
      }

      if (etapa === 'CHEGADA_OFICINA') {
        await chatRepo.criarMensagem({
          conversaId,
          remetente: 'BOT',
          conteudo: 'Escolhe como o veículo vai chegar à oficina.',
          metadata: {
            chegada: OPCOES_CHEGADA,
          },
        });
      }

      await chatRepo.zerarNaoLidasStaff(conversaId);
      await chatRepo.incrementarNaoLidasCliente(conversaId);

      return {
        conversa: await chatRepo.obterConversa(conversaId),
        mensagens: await chatRepo.listarMensagens(conversaId),
      };
    }

    // Sem diagnóstico, a retenção de 24h é renovada a cada mensagem.
    await chatRepo.atualizarConversa({
      id: conversaId,
      querDiagnostico: false,
      expiraEm: null,
      status: 'AGUARDANDO_FUNCIONARIO',
      etapa: 'SEM_DIAGNOSTICO',
      atendidoPor: conversa.atendidoPor ?? utilizador.id,
    });

    await chatRepo.criarMensagem({
      conversaId,
      remetente: 'STAFF',
      remetenteId: utilizador.id,
      conteudo:
        'Registado: o cliente não quer diagnóstico. ' +
        'A conversa será eliminada automaticamente em 24 horas se não for convertida em OS.',
      metadata: { decisaoDiagnostico: false },
    });

    await chatRepo.zerarNaoLidasStaff(conversaId);
    await chatRepo.incrementarNaoLidasCliente(conversaId);
    await chatRepo.atualizarConversa({
      id: conversaId,
      expiraEm: expiraEm24h(),
    });

    return {
      conversa: await chatRepo.obterConversa(conversaId),
      mensagens: await chatRepo.listarMensagens(conversaId),
    };
  };
}

export function criarFecharConversaStaff({ chatRepo }) {
  return async function fecharConversaStaff({ conversaId, utilizador }) {
    const conversa = await chatRepo.obterConversa(conversaId);
    if (!conversa) throw erros.contaInternaInvalida('Conversa não encontrada.');

    if (conversa.status === 'CONVERTIDA') {
      throw erros.contaInternaInvalida(
        'Esta conversa já foi convertida em OS e não pode ser encerrada novamente.',
      );
    }

    const expiraEm = conversa.querDiagnostico === false && !conversa.osId
      ? expiraEm24h()
      : null;

    await chatRepo.atualizarConversa({
      id: conversaId,
      status: 'FECHADA',
      atendidoPor: utilizador.id,
      expiraEm,
    });

    await chatRepo.criarMensagem({
      conversaId,
      remetente: 'STAFF',
      remetenteId: utilizador.id,
      conteudo: conversa.osId
        ? 'Conversa encerrada. A ordem de serviço continua ativa.'
        : 'Conversa encerrada. Será eliminada automaticamente em 24 horas.',
      metadata: {},
    });

    await chatRepo.incrementarNaoLidasCliente(conversaId);
    if (expiraEm) {
      await chatRepo.atualizarConversa({
        id: conversaId,
        expiraEm: expiraEm24h(),
      });
    }

    return {
      conversa: await chatRepo.obterConversa(conversaId),
      mensagens: await chatRepo.listarMensagens(conversaId),
    };
  };
}

export function criarConverterLeadEmOs({ chatRepo, criarOS, osRepo }) {
  return async function converterLeadEmOs({
    conversaId,
    utilizador,
    descricaoProblema,
  }) {
    const conversa = await chatRepo.obterConversa(conversaId);
    if (!conversa) throw erros.contaInternaInvalida('Conversa não encontrada.');

    if (conversa.status === 'CONVERTIDA') {
      throw erros.contaInternaInvalida('Esta conversa já foi convertida em OS.');
    }

    if (!conversa.veiculoId) {
      throw erros.contaInternaInvalida('Falta veículo na conversa.');
    }

    const problema = String(descricaoProblema ?? conversa.problema ?? '').trim();
    if (!problema) {
      throw erros.contaInternaInvalida('Falta problema reportado.');
    }
    if (problema.length < 10) {
      throw erros.contaInternaInvalida(
        'A descrição do problema deve ter pelo menos 10 caracteres.',
      );
    }

    if (!conversa.email) {
      throw erros.contaInternaInvalida('Falta e-mail do cliente.');
    }

    if (conversa.querDiagnostico !== true) {
      throw erros.contaInternaInvalida(
        'Marca primeiro que o cliente quer diagnóstico antes de converter em OS.',
      );
    }

    if (!conversa.chegadaModalidade) {
      throw erros.contaInternaInvalida(
        'Define primeiro como o veículo vai chegar à oficina: levar próprio ou recolha.',
      );
    }

    const os = await criarOS({
      emailCliente: conversa.email,
      veiculoId: Number(conversa.veiculoId),
      descricaoProblema: problema,
      utilizador,
    });

    // Defesa: se porventura existir modalidadeEntrega no lead, pré-preenche a OS.
    // No fluxo 3B/3C normal NÃO dispara, porque a entrega final é escolhida em CONCLUIDA.
    if (conversa.modalidadeEntrega) {
      const atualizada = await osRepo.definirEntrega({
        ordemId: os.id,
        estadoEsperado: os.estado,
        modalidade: conversa.modalidadeEntrega,
        taxaEntrega: Number(conversa.taxaEntrega ?? 0),
      });
      if (!atualizada) throw erros.transicaoInvalida(os.estado);
    }

    await chatRepo.atualizarConversa({
      id: conversaId,
      osId: os.id,
      status: 'CONVERTIDA',
      atendidoPor: utilizador.id,
      querDiagnostico: true,
      expiraEm: null,
    });

    const chegadaTexto =
      conversa.chegadaModalidade === 'RECOLHA_DOMICILIO'
        ? `🏠 Recolha: ${conversa.chegadaBairro}, quarteirão ${conversa.chegadaQuarteirao}, casa ${conversa.chegadaNumeroCasa}${conversa.chegadaPontoReferencia ? ` (${conversa.chegadaPontoReferencia})` : ''} · ${Number(conversa.chegadaDistanciaKm ?? 0).toFixed(1)} km · ${conversa.chegadaTempoMin ?? 0} min`
        : '🚗 O cliente levará o carro à oficina.';

    await chatRepo.criarMensagem({
      conversaId,
      remetente: 'BOT',
      conteudo:
        `✅ Ordem de serviço criada: ${os.numeroOS}.\n\n` +
        `${chegadaTexto}\n\n` +
        'Podes acompanhar na aba "Ordens de serviço".',
      metadata: {
        osId: os.id,
        numeroOS: os.numeroOS,
        chegadaTexto,
      },
    });

    await chatRepo.incrementarNaoLidasCliente(conversaId);

    return {
      conversa: await chatRepo.obterConversa(conversaId),
      mensagens: await chatRepo.listarMensagens(conversaId),
      os,
    };
  };
}