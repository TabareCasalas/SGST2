import express from 'express';
import { documentoController, uploadMiddleware } from '../controllers/documentoController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Ruta: GET /api/documentos/tramite/:id_tramite
router.get('/tramite/:id_tramite', documentoController.getByTramite);

// Ruta: POST /api/documentos/:id_tramite (subir archivo)
router.post('/:id_tramite', uploadMiddleware.single('archivo'), documentoController.upload);

// Ruta: GET /api/documentos/:id/download (descargar archivo)
router.get('/:id/download', documentoController.download);

// Ruta: DELETE /api/documentos/:id
router.delete('/:id', documentoController.delete);

export default router;

