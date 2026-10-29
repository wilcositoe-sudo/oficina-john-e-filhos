// Bootstrap único (ovo-e-galinha): cria o PRIMEIRO administrador.
// Uso: node --env-file=.env scripts/create-admin.js "Nome Admin" "admin@exemplo.com" "senha1234"
import { criarPgUtilizadorRepository } from '../src/modules/auth/adapters/pg-utilizador-repository.js';
import { passwordHasher } from '../src/modules/auth/domain/password-hasher.js';

const [nome, email, senha] = process.argv.slice(2);
if (!nome || !email || !senha || senha.length < 8) {
  console.error('Uso: node scripts/create-admin.js "Nome" "email" "senha (mín. 8)"');
  process.exit(1);
}

const repo = criarPgUtilizadorRepository();
const existente = await repo.procurarPorEmail(email.trim().toLowerCase());
if (existente) {
  console.error('Já existe conta com esse e-mail.');
  process.exit(1);
}

const passwordHash = await passwordHasher.hash(senha);
const u = await repo.criar({
  nome: nome.trim(),
  email: email.trim().toLowerCase(),
  telefone: null,
  passwordHash,
  perfil: 'ADMINISTRADOR',
});
console.log(`Admin criado: id=${u.id} email=${u.email}`);
process.exit(0);