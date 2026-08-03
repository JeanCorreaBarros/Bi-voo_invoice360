import express from 'express';
import { getRoles, getPermissions } from './access.controller.js';
import { auth } from '../../middlewares/auth.middleware.js';
import { requireTenant } from '../../middlewares/tenant.middleware.js';

const router = express.Router();

// Este router se monta en el prefijo genérico '/api' (para exponer /api/roles
// y /api/permissions), así que los middlewares van por ruta y no con
// router.use(): un router.use() sin path acá interceptaría CUALQUIER
// request bajo /api/*, no solo las de este módulo.
router.get('/roles', auth, requireTenant, getRoles);
router.get('/permissions', auth, requireTenant, getPermissions);

export default router;
