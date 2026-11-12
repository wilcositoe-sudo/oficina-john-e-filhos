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

const mapSemPreco = (r) => ({
  id: r.id,
  codigo: r.codigo,
  nome: r.nome,
  descricao: r.descricao,
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
        `SELECT id, codigo, nome, descricao, preco_unitario, quantidade_stock, ativo
         FROM pecas
         WHERE id = $1`,
        [id],
      );
      return rows[0] ? map(rows[0]) : null;
    },

    async atualizar(dados) {
      const { id, nome, descricao, precoUnitario, quantidadeStock, ativo } = dados;
      const values = [id];
      const updates = [];
      const fields = [
        ['nome', nome, 'nome'],
        ['descricao', descricao, 'descricao'],
        ['preco_unitario', precoUnitario, 'precoUnitario'],
        ['quantidade_stock', quantidadeStock, 'quantidadeStock'],
        ['ativo', ativo, 'ativo'],
      ];

      for (const [column, value, input] of fields) {
        if (!Object.hasOwn(dados, input)) continue;
        values.push(value);
        updates.push(`${column} = $${values.length}`);
      }

      if (updates.length === 0) return this.procurarPorId(id);
      const { rows } = await pool.query(
        `UPDATE pecas
         SET ${updates.join(', ')}, updated_at = now()
         WHERE id = $1
         RETURNING id, codigo, nome, descricao, preco_unitario, quantidade_stock, ativo`,
        values,
      );
      return rows[0] ? map(rows[0]) : null;
    },

    async apagar(id) {
      const { rowCount } = await pool.query(
        'DELETE FROM pecas WHERE id = $1::bigint',
        [id],
      );
      return rowCount > 0;
    },

    async listarTodos() {
      const { rows } = await pool.query(
        `SELECT id, codigo, nome, descricao, preco_unitario, quantidade_stock, ativo
         FROM pecas
         ORDER BY nome`,
      );
      return rows.map(map);
    },

    // Catálogo para o mecânico: sem preço e sem stock sensível.
    async listarCatalogo() {
      const { rows } = await pool.query(
        `SELECT id, codigo, nome, descricao, ativo
         FROM pecas
         WHERE ativo = TRUE
         ORDER BY nome`,
      );
      return rows.map(mapSemPreco);
    },
  };
}