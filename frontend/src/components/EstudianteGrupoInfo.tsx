import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ApiService } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import './EstudianteGrupoInfo.css';

interface Grupo {
  id_grupo: number;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  miembros_grupo?: Array<{
    id_usuario_grupo: number;
    rol_en_grupo: string;
    usuario: {
      id_usuario: number;
      nombre: string;
      ci: string;
      correo: string;
      telefono: string;
    };
  }>;
}

export function EstudianteGrupoInfo() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [grupo, setGrupo] = useState<Grupo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGrupoInfo();
  }, [user]);

  const loadGrupoInfo = async () => {
    if (!user || !user.grupos_participa || user.grupos_participa.length === 0) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Obtener el primer grupo (el estudiante solo puede estar en un grupo)
      const grupoParticipacion = user.grupos_participa[0];
      const grupoCompleto = await ApiService.getGrupoById(grupoParticipacion.id_grupo);
      setGrupo(grupoCompleto);
    } catch (err: any) {
      showToast(`Error al cargar información del grupo: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const getMiembrosByRol = (rol: string) => {
    return grupo?.miembros_grupo?.filter(m => m.rol_en_grupo === rol) || [];
  };

  if (loading) {
    return (
      <div className="estudiante-grupo-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando información del grupo...</p>
        </div>
      </div>
    );
  }

  if (!user || !user.grupos_participa || user.grupos_participa.length === 0) {
    return (
      <div className="estudiante-grupo-container">
        <div className="no-grupo-message">
          <div className="no-grupo-icon">👥</div>
          <h2>No estás asignado a ningún grupo</h2>
          <p>Contacta con un administrador para ser asignado a un grupo.</p>
        </div>
      </div>
    );
  }

  if (!grupo) {
    return (
      <div className="estudiante-grupo-container">
        <div className="error-message">
          <p>No se pudo cargar la información del grupo.</p>
        </div>
      </div>
    );
  }

  const responsables = getMiembrosByRol('responsable');
  const asistentes = getMiembrosByRol('asistente');
  const estudiantes = getMiembrosByRol('estudiante');

  return (
    <div className="estudiante-grupo-container">
      <div className="grupo-header">
        <div className="grupo-title-section">
          <h1 className="grupo-name">{grupo.nombre}</h1>
          <div className="grupo-status">
            <span className={`status-badge ${grupo.activo ? 'activo' : 'inactivo'}`}>
              {grupo.activo ? '✓ Activo' : '⏸ Inactivo'}
            </span>
          </div>
        </div>
        {grupo.descripcion && (
          <p className="grupo-descripcion">{grupo.descripcion}</p>
        )}
      </div>

      <div className="grupo-info-grid">
        {/* Docente Responsable */}
        <div className="info-card responsable-card">
          <div className="card-header">
            <h3>👨‍🏫 Docente Responsable</h3>
          </div>
          <div className="card-content">
            {responsables.length > 0 ? (
              responsables.map((responsable) => (
                <div key={responsable.id_usuario_grupo} className="miembro-info">
                  <div className="miembro-nombre">{responsable.usuario.nombre}</div>
                  <div className="miembro-details">
                    <span>📧 {responsable.usuario.correo}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-miembros">Sin responsable asignado</p>
            )}
          </div>
        </div>

        {/* Docentes Asistentes */}
        <div className="info-card asistentes-card">
          <div className="card-header">
            <h3>👨‍🏫 Docentes Asistentes ({asistentes.length})</h3>
          </div>
          <div className="card-content">
            {asistentes.length > 0 ? (
              <div className="miembros-list">
                {asistentes.map((asistente) => (
                  <div key={asistente.id_usuario_grupo} className="miembro-item">
                    <div className="miembro-nombre">{asistente.usuario.nombre}</div>
                    <div className="miembro-details">
                      <span>📧 {asistente.usuario.correo}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-miembros">Sin asistentes asignados</p>
            )}
          </div>
        </div>

        {/* Estudiantes del Grupo */}
        <div className="info-card estudiantes-card">
          <div className="card-header">
            <h3>👨‍🎓 Estudiantes del Grupo ({estudiantes.length})</h3>
          </div>
          <div className="card-content">
            {estudiantes.length > 0 ? (
              <div className="miembros-list">
                {estudiantes.map((estudiante) => {
                  const esYo = estudiante.usuario.id_usuario === user.id_usuario;
                  return (
                    <div 
                      key={estudiante.id_usuario_grupo} 
                      className={`miembro-item ${esYo ? 'mi-propio' : ''}`}
                    >
                      <div className="miembro-nombre">
                        {estudiante.usuario.nombre}
                        {esYo && <span className="badge-yo">Tú</span>}
                      </div>
                      <div className="miembro-details">
                        <span>CI: {estudiante.usuario.ci}</span>
                        <span>📞 {estudiante.usuario.telefono}</span>
                        <span>📧 {estudiante.usuario.correo}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="no-miembros">Sin estudiantes asignados</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

