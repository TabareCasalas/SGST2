import { Client, logger } from 'camunda-external-task-client-js';
import axios from 'axios';
import dotenv from 'dotenv';
import express from 'express';
import { join } from 'path';

dotenv.config();

const app = express();
const PORT = process.env.ORCHESTRATOR_PORT || 3002;

// Configuración del cliente de Camunda
const config = {
  baseUrl: process.env.CAMUNDA_URL || 'http://localhost:8081/engine-rest',
  use: logger,
  maxTasks: 1,
  lockDuration: 30000,
  autoPoll: true,
  asyncResponseTimeout: 30000,
  interceptors: [
    function (client: any, task: any, callback: any) {
      logger.info(`Task received: ${task.id} of type: ${task.topicName}`);
      callback();
    },
  ],
};

// Crear instancia del cliente
const client = new Client(config);

// Servicio para comunicación con el backend
const backendService = axios.create({
  baseURL: process.env.BACKEND_URL || 'http://backend:3001',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Handler para crear trámite
client.subscribe('crear-tramite', async ({ task, taskService }) => {
  try {
    logger.info('📝 Procesando creación de trámite...');
    
    const { id_consultante, id_grupo, num_carpeta, observaciones } = task.variables.getAllTyped();

    const tramiteData = {
      id_consultante: id_consultante.value,
      id_grupo: id_grupo.value,
      num_carpeta: num_carpeta.value,
      observaciones: observaciones.value,
    };

    logger.info('📤 Enviando datos al backend:', tramiteData);

    // Llamar al backend para crear el trámite
    const response = await backendService.post('/api/tramites', tramiteData);

    logger.info('✅ Trámite creado exitosamente:', response.data);

    // Completar la tarea en Camunda
    await taskService.complete(task);

    logger.info('✅ Tarea completada en Camunda');
  } catch (error: any) {
    logger.error('❌ Error al crear trámite:', error.message);
    
    // Manejar error en Camunda
    await taskService.handleBpmnError(
      task,
      'TRAMITE_ERROR',
      error.response?.data?.error || 'Error al crear trámite',
      {}
    );
  }
});

// Handler para actualizar estado del trámite
client.subscribe('actualizar-estado', async ({ task, taskService }) => {
  try {
    logger.info('🔄 Procesando actualización de estado...');

    const { id_tramite, estado, observaciones } = task.variables.getAllTyped();

    const updateData = {
      estado: estado.value,
      observaciones: observaciones.value,
    };

    logger.info('📤 Actualizando trámite:', { id_tramite: id_tramite.value, ...updateData });

    // Llamar al backend para actualizar
    await backendService.patch(`/api/tramites/${id_tramite.value}`, updateData);

    logger.info('✅ Trámite actualizado exitosamente');

    await taskService.complete(task);
  } catch (error: any) {
    logger.error('❌ Error al actualizar trámite:', error.message);
    
    await taskService.handleBpmnError(
      task,
      'UPDATE_ERROR',
      error.response?.data?.error || 'Error al actualizar trámite',
      {}
    );
  }
});

// Handler para notificar
client.subscribe('enviar-notificacion', async ({ task, taskService }) => {
  try {
    logger.info('📧 Procesando notificación...');

    const { id_tramite, tipo_notificacion, mensaje } = task.variables.getAllTyped();

    logger.info('📤 Enviando notificación:', {
      id_tramite: id_tramite.value,
      tipo: tipo_notificacion.value,
      mensaje: mensaje.value,
    });

    // Llamar al backend para enviar notificación
    await backendService.post('/api/tramites/notificar', {
      id_tramite: id_tramite.value,
      tipo_notificacion: tipo_notificacion.value,
      mensaje: mensaje.value,
    });

    logger.info('✅ Notificación enviada exitosamente');

    await taskService.complete(task);
  } catch (error: any) {
    logger.error('❌ Error al enviar notificación:', error.message);
    
    await taskService.handleBpmnError(
      task,
      'NOTIFICATION_ERROR',
      error.response?.data?.error || 'Error al enviar notificación',
      {}
    );
  }
});

// Servidor Express para health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'orchestrator',
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  logger.info(`🚀 Orchestrator iniciado en puerto ${PORT}`);
  logger.info(`📡 Conectado a Camunda: ${config.baseUrl}`);
  logger.info(`🔗 Backend URL: ${process.env.BACKEND_URL || 'http://backend:3001'}`);
});

// Manejo de errores no capturados
process.on('unhandledRejection', (error) => {
  logger.error('❌ Error no manejado:', error);
});

