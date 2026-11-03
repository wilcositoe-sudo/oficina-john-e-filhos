import crypto from 'node:crypto';
import { erros } from '../../../shared/errors/domain-error.js';

export function criarSolicitarRecuperacao({ utilizadorRepo }) {
  return async function solicitarRecuperacao({ email }) {
    const emailNorm = email?.trim().toLowerCase();
    if (!emailNorm) throw erros.utilizadorNaoEncontrado();

    const utilizador = await utilizadorRepo.procurarPorEmail(emailNorm);
    
    // Por segurança, não revelamos se o e-mail existe ou não na mensagem principal
    if (!utilizador || !utilizador.ativo) {
      return { mensagem: 'Se este e-mail estiver registado, receberá as instruções.' };
    }

    // Gera token seguro e define validade de 1 hora
    const token = crypto.randomBytes(32).toString('hex');
    const expiraEm = new Date(Date.now() + 60 * 60 * 1000);

    await utilizadorRepo.guardarTokenRecuperacao(utilizador.id, token, expiraEm);

    // SIMULAÇÃO DE E-MAIL (Para produção, integrar com Resend/SendGrid)
    console.log(`\n[EMAIL SIMULADO] Para: ${emailNorm}`);
    console.log(`[EMAIL SIMULADO] Assunto: Recuperação de senha - Oficina John e Filhos`);
    console.log(`[EMAIL SIMULADO] O seu token de recuperação é: ${token}\n`);

    // DEV: Devolve o token para permitir o redirecionamento automático no frontend
    return { 
      mensagem: 'Se este e-mail estiver registado, receberá as instruções.',
      tokenDeTeste: token 
    };
  };
}