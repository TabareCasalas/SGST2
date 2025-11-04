import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

// Helper function to create audit log
async function createAuditLog(
  tipo_entidad: string,
  id_entidad: number | null,
  accion: string,
  detalles?: string,
  id_usuario?: number,
  ip_address?: string
) {
  try {
    await prisma.auditoria.create({
      data: {
        id_usuario: id_usuario || null,
        tipo_entidad,
        id_entidad,
        accion,
        detalles,
        ip_address: ip_address || null,
      },
    });
  } catch (error) {
    console.error('Error creating audit log:', error);
  }
}

export const usuarioController = {
  async getAll(req: Request, res: Response) {
    try {
      const { rol, activo, search } = req.query;
      
      const where: any = {};
      
      if (rol) where.rol = rol;
      if (activo !== undefined) where.activo = activo === 'true';
      if (search) {
        where.OR = [
          { nombre: { contains: search as string, mode: 'insensitive' } },
          { ci: { contains: search as string, mode: 'insensitive' } },
          { correo: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      const usuarios = await prisma.usuario.findMany({
        where,
        include: {
          consultantes: {
            include: {
              tramites: {
                take: 5,
                orderBy: { fecha_inicio: 'desc' },
              },
            },
          },
          grupos_participa: {
            include: {
              grupo: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
      });
      
      // Log audit
      await createAuditLog(
        'usuario',
        null,
        'listar',
        `Listado de usuarios consultado${search ? ` con filtro: ${search}` : ''}`,
        undefined,
        req.ip
      );

      res.json(usuarios);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const usuario = await prisma.usuario.findUnique({
        where: { id_usuario: parseInt(id) },
        include: {
          consultantes: {
            include: {
              tramites: {
                include: {
                  grupo: true,
                },
                orderBy: { fecha_inicio: 'desc' },
              },
            },
          },
          grupos_participa: {
            include: {
              grupo: true,
            },
          },
          auditorias: {
            take: 10,
            orderBy: { created_at: 'desc' },
          },
        },
      });

      if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Log audit
      await createAuditLog(
        'usuario',
        parseInt(id),
        'consultar',
        `Usuario consultado: ${usuario.nombre}`,
        undefined,
        req.ip
      );

      res.json(usuario);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const { nombre, ci, domicilio, telefono, correo, password, rol, semestre, id_grupo, nivel_acceso } = req.body;

      if (!nombre || !ci || !domicilio || !telefono || !correo || !password) {
        return res.status(400).json({ error: 'Todos los campos básicos son requeridos (incluyendo contraseña)' });
      }

      // Validar longitud mínima de contraseña
      if (password.length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
      }

      // Validate role - using the new unified roles
      const validRoles = [
        'estudiante', 
        'docente', 
        'consultante', 
        'administrador'
      ];
      if (rol && !validRoles.includes(rol)) {
        return res.status(400).json({ error: 'Rol inválido' });
      }

      // If role is administrador, validate nivel_acceso
      if (rol === 'administrador') {
        if (!nivel_acceso || ![1, 2, 3].includes(parseInt(nivel_acceso))) {
          return res.status(400).json({ error: 'nivel_acceso es requerido para administradores y debe ser 1, 2 o 3' });
        }
      }

      // If role is estudiante, validate semester
      if (rol === 'estudiante' && !semestre) {
        return res.status(400).json({ error: 'El semestre es requerido para estudiantes' });
      }

      // Hashear la contraseña
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      const usuario = await prisma.usuario.create({
        data: {
          nombre,
          ci,
          domicilio,
          telefono,
          correo,
          password: hashedPassword,
          rol: rol || 'estudiante',
          nivel_acceso: rol === 'administrador' ? parseInt(nivel_acceso) : null,
          semestre: semestre || null,
          activo: true,
        },
        include: {
          grupos_participa: {
            include: {
              grupo: true,
            },
          },
        },
      });

      // If id_grupo is provided (for estudiantes), add them to the group
      if (id_grupo && rol === 'estudiante') {
        await prisma.usuarioGrupo.create({
          data: {
            id_usuario: usuario.id_usuario,
            id_grupo: parseInt(id_grupo),
            rol_en_grupo: 'estudiante',
          },
        });
      }

      // Log audit
      await createAuditLog(
        'usuario',
        usuario.id_usuario,
        'crear',
        `Usuario creado: ${usuario.nombre} (${usuario.rol})`,
        undefined,
        req.ip
      );

      res.status(201).json(usuario);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Ya existe un usuario con ese CI o correo' });
      }
      res.status(500).json({ error: error.message });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { nombre, ci, domicilio, telefono, correo, rol, semestre, nivel_acceso } = req.body;

      // Get current user to compare changes
      const currentUser = await prisma.usuario.findUnique({
        where: { id_usuario: parseInt(id) },
      });

      if (!currentUser) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Validate role - using the new unified roles
      const validRoles = [
        'estudiante', 
        'docente', 
        'consultante', 
        'administrador'
      ];
      if (rol && !validRoles.includes(rol)) {
        return res.status(400).json({ error: 'Rol inválido' });
      }

      // If role is administrador, validate nivel_acceso
      if (rol === 'administrador') {
        if (nivel_acceso !== undefined && nivel_acceso !== null && ![1, 2, 3].includes(parseInt(nivel_acceso))) {
          return res.status(400).json({ error: 'nivel_acceso debe ser 1, 2 o 3 para administradores' });
        }
      }

      // Track changes for audit
      const changes: string[] = [];
      if (nombre && nombre !== currentUser.nombre) changes.push(`nombre: ${currentUser.nombre} → ${nombre}`);
      if (ci && ci !== currentUser.ci) changes.push(`ci: ${currentUser.ci} → ${ci}`);
      if (correo && correo !== currentUser.correo) changes.push(`correo: ${currentUser.correo} → ${correo}`);
      if (rol && rol !== currentUser.rol) changes.push(`rol: ${currentUser.rol} → ${rol}`);
      if (semestre && semestre !== currentUser.semestre) changes.push(`semestre: ${currentUser.semestre} → ${semestre}`);
      if (nivel_acceso !== undefined && nivel_acceso !== null && parseInt(nivel_acceso) !== currentUser.nivel_acceso) {
        changes.push(`nivel_acceso: ${currentUser.nivel_acceso || 'null'} → ${nivel_acceso}`);
      }

      const usuario = await prisma.usuario.update({
        where: { id_usuario: parseInt(id) },
        data: {
          nombre,
          ci,
          domicilio,
          telefono,
          correo,
          rol,
          nivel_acceso: rol === 'administrador' && nivel_acceso !== undefined && nivel_acceso !== null 
            ? parseInt(nivel_acceso) 
            : rol === 'administrador' 
              ? currentUser.nivel_acceso 
              : null,
          semestre,
        },
        include: {
          grupos_participa: {
            include: {
              grupo: true,
            },
          },
        },
      });

      // Log audit
      await createAuditLog(
        'usuario',
        usuario.id_usuario,
        'modificar',
        `Cambios: ${changes.join(', ')}`,
        undefined,
        req.ip
      );

      res.json(usuario);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Ya existe un usuario con ese CI o correo' });
      }
      res.status(500).json({ error: error.message });
    }
  },

  async deactivate(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const usuario = await prisma.usuario.findUnique({
        where: { id_usuario: parseInt(id) },
        include: {
          consultantes: {
            include: {
              tramites: {
                where: {
                  estado: {
                    notIn: ['cerrado', 'finalizado'],
                  },
                },
              },
            },
          },
        },
      });

      if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Check if user has active cases
      const hasActiveCases = usuario.consultantes.some(
        consultante => consultante.tramites.length > 0
      );

      if (hasActiveCases) {
        return res.status(400).json({
          error: 'No se puede desactivar el usuario porque tiene trámites activos',
          tramitesActivos: usuario.consultantes.flatMap(c => c.tramites),
        });
      }

      const usuarioDesactivado = await prisma.usuario.update({
        where: { id_usuario: parseInt(id) },
        data: {
          activo: false,
        },
        include: {
          grupos_participa: {
            include: {
              grupo: true,
            },
          },
        },
      });

      // Log audit
      await createAuditLog(
        'usuario',
        usuario.id_usuario,
        'desactivar',
        `Usuario desactivado: ${usuario.nombre}`,
        undefined,
        req.ip
      );

      res.json(usuarioDesactivado);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      res.status(500).json({ error: error.message });
    }
  },

  async activate(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const usuario = await prisma.usuario.update({
        where: { id_usuario: parseInt(id) },
        data: {
          activo: true,
        },
        include: {
          grupos_participa: {
            include: {
              grupo: true,
            },
          },
        },
      });

      // Log audit
      await createAuditLog(
        'usuario',
        usuario.id_usuario,
        'activar',
        `Usuario activado: ${usuario.nombre}`,
        undefined,
        req.ip
      );

      res.json(usuario);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      res.status(500).json({ error: error.message });
    }
  },

  async getAuditoria(req: Request, res: Response) {
    try {
      const { tipo_entidad, id_entidad, accion } = req.query;

      const where: any = {};
      if (tipo_entidad) where.tipo_entidad = tipo_entidad;
      if (id_entidad) where.id_entidad = parseInt(id_entidad as string);
      if (accion) where.accion = accion;

      const auditorias = await prisma.auditoria.findMany({
        where,
        include: {
          usuario: true,
        },
        orderBy: { created_at: 'desc' },
        take: 100,
      });

      res.json(auditorias);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
};
