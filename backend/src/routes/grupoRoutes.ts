import express from 'express';
import { grupoController } from '../controllers/grupoController';

const router = express.Router();

// Ruta: GET /api/grupos
router.get('/', grupoController.getAll);

// Ruta: GET /api/grupos/:id
router.get('/:id', grupoController.getById);

// Ruta: POST /api/grupos
router.post('/', grupoController.create);

// Ruta: PATCH /api/grupos/:id
router.patch('/:id', grupoController.update);

// Ruta: POST /api/grupos/:id/miembros
router.post('/:id/miembros', grupoController.addMiembro);

// Ruta: DELETE /api/grupos/:id/miembros/:id_usuario_grupo
router.delete('/:id/miembros/:id_usuario_grupo', grupoController.removeMiembro);

export default router;


