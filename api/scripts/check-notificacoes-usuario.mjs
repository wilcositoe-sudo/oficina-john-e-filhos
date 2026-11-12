import { pool } from '../src/shared/db/pool.js';

const userId = Number(process.argv[2] || 87);
const perfil = String(process.argv[3] || 'CLIENTE').toUpperCase();

async function main() {
  console.log(`=== NOTIFICAÇÕES VISÍVEIS PARA UTILIZADOR ${userId} / PERFIL ${perfil} ===`);

  const r = await pool.query(
    `
      SELECT
        id,
        ordem_id,
        destinatario_perfil,
        destinatario_id,
        titulo,
        corpo,
        tipo,
        lida,
        criado_at
      FROM notificacoes
      WHERE destinatario_id = $1::bigint
         OR (destinatario_id IS NULL AND destinatario_perfil = $2::text)
         OR ($2::text = 'ADMINISTRADOR' AND destinatario_id IS NULL AND destinatario_perfil = 'FUNCIONARIO')
      ORDER BY criado_at DESC
      LIMIT 30
    `,
    [userId, perfil],
  );

  console.log('');
  console.log('== linhas encontradas ==');
  console.table(r.rows);

  console.log('');
  console.log('Total encontrado:', r.rowCount);

  const carroPronto = r.rows.find((n) => n.titulo === 'Carro pronto' && String(n.ordem_id) === '75');

  if (carroPronto) {
    console.log('');
    console.log('OK: notificação "Carro pronto" da OS 75 está visível para este utilizador.');
  } else {
    console.log('');
    console.log('ATENÇÃO: não encontrei notificação "Carro pronto" da OS 75 para este utilizador.');
  }

  await pool.end();
}

main().catch((e) => {
  console.error('ERRO:', e.message);
  process.exit(1);
});