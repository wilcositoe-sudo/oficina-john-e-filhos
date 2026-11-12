import assert from 'node:assert/strict';
import test from 'node:test';
import { validarFotoPerfil } from '../src/modules/auth/domain/profile-photo.js';
import { criarAtualizarFotoPerfil } from '../src/modules/auth/use-cases/atualizar-foto-perfil.js';

test('profile photo validation accepts matching JPEG, PNG, and WEBP signatures only', () => {
  assert.equal(validarFotoPerfil('image/jpeg', Buffer.from([0xff, 0xd8, 0xff, 0x00])), 'jpg');
  assert.equal(validarFotoPerfil('image/png', Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'png');
  assert.equal(validarFotoPerfil('image/webp', Buffer.from('RIFF0000WEBP')), 'webp');
  assert.equal(validarFotoPerfil('image/png', Buffer.from('not an image')), null);
  assert.equal(validarFotoPerfil('image/svg+xml', Buffer.from('<svg/>')), null);
});

test('profile photo update persists only the authenticated user and supports removal', async () => {
  const updates = [];
  const atualizar = criarAtualizarFotoPerfil({
    utilizadorRepo: {
      atualizarFotoPerfil: async (dados) => {
        updates.push(dados);
        return { id: dados.id, fotoPerfilUrl: dados.fotoPerfilUrl };
      },
    },
  });
  const utilizador = { id: 'u1', fotoPerfilUrl: null };
  const fotoPerfilUrl = '/uploads/perfis/123e4567-e89b-12d3-a456-426614174000.jpg';

  assert.deepEqual(await atualizar({ utilizador, fotoPerfilUrl }), {
    id: 'u1',
    fotoPerfilUrl,
  });
  assert.deepEqual(await atualizar({ utilizador, fotoPerfilUrl: null }), {
    id: 'u1',
    fotoPerfilUrl: null,
  });
  assert.deepEqual(updates, [
    { id: 'u1', fotoPerfilUrl },
    { id: 'u1', fotoPerfilUrl: null },
  ]);
});

test('profile photo update rejects arbitrary file paths', async () => {
  const atualizar = criarAtualizarFotoPerfil({
    utilizadorRepo: {
      atualizarFotoPerfil: async () => assert.fail('não deve guardar URL inválida'),
    },
  });

  await assert.rejects(
    atualizar({ utilizador: { id: 'u1' }, fotoPerfilUrl: '/uploads/fora/perfil.svg' }),
    (error) => error.code === 'VALIDACAO' && error.status === 422,
  );
});
