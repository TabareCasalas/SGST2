import express from 'express';
import { hojaRutaController } from '../controllers/hojaRutaController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Ruta: GET /api/hoja-ruta/tramite/:id_tramite
router.get('/tramite/:id_tramite', hojaRutaController.getByTramite);

// Ruta: POST /api/hoja-ruta
router.post('/', hojaRutaController.create);

// Ruta: PATCH /api/hoja-ruta/:id
router.patch('/:id', hojaRutaController.update);

// Ruta: DELETE /api/hoja-ruta/:id
router.delete('/:id', hojaRutaController.delete);

export default router;

