export const PasswordHasher = {
  async hash(senha) {
    throw new Error('Porta não implementada: hash');
  },
  async comparar(senha, hash) {
    throw new Error('Porta não implementada: comparar');
  },
};
