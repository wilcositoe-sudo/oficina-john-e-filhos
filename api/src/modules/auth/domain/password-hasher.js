import bcrypt from 'bcryptjs';

const ROUNDS = 12;

export const passwordHasher = {
  hash: (senha) => bcrypt.hash(senha, ROUNDS),
  comparar: (senha, hash) => bcrypt.compare(senha, hash),
};