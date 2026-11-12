import crypto from 'node:crypto';
import { erros } from '../../../shared/errors/domain-error.js';

export function criarSolicitarRecuperacao({
  utilizadorRepo,
  ambiente = process.env.NODE_ENV ?? 'development',
}) {
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
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiraEm = new Date(Date.now() + 60 * 60 * 1000);

    await utilizadorRepo.guardarTokenRecuperacao(utilizador.id, tokenHash, expiraEm);

    const resultado = { mensagem: 'Se este e-mail estiver registado, receberá as instruções.' };
    return ambiente === 'production' ? resultado : { ...resultado, tokenDeTeste: token };
  };
}