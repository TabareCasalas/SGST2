import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const hojaRutaController = {
  // Obtener todas las actuaciones de un trámite
  async getByTramite(req: Request, res: Response) {
    try {
      const { id_tramite } = req.params;
      
      const hojaRuta = await prisma.hojaRuta.findMany({
        where: { id_tramite: parseInt(id_tramite) },
        include: {
          usuario: {
            select: {
              id_usuario: true,
              nombre: true,
              ci: true,
            },
          },
        },
        orderBy: {
          fecha_actuacion: 'desc',
        },
      });

      res.json(hojaRuta);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // Crear una nueva actuación
  async create(req: Request, res: Response) {
    try {
      const { id_tramite, fecha_actuacion, descripcion } = req.body;
      const id_usuario = req.user?.id; // Del token JWT (el JWT usa 'id' no 'id_usuario')

      if (!id_tramite || !descripcion) {
        return res.status(400).json({ error: 'id_tramite y descripcion son requeridos' });
      }

      if (!id_usuario) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      // Verificar que el trámite existe y obtener el grupo
      const tramite = await prisma.tramite.findUnique({
        where: { id_tramite: parseInt(id_tramite) },
        include: {
          grupo: {
            include: {
              miembros_grupo: true,
            },
          },
        },
      });

      if (!tramite) {
        return res.status(404).json({ error: 'Trámite no encontrado' });
      }

      // Verificar que el usuario es estudiante del grupo del trámite
      const esEstudianteDelGrupo = tramite.grupo.miembros_grupo.some(
        mg => mg.id_usuario === id_usuario && mg.rol_en_grupo === 'estudiante'
      );

      if (!esEstudianteDelGrupo) {
        return res.status(403).json({ error: 'Solo los estudiantes del grupo pueden agregar actuaciones' });
      }

      // Crear la actuación
      const actuacion = await prisma.hojaRuta.create({
        data: {
          id_tramite: parseInt(id_tramite),
          id_usuario,
          fecha_actuacion: fecha_actuacion ? new Date(fecha_actuacion) : new Date(),
          descripcion,
        },
        include: {
          usuario: {
            select: {
              id_usuario: true,
              nombre: true,
              ci: true,
            },
          },
        },
      });

      res.status(201).json(actuacion);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Ya existe una actuación con esos datos' });
      }
      res.status(500).json({ error: error.message });
    }
  },

  // Actualizar una actuación
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { fecha_actuacion, descripcion } = req.body;
      const id_usuario = req.user?.id; // Del token JWT

      if (!id_usuario) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      // Verificar que la actuación existe y pertenece al usuario
      const actuacion = await prisma.hojaRuta.findUnique({
        where: { id_hoja_ruta: parseInt(id) },
      });

      if (!actuacion) {
        return res.status(404).json({ error: 'Actuación no encontrada' });
      }

      if (actuacion.id_usuario !== id_usuario) {
        return res.status(403).json({ error: 'Solo puedes editar tus propias actuaciones' });
      }

      const updateData: any = {};
      if (fecha_actuacion) updateData.fecha_actuacion = new Date(fecha_actuacion);
      if (descripcion !== undefined) updateData.descripcion = descripcion;

      const actuacionActualizada = await prisma.hojaRuta.update({
        where: { id_hoja_ruta: parseInt(id) },
        data: updateData,
        include: {
          usuario: {
            select: {
              id_usuario: true,
              nombre: true,
              ci: true,
            },
          },
        },
      });

      res.json(actuacionActualizada);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Actuación no encontrada' });
      }
      res.status(500).json({ error: error.message });
    }
  },

  // Eliminar una actuación
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const id_usuario = req.user?.id; // Del token JWT

      if (!id_usuario) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      // Verificar que la actuación existe y pertenece al usuario
      const actuacion = await prisma.hojaRuta.findUnique({
        where: { id_hoja_ruta: parseInt(id) },
      });

      if (!actuacion) {
        return res.status(404).json({ error: 'Actuación no encontrada' });
      }

      if (actuacion.id_usuario !== id_usuario) {
        return res.status(403).json({ error: 'Solo puedes eliminar tus propias actuaciones' });
      }

      await prisma.hojaRuta.delete({
        where: { id_hoja_ruta: parseInt(id) },
      });

      res.json({ message: 'Actuación eliminada exitosamente' });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Actuación no encontrada' });
      }
      res.status(500).json({ error: error.message });
    }
  },
};

