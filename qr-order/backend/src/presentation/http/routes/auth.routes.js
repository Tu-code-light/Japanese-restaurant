import { Router } from 'express';
import { validate } from '../middlewares/validate.js';
import { loginDto } from '../dtos/auth.dto.js';

export function createAuthRoutes({ authController, authenticate, loginLimiter }) {
  const router = Router();
  router.post('/login', loginLimiter, validate({ body: loginDto }), authController.login);
  router.get('/me', authenticate, authController.me);
  return router;
}
