import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'your-refresh-secret-change-in-production';
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutos
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 días

// Mapeo de tokens de refresco (en producción usar Redis)
const refreshTokens = new Set<string>();

export const authController = {
  /**
   * Login: Autenticar usuario por CI y contraseña
   */
  async login(req: Request, res: Response) {
    try {
      const { ci, password } = req.body;

      if (!ci || !password) {
        return res.status(400).json({ error: 'CI y contraseña son requeridos' });
      }

      // Buscar usuario por CI con información de grupos
      const usuario = await prisma.usuario.findUnique({
        where: { ci },
        include: {
          grupos_participa: {
            include: {
              grupo: true,
            },
          },
        },
      });

      if (!usuario) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      // Verificar que el usuario esté activo
      if (!usuario.activo) {
        return res.status(403).json({ error: 'Usuario inactivo' });
      }

      // Verificar que el usuario tenga contraseña configurada
      if (!usuario.password) {
        return res.status(401).json({ error: 'Usuario sin contraseña configurada' });
      }

      // Verificar contraseña
      const passwordMatch = await bcrypt.compare(password, usuario.password);

      if (!passwordMatch) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      // Generar tokens
      const accessToken = jwt.sign(
        { id: usuario.id_usuario, ci: usuario.ci, rol: usuario.rol },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
      );

      const refreshToken = jwt.sign(
        { id: usuario.id_usuario },
        REFRESH_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRY }
      );

      // Guardar refresh token
      refreshTokens.add(refreshToken);

      // Registrar auditoría
      await prisma.auditoria.create({
        data: {
          id_usuario: usuario.id_usuario,
          tipo_entidad: 'auth',
          accion: 'login',
          detalles: `Usuario ${usuario.nombre} inició sesión`,
          ip_address: req.ip || 'unknown',
        },
      });

      // Responder con tokens y datos del usuario (sin password)
      const { password: _, ...usuarioSinPassword } = usuario;
      
      res.json({
        accessToken,
        refreshToken,
        usuario: usuarioSinPassword,
      });
    } catch (error: any) {
      console.error('Error en login:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  /**
   * Logout: Invalidar refresh token
   */
  async logout(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        refreshTokens.delete(refreshToken);
      }

      res.json({ message: 'Sesión cerrada exitosamente' });
    } catch (error: any) {
      console.error('Error en logout:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  /**
   * Refresh: Generar nuevo access token usando refresh token
   */
  async refresh(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token requerido' });
      }

      // Verificar si el refresh token está en la lista
      if (!refreshTokens.has(refreshToken)) {
        return res.status(403).json({ error: 'Refresh token inválido' });
      }

      // Verificar el refresh token
      jwt.verify(refreshToken, REFRESH_SECRET, (err: any, decoded: any) => {
        if (err) {
          refreshTokens.delete(refreshToken);
          return res.status(403).json({ error: 'Refresh token expirado' });
        }

        // Generar nuevo access token
        const accessToken = jwt.sign(
          { id: decoded.id },
          JWT_SECRET,
          { expiresIn: ACCESS_TOKEN_EXPIRY }
        );

        res.json({ accessToken });
      });
    } catch (error: any) {
      console.error('Error en refresh:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  /**
   * Me: Obtener datos del usuario actual
   */
  async me(req: Request, res: Response) {
    try {
      // El middleware de autenticación debe haber agregado req.user
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'No autenticado' });
      }

      const usuario = await prisma.usuario.findUnique({
        where: { id_usuario: userId },
        include: {
          grupos_participa: {
            include: {
              grupo: true,
            },
          },
        },
      });

      if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Responder sin password
      const { password: _, ...usuarioSinPassword } = usuario;
      
      res.json(usuarioSinPassword);
    } catch (error: any) {
      console.error('Error en me:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },
};
