import express from 'express';
import { getRoles, getPermissions } from './access.controller.js';
import { auth } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.use(auth);

router.get('/roles', getRoles);
router.get('/permissions', getPermissions);

export default router;
