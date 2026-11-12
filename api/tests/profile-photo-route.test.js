import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import test from 'node:test';

test('profile photo endpoint validates, stores, and removes an authenticated user image', async () => {
  const uploadRoot = await mkdtemp(path.join(os.tmpdir(), 'oficina-profile-'));
  process.env.UPLOAD_ROOT = uploadRoot;
  const { createAuthRouter } = await import('../src/modules/auth/http/auth-routes.js');
  let utilizador = { id: 'u1', fotoPerfilUrl: null };
  const app = express();
  app.use('/auth', createAuthRouter({
    requireAuth: (req, res, next) => {
      req.utilizador = utilizador;
      next();
    },
    atualizarFotoPerfil: async ({ utilizador: atual, fotoPerfilUrl }) => {
      utilizador = { ...atual, fotoPerfilUrl };
      return utilizador;
    },
  }));
  const server = app.listen(0);
  await once(server, 'listening');

  try {
    const base = `http://127.0.0.1:${server.address().port}/auth/me/foto`;
    const invalida = new FormData();
    invalida.append('foto', new Blob(['not a png'], { type: 'image/png' }), 'foto.png');
    const erro = await fetch(base, { method: 'POST', body: invalida });
    assert.equal(erro.status, 400);

    const imagemPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pD8AAAAASUVORK5CYII=',
      'base64',
    );
    const formulario = new FormData();
    formulario.append('foto', new Blob([imagemPng], { type: 'image/png' }), 'foto.png');
    const resposta = await fetch(base, { method: 'POST', body: formulario });
    assert.equal(resposta.status, 200);
    const resultado = await resposta.json();
    assert.match(resultado.data.fotoPerfilUrl, /^\/uploads\/perfis\/[a-f0-9-]+\.png$/);

    const ficheiro = path.join(uploadRoot, 'perfis', path.basename(resultado.data.fotoPerfilUrl));
    assert.deepEqual(await readFile(ficheiro), imagemPng);
    assert.equal((await stat(ficheiro)).isFile(), true);

    const removida = await fetch(base, { method: 'DELETE' });
    assert.equal(removida.status, 200);
    assert.equal((await removida.json()).data.fotoPerfilUrl, null);
    await assert.rejects(stat(ficheiro), { code: 'ENOENT' });
  } finally {
    const fechado = once(server, 'close');
    server.close();
    await fechado;
    await rm(uploadRoot, { recursive: true, force: true });
  }
});
