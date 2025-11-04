import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { iniciarProcesoEnCamunda } from '../services/orchestratorService';

export const tramiteController = {
  // Obtener todos los trámites
  async getAll(req: Request, res: Response) {
    try {
      const { estado, id_consultante, id_grupo } = req.query;

      const where: any = {};
      if (estado) where.estado = estado;
      if (id_consultante) where.id_consultante = parseInt(id_consultante as string);
      if (id_grupo) where.id_grupo = parseInt(id_grupo as string);

      const tramites = await prisma.tramite.findMany({
        where,
        include: {
          consultante: {
            include: {
              usuario: true,
            },
          },
          grupo: true,
          hoja_ruta: {
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
          },
          documentos: {
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
              created_at: 'desc',
            },
          },
        },
        orderBy: {
          fecha_inicio: 'desc',
        },
      });

      res.json(tramites);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // Obtener un trámite por ID
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const tramite = await prisma.tramite.findUnique({
        where: { id_tramite: parseInt(id) },
        include: {
          consultante: {
            include: {
              usuario: true,
            },
          },
          grupo: true,
          notificaciones: {
            orderBy: { created_at: 'desc' },
            take: 10,
          },
          hoja_ruta: {
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
          },
          documentos: {
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
              created_at: 'desc',
            },
          },
        },
      });

      if (!tramite) {
        return res.status(404).json({ error: 'Trámite no encontrado' });
      }

      res.json(tramite);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // Crear un nuevo trámite
  async create(req: Request, res: Response) {
    try {
      const { id_consultante, id_grupo, num_carpeta, observaciones } = req.body;

      // Validar datos requeridos
      if (!id_consultante || !id_grupo || !num_carpeta) {
        return res.status(400).json({
          error: 'id_consultante, id_grupo y num_carpeta son requeridos',
        });
      }

      // Verificar si el consultante existe
      const consultante = await prisma.consultante.findUnique({
        where: { id_consultante },
      });

      if (!consultante) {
        return res.status(404).json({ error: 'Consultante no encontrado' });
      }

      // Verificar si el grupo existe
      const grupo = await prisma.grupo.findUnique({
        where: { id_grupo },
      });

      if (!grupo) {
        return res.status(404).json({ error: 'Grupo no encontrado' });
      }

      // Verificar si ya existe un trámite con ese número de carpeta
      const tramiteExistente = await prisma.tramite.findUnique({
        where: { num_carpeta },
      });

      if (tramiteExistente) {
        return res.status(409).json({ error: 'Ya existe un trámite con ese número de carpeta' });
      }

      // Crear el trámite en la base de datos
      const tramite = await prisma.tramite.create({
        data: {
          id_consultante,
          id_grupo,
          num_carpeta,
          observaciones,
          estado: 'iniciado',
        },
        include: {
          consultante: {
            include: {
              usuario: true,
            },
          },
          grupo: true,
        },
      });

      console.log(`✅ Trámite creado: ${tramite.id_tramite}`);

      // Actualizar el estado a "iniciado" si no está especificado
      const estadoInicial = 'iniciado';
      await prisma.tramite.update({
        where: { id_tramite: tramite.id_tramite },
        data: { estado: estadoInicial },
      });

      // Iniciar proceso en Camunda con el nuevo proceso de grupos
      try {
        const processResult = await iniciarProcesoEnCamunda('procesoTramiteGrupos', {
          id_tramite: tramite.id_tramite,
          id_consultante: tramite.id_consultante,
          id_grupo: tramite.id_grupo,
          grupoNombre: `grupo_${grupo.nombre}`,
          num_carpeta: tramite.num_carpeta,
          estado: estadoInicial,
          observaciones: tramite.observaciones || '',
          validado: true,
        });

        // Actualizar estado a "en_revision" después de iniciar el proceso
        await prisma.tramite.update({
          where: { id_tramite: tramite.id_tramite },
          data: {
            estado: 'en_revision',
            process_instance_id: processResult.instanceId,
          },
        });

        console.log(`🚀 Proceso iniciado en Camunda (procesoTramiteGrupos): ${processResult.instanceId}`);
        console.log(`✅ Las tareas del BPMN están configuradas automáticamente con candidateGroup: grupo_${grupo.nombre}`);
      } catch (error: any) {
        console.error('⚠️  Error al iniciar proceso en Camunda:', error.message);
        // No fallamos la creación del trámite si Camunda falla
        // El trámite seguirá existiendo pero sin proceso
      }

      // Obtener el trámite actualizado para devolverlo
      const tramiteActualizado = await prisma.tramite.findUnique({
        where: { id_tramite: tramite.id_tramite },
        include: {
          consultante: { include: { usuario: true } },
          grupo: true,
        },
      });

      res.status(201).json(tramiteActualizado);
    } catch (error: any) {
      console.error('❌ Error al crear trámite:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Actualizar un trámite
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { estado, observaciones, fecha_cierre, motivo_cierre } = req.body;

      const updateData: any = {};
      if (estado !== undefined) updateData.estado = estado;
      if (observaciones !== undefined) updateData.observaciones = observaciones;
      if (fecha_cierre !== undefined) updateData.fecha_cierre = new Date(fecha_cierre);
      if (motivo_cierre !== undefined) updateData.motivo_cierre = motivo_cierre;

      const tramite = await prisma.tramite.update({
        where: { id_tramite: parseInt(id) },
        data: updateData,
        include: {
          consultante: {
            include: {
              usuario: true,
            },
          },
          grupo: true,
        },
      });

      console.log(`✅ Trámite actualizado: ${tramite.id_tramite}`);

      res.json(tramite);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Trámite no encontrado' });
      }
      res.status(500).json({ error: error.message });
    }
  },

  // Completar tarea manual (User Task) de Camunda
  async completarTarea(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { aprobado, observaciones, decision } = req.body;

      // Obtener el trámite
      const tramite = await prisma.tramite.findUnique({
        where: { id_tramite: parseInt(id) },
        include: {
          consultante: { include: { usuario: true } },
          grupo: true,
        },
      });

      if (!tramite) {
        return res.status(404).json({ error: 'Trámite no encontrado' });
      }

      if (!tramite.process_instance_id) {
        return res.status(400).json({ error: 'Este trámite no tiene un proceso asociado en Camunda' });
      }

      // Preparar las variables para Camunda
      const variables: Record<string, any> = {
        aprobado: { value: aprobado, type: 'Boolean' },
        decision: { value: decision || (aprobado ? 'aprobado' : 'rechazado'), type: 'String' },
      };

      if (observaciones) {
        variables.observaciones = { value: observaciones, type: 'String' };
      }

      // Llamar al orchestrator para completar la tarea en Camunda
      const orchestratorUrl = process.env.ORCHESTRATOR_URL || 'http://orchestrator:3002';
      const axios = require('axios');
      
      try {
        const response = await axios.post(
          `${orchestratorUrl}/api/procesos/${tramite.process_instance_id}/completar-tarea`,
          { variables }
        );

        // Actualizar el estado del trámite según la decisión (temporal hasta que el proceso finalice)
        const nuevoEstado = aprobado ? 'aprobado' : 'rechazado';
        await prisma.tramite.update({
          where: { id_tramite: parseInt(id) },
          data: {
            estado: nuevoEstado,
            observaciones: observaciones || tramite.observaciones,
          },
        });

        console.log(`✅ Tarea completada para trámite ${id}, decisión: ${decision}`);

        res.json({
          success: true,
          message: `Trámite ${aprobado ? 'aprobado' : 'rechazado'} exitosamente`,
          tramite: await prisma.tramite.findUnique({
            where: { id_tramite: parseInt(id) },
            include: { consultante: { include: { usuario: true } }, grupo: true },
          }),
        });
      } catch (error: any) {
        console.error('Error al completar tarea en Camunda:', error.message);
        res.status(500).json({
          error: 'Error al completar tarea en Camunda',
          details: error.response?.data || error.message,
        });
      }
    } catch (error: any) {
      console.error('❌ Error al completar tarea:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Eliminar trámite
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Por ahora, usamos hard delete
      // En producción, podrías implementar soft delete
      await prisma.tramite.delete({
        where: { id_tramite: parseInt(id) },
      });

      console.log(`🗑️  Trámite eliminado: ${id}`);

      res.json({ message: 'Trámite eliminado exitosamente' });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Trámite no encontrado' });
      }
      res.status(500).json({ error: error.message });
    }
  },

  // Enviar notificación
  async notificar(req: Request, res: Response) {
    try {
      const { id_tramite, tipo_notificacion, mensaje } = req.body;

      if (!id_tramite || !tipo_notificacion || !mensaje) {
        return res.status(400).json({
          error: 'id_tramite, tipo_notificacion y mensaje son requeridos',
        });
      }

      // Verificar que el trámite existe
      const tramite = await prisma.tramite.findUnique({
        where: { id_tramite },
      });

      if (!tramite) {
        return res.status(404).json({ error: 'Trámite no encontrado' });
      }

      // Crear la notificación en la base de datos
      const notificacion = await prisma.notificacion.create({
        data: {
          id_tramite,
          tipo_notificacion,
          mensaje,
          enviado: true,
        },
      });

      console.log(`📧 Notificación enviada para trámite ${id_tramite}`);

      res.json(notificacion);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // Obtener estadísticas de trámites
  async getStats(req: Request, res: Response) {
    try {
      const [total, porEstado] = await Promise.all([
        prisma.tramite.count(),
        prisma.tramite.groupBy({
          by: ['estado'],
          _count: true,
        }),
      ]);

      const stats = {
        total,
        porEstado: porEstado.reduce((acc: any, curr: any) => {
          acc[curr.estado] = curr._count;
          return acc;
        }, {}),
      };

      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
};


