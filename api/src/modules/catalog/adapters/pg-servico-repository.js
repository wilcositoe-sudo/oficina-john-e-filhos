import { pool } from '../../../shared/db/pool.js';

const map = (r) => ({
  id: r.id,
  codigo: r.codigo,
  nome: r.nome,
  descricao: r.descricao,
  precoBase: r.preco_base,
  ativo: r.ativo,
});

export function criarPgServicoRepository() {
  return {
    // RF01: serviços inativos NUNCA são oferecidos — filtro obrigatório no servidor
    async listarAtivos() {
      const { rows } = await pool.query(
        `SELECT id, codigo, nome, descricao, preco_base, ativo
         FROM servicos WHERE ativo = TRUE ORDER BY nome`,
      );
      return rows.map(map);
    },
        async criar({ codigo, nome, descricao, precoBase }) {
      const { rows } = await pool.query(
        `INSERT INTO servicos (codigo, nome, descricao, preco_base)
         VALUES ($1, $2, $3, $4)
         RETURNING id, codigo, nome, descricao, preco_base, ativo`,
        [codigo, nome, descricao, precoBase],
      );
      return map(rows[0]);
    },

    async procurarPorId(id) {
      const { rows } = await pool.query(
        `SELECT id, codigo, nome, descricao, preco_base, ativo FROM servicos WHERE id = $1`,
        [id],
      );
      return rows[0] ? map(rows[0]) : null;
    },

    async desativar(id) {
      const { rows } = await pool.query(
        `UPDATE servicos SET ativo = FALSE WHERE id = $1
         RETURNING id, codigo, nome, descricao, preco_base, ativo`,
        [id],
      );
      return rows[0] ? map(rows[0]) : null;
    },
        async listarTodos() {
      const { rows } = await pool.query(
        `SELECT id, codigo, nome, descricao, preco_base, ativo FROM servicos ORDER BY nome`,
      );
      return rows.map(map);
    },
  };
}