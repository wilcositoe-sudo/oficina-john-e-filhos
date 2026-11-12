import { Router } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import multer from 'multer';
import path from 'node:path';
import { asyncRoute } from '../../../shared/http/async-route.js';
import { logger } from '../../../shared/logging/logger.js';
import { validarFotoPerfil } from '../domain/profile-photo.js';

const DIRETORIO_UPLOAD = path.resolve(process.env.UPLOAD_ROOT || 'uploads', 'perfis');
const TIPOS_FOTO = new Set(['image/jpeg', 'image/png', 'image/webp']);
const uploadFoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(req, file, callback) {
    if (TIPOS_FOTO.has(file.mimetype)) return callback(null, true);
    const error = new Error('Usa uma imagem JPG, PNG ou WEBP.');
    error.codigo = 'FOTO_INVALIDA';
    callback(error);
  },
});

function caminhoFoto(fotoUrl) {
  const correspondencia = /^\/uploads\/perfis\/([a-f0-9-]+\.(?:jpg|png|webp))$/.exec(fotoUrl ?? '');
  return correspondencia ? path.join(DIRETORIO_UPLOAD, correspondencia[1]) : null;
}

async function removerFotoAntiga(fotoUrl) {
  const caminho = caminhoFoto(fotoUrl);
  if (!caminho) return;
  try {
    await fs.unlink(caminho);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      logger.warn('não foi possível remover ficheiro de perfil antigo', { erro: error.message });
    }
  }
}

function extrairToken(req) {
  const header = req.headers.authorization ?? '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : null;
}

export function createAuthRouter({
  utilizadorRepo,
  requireAuth,
  registarCliente,
  login,
  solicitarRecuperacao,
  confirmarRecuperacao,
  logout,
  atualizarPerfil,
  atualizarFotoPerfil,
  alterarSenha,
}) {
  const router = Router();

  router.post('/register', asyncRoute(async (req, res) => {
    const resultado = await registarCliente(req.body ?? {});
    res.status(201).json({ data: resultado });
  }));

  router.post('/login', asyncRoute(async (req, res) => {
    const resultado = await login(req.body ?? {});
    res.json({ data: resultado });
  }));

  router.post('/logout', requireAuth, asyncRoute(async (req, res) => {
    await logout({ token: extrairToken(req) });
    res.status(204).send();
  }));

  router.get('/me', requireAuth, (req, res) => {
    res.json({ data: req.utilizador });
  });

  router.patch('/me', requireAuth, asyncRoute(async (req, res) => {
    const body = req.body ?? {};
    const dados = {};
    for (const campo of ['nome', 'email', 'telefone']) {
      if (Object.hasOwn(body, campo)) dados[campo] = body[campo];
    }
    res.json({
      data: await atualizarPerfil({
        ...dados,
        utilizador: req.utilizador,
      }),
    });
  }));

  router.post(
    '/me/foto',
    requireAuth,
    uploadFoto.single('foto'),
    asyncRoute(async (req, res) => {
      if (!req.file) {
        return res.status(400).json({
          error: { code: 'FOTO_AUSENTE', message: 'Seleciona uma imagem de perfil.' },
        });
      }

      const extensao = validarFotoPerfil(req.file.mimetype, req.file.buffer);
      if (!extensao) {
        return res.status(400).json({
          error: { code: 'FOTO_INVALIDA', message: 'O conteúdo do ficheiro não corresponde a uma imagem JPG, PNG ou WEBP válida.' },
        });
      }

      await fs.mkdir(DIRETORIO_UPLOAD, { recursive: true });
      const nome = `${crypto.randomUUID()}.${extensao}`;
      const caminho = path.join(DIRETORIO_UPLOAD, nome);
      const fotoPerfilUrl = `/uploads/perfis/${nome}`;
      await fs.writeFile(caminho, req.file.buffer, { flag: 'wx' });

      try {
        const atualizado = await atualizarFotoPerfil({
          utilizador: req.utilizador,
          fotoPerfilUrl,
        });
        await removerFotoAntiga(req.utilizador.fotoPerfilUrl);
        res.json({ data: atualizado });
      } catch (error) {
        try {
          await fs.unlink(caminho);
        } catch (erroLimpeza) {
          logger.warn('não foi possível remover foto após falha ao guardar perfil', {
            erro: erroLimpeza.message,
          });
        }
        throw error;
      }
    }),
  );

  router.delete('/me/foto', requireAuth, asyncRoute(async (req, res) => {
    const atualizado = await atualizarFotoPerfil({
      utilizador: req.utilizador,
      fotoPerfilUrl: null,
    });
    await removerFotoAntiga(req.utilizador.fotoPerfilUrl);
    res.json({ data: atualizado });
  }));

  router.patch('/me/password', requireAuth, asyncRoute(async (req, res) => {
    await alterarSenha({
      utilizador: req.utilizador,
      senhaAtual: req.body?.senhaAtual,
      novaSenha: req.body?.novaSenha,
    });
    res.status(204).send();
  }));

  // --- F12: Recuperação de senha (PÚBLICO - sem requireAuth) ---
  router.post('/forgot-password', asyncRoute(async (req, res) => {
    const resultado = await solicitarRecuperacao(req.body ?? {});
    res.json({ data: resultado });
  }));

  router.post('/reset-password', asyncRoute(async (req, res) => {
    const resultado = await confirmarRecuperacao(req.body ?? {});
    res.json({ data: resultado });
  }));

  router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError || err?.codigo === 'FOTO_INVALIDA') {
      return res.status(400).json({
        error: {
          code: 'FOTO_INVALIDA',
          message: err.code === 'LIMIT_FILE_SIZE'
            ? 'A imagem não pode exceder 5 MB.'
            : err.message,
        },
      });
    }
    next(err);
  });

  return router;
}