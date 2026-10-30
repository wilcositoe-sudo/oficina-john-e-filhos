import { pool } from '../../../shared/db/pool.js';

const map = (r) => ({
  id: r.id,
  codigo: r.codigo,
  nome: r.nome,
  descricao: r.descricao,
  precoUnitario: r.preco_unitario,
  quantidadeStock: r.quantidade_stock,
  ativo: r.ativo,
});

export function criarPgPecaRepository() {
  return {
    async criar({ codigo, nome, descricao, precoUnitario, quantidadeStock }) {
      const { rows } = await pool.query(
        `INSERT INTO pecas (codigo, nome, descricao, preco_unitario, quantidade_stock)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, codigo, nome, descricao, preco_unitario, quantidade_stock, ativo`,
        [codigo, nome, descricao, precoUnitario, quantidadeStock],
      );
      return map(rows[0]);
    },

    async procurarPorId(id) {
      const { rows } = await pool.query(
        'SELECT id, codigo, nome, descricao, preco_unitario, quantidade_stock, ativo FROM pecas WHERE id = $1',
        [id],
      );
      return rows[0] ? map(rows[0]) : null;
    },

    async listarTodos() {
      const { rows } = await pool.query(
        'SELECT id, codigo, nome, descricao, preco_unitario, quantidade_stock, ativo FROM pecas ORDER BY nome',
      );
      return rows.map(map);
    },
  };
}