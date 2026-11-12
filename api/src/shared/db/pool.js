import dns from 'node:dns';
import { Pool } from 'pg';

// O host directo do Supabase resolvia só IPv6 na tua rede; o pooler resolve IPv4.
dns.setDefaultResultOrder('ipv4first');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    'DATABASE_URL não está definida. Define a connection string no .env.',
  );
}

// O pooler SESSION mode do Supabase tem um teto GLOBAL de 15 clientes por projecto.
// Esse teto é partilhado entre a API e QUALQUER script de debug que abra pool.
// Por isso mantemos max pequeno: deixa margem para 1 script pontual sem esgotar 15.
export const pool = new Pool({
  connectionString,

  // 2 conexões máximas na API. O abrir() faz Promise.all de 3 queries,
  // mas o pg.Pool serializa dentro do max; 2 é suficiente e seguro.
  max: 2,

  min: 0,

  // Descarta ociosas AGRESSIVO, antes de o firewall/NAT as matar por trás.
  // Conexão fechada graciosamente pelo pool => o Supavisor liberta o slot
  // imediatamente. Conexão morta pelo firewall => slot fantasma até expirar.
  // Este valor tem de ser MENOR que o timeout de idle da tua rede.
  idleTimeoutMillis: 15_000,

  // Fail-fast: se o pooler estiver saturado, não pendura o request 15s.
  connectionTimeoutMillis: 10_000,
});

// Erros em clients OCIOSOS não podem derrubar o processo nem virar
// "erro não tratado". Libertamos com destroy(true) para o pool recriar limpo.
pool.on('error', (err, client) => {
  console.error(
    '[pg-pool] erro em client ocioso:',
    err.code ?? '',
    err.message,
  );
  if (client) {
    try {
      client.release(true);
    } catch {
      // ignore
    }
  }
});

export default pool;