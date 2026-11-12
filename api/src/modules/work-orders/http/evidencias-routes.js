import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';

import { asyncRoute } from '../../../shared/http/async-route.js';
import { logger } from '../../../shared/logging/logger.js';

const UPLOAD_ROOT = path.resolve(process.env.UPLOAD_ROOT || 'uploads');
const UPLOAD_DIR = path.join(UPLOAD_ROOT, 'evidencias');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const TIPOS_PERMITIDOS = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || '';
    const nome = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, nome);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB
  },
  fileFilter(req, file, cb) {
    if (TIPOS_PERMITIDOS.has(file.mimetype)) {
      return cb(null, true);
    }
    const erro = new Error('Tipo de ficheiro não permitido. Usa JPG, PNG, WEBP, MP4, WEBM ou MOV.');
    erro.codigo = 'UPLOAD_INVALIDO';
    cb(erro);
  },
});

async function removerFicheiroCarregado(ficheiro) {
  try {
    await fs.promises.unlink(ficheiro.path);
  } catch (erro) {
    if (erro.code !== 'ENOENT') {
      logger.error('não foi possível remover ficheiro de evidência rejeitado', {
        erro: erro.message,
      });
    }
  }
}

export function createEvidenciasRouter({ evidencias, requireAuth, requireRole }) {
  const router = Router();
  const podeGerirEvidencias = [
    requireAuth,
    requireRole('MECANICO', 'FUNCIONARIO', 'ADMINISTRADOR'),
  ];

  // GET /ordens/:id/evidencias
  router.get(
    '/ordens/:id/evidencias',
    ...podeGerirEvidencias,
    asyncRoute(async (req, res) => {
      const resultado = await evidencias.listar({
        ordemId: req.params.id,
        utilizador: req.utilizador,
      });
      if (resultado.erro) {
        return res.status(resultado.erro.status).json({ erro: resultado.erro });
      }
      res.json({ data: resultado.data });
    }),
  );

  // POST /ordens/:id/evidencias
  router.post(
    '/ordens/:id/evidencias',
    ...podeGerirEvidencias,
    asyncRoute(async (req, res, next) => {
      const resultado = await evidencias.verificarAcessoEscrita({
        ordemId: req.params.id,
        utilizador: req.utilizador,
      });
      if (resultado.erro) {
        return res.status(resultado.erro.status).json({ erro: resultado.erro });
      }
      next();
    }),
    upload.single('file'),
    asyncRoute(async (req, res) => {
      if (!req.file) {
        return res.status(400).json({
          erro: {
            codigo: 'SEM_FICHEIRO',
            mensagem: 'Nenhum ficheiro recebido. Usa o campo "file".',
          },
        });
      }

      const url = `/uploads/evidencias/${req.file.filename}`;
      let resultado;
      try {
        resultado = await evidencias.registar({
          ordemId: req.params.id,
          utilizador: req.utilizador,
          ficheiro: req.file,
          tipo: req.body?.tipo,
          referenciaId: req.body?.referenciaId,
          legenda: req.body?.legenda,
          url,
        });
      } catch (erro) {
        await removerFicheiroCarregado(req.file);
        throw erro;
      }
      if (resultado.erro) {
        await removerFicheiroCarregado(req.file);
        return res.status(resultado.erro.status).json({ erro: resultado.erro });
      }
      res.status(201).json({ data: resultado.data });
    }),
  );

  // Handler de erros do multer/upload
  router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        erro: {
          codigo: 'UPLOAD_INVALIDO',
          mensagem: err.message,
        },
      });
    }

    if (err?.codigo === 'UPLOAD_INVALIDO') {
      return res.status(400).json({
        erro: {
          codigo: 'UPLOAD_INVALIDO',
          mensagem: err.message,
        },
      });
    }

    next(err);
  });

  return router;
}