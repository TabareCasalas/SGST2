import { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import './GruposList.css';

interface UsuarioGrupo {
  id_usuario_grupo: number;
  rol_en_grupo: string;
  usuario: {
    id_usuario: number;
    nombre: string;
    ci: string;
    rol: string;
  };
}

interface Usuario {
  id_usuario: number;
  nombre: string;
  ci: string;
  rol: string;
  activo?: boolean;
}

interface Grupo {
  id_grupo: number;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  miembros_grupo?: UsuarioGrupo[];
  tramites?: any[];
}

export function GruposList() {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGrupo, setSelectedGrupo] = useState<Grupo | null>(null);
  const [showModifyMembers, setShowModifyMembers] = useState(false);
  const [docentes, setDocentes] = useState<Usuario[]>([]);
  const [estudiantes, setEstudiantes] = useState<Usuario[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editFormData, setEditFormData] = useState({
    responsable_id: '',
    asistentes_ids: [] as string[],
    estudiantes_ids: [] as string[],
  });
  const { showToast } = useToast();
  const { user, hasRole } = useAuth();

  useEffect(() => {
    loadGrupos();
  }, [user]); // Recargar cuando cambia el usuario

  const loadGrupos = async () => {
    try {
      setLoading(true);
      let data = await ApiService.getGrupos();
      
      // Si es docente, filtrar solo grupos donde participa
      if (hasRole('docente') && user?.grupos_participa) {
        const gruposIds = user.grupos_participa.map(gp => gp.id_grupo);
        data = data.filter((g: Grupo) => gruposIds.includes(g.id_grupo));
      }
      // Admins ven todos los grupos
      
      setGrupos(data);
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const getMiembrosByRol = (grupo: Grupo, rol: string) => {
    return grupo.miembros_grupo?.filter(m => m.rol_en_grupo === rol) || [];
  };

  const loadDocentes = async () => {
    try {
      const allUsers = await ApiService.getUsuarios();
      const docentesList = allUsers.filter((u: Usuario) => {
        const esDocente = u.rol === 'docente';
        const esActivo = u.activo === true || u.activo === undefined || u.activo === null;
        return esDocente && esActivo;
      });
      setDocentes(docentesList);
    } catch (err: any) {
      showToast(`Error al cargar docentes: ${err.message}`, 'error');
    }
  };

  const loadEstudiantes = async () => {
    if (!selectedGrupo) return;
    
    try {
      const allUsers = await ApiService.getUsuarios();
      
      // Obtener IDs de estudiantes actuales del grupo
      const estudiantesActualesIds = getMiembrosByRol(selectedGrupo, 'estudiante')
        .map(e => e.usuario.id_usuario);
      
      // Filtrar estudiantes activos (incluir los que ya están en el grupo)
      const estudiantesList = allUsers.filter((u: any) => {
        const esEstudiante = u.rol === 'estudiante';
        const esActivo = u.activo === true || u.activo === undefined || u.activo === null;
        
        // Incluir estudiantes del grupo actual O estudiantes sin grupo
        const estaEnEsteGrupo = estudiantesActualesIds.includes(u.id_usuario);
        const yaEnOtroGrupo = u.grupos_participa && u.grupos_participa.length > 0 && !estaEnEsteGrupo;
        
        return esEstudiante && esActivo && (!yaEnOtroGrupo || estaEnEsteGrupo);
      });
      
      setEstudiantes(estudiantesList);
    } catch (err: any) {
      showToast(`Error al cargar estudiantes: ${err.message}`, 'error');
    }
  };

  const handleOpenModifyMembers = async () => {
    if (!selectedGrupo) return;
    
    setShowModifyMembers(true);
    setLoadingMembers(true);
    
    try {
      // Cargar docentes y estudiantes
      await Promise.all([loadDocentes(), loadEstudiantes()]);
      
      // Inicializar el formulario con los miembros actuales
      const responsable = getMiembrosByRol(selectedGrupo, 'responsable')[0];
      const asistentes = getMiembrosByRol(selectedGrupo, 'asistente');
      const estudiantes = getMiembrosByRol(selectedGrupo, 'estudiante');
      
      setEditFormData({
        responsable_id: responsable ? responsable.usuario.id_usuario.toString() : '',
        asistentes_ids: asistentes.map(a => a.usuario.id_usuario.toString()),
        estudiantes_ids: estudiantes.map(e => e.usuario.id_usuario.toString()),
      });
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleResponsableChange = (id: string) => {
    setEditFormData({ ...editFormData, responsable_id: id });
  };

  const handleAsistenteToggle = (id: string) => {
    const newAsistentes = editFormData.asistentes_ids.includes(id)
      ? editFormData.asistentes_ids.filter(aid => aid !== id)
      : [...editFormData.asistentes_ids, id];
    
    setEditFormData({ ...editFormData, asistentes_ids: newAsistentes });
  };

  const handleEstudianteToggle = (id: string) => {
    const newEstudiantes = editFormData.estudiantes_ids.includes(id)
      ? editFormData.estudiantes_ids.filter(eid => eid !== id)
      : [...editFormData.estudiantes_ids, id];
    
    setEditFormData({ ...editFormData, estudiantes_ids: newEstudiantes });
  };

  const handleSaveMembers = async () => {
    if (!selectedGrupo) return;

    if (!editFormData.responsable_id) {
      showToast('Debe seleccionar un docente responsable', 'error');
      return;
    }

    setSaving(true);

    try {
      // Obtener miembros actuales del grupo
      const miembrosActuales = selectedGrupo.miembros_grupo || [];
      
      // Obtener miembros deseados
      const responsableId = parseInt(editFormData.responsable_id);
      const asistentesIds = editFormData.asistentes_ids.map(id => parseInt(id));
      const estudiantesIds = editFormData.estudiantes_ids.map(id => parseInt(id));
      
      // Identificar miembros a eliminar (están en actuales pero no en deseados)
      const responsablesActuales = getMiembrosByRol(selectedGrupo, 'responsable');
      const asistentesActuales = getMiembrosByRol(selectedGrupo, 'asistente');
      const estudiantesActuales = getMiembrosByRol(selectedGrupo, 'estudiante');
      
      // Manejar cambio de responsable
      // El backend ahora maneja el cambio automáticamente si el usuario ya está en el grupo
      // O si agregamos un nuevo responsable, convierte el actual en asistente automáticamente
      const responsableActual = responsablesActuales[0];
      const esResponsableActual = responsableActual && responsableActual.usuario.id_usuario === responsableId;
      
      // Guardar el ID del responsable anterior para limpiarlo después si no está en asistentes
      const responsableAnteriorId = responsableActual ? responsableActual.usuario.id_usuario : null;
      
      if (!esResponsableActual) {
        // Verificar si el nuevo responsable ya es miembro del grupo
        const todosLosMiembros = selectedGrupo.miembros_grupo || [];
        const nuevoResponsableComoMiembro = todosLosMiembros.find(
          m => m.usuario.id_usuario === responsableId
        );
        
        if (nuevoResponsableComoMiembro) {
          // El nuevo responsable ya está en el grupo con otro rol
          // El backend lo actualizará automáticamente a responsable y convertirá el actual en asistente
          await ApiService.addMiembroGrupo(selectedGrupo.id_grupo, {
            id_usuario: responsableId,
            rol_en_grupo: 'responsable',
          });
        } else {
          // El nuevo responsable no está en el grupo
          // El backend lo agregará como responsable y convertirá el actual en asistente automáticamente
          await ApiService.addMiembroGrupo(selectedGrupo.id_grupo, {
            id_usuario: responsableId,
            rol_en_grupo: 'responsable',
          });
        }
      }
      
      // Recargar el grupo después de cambiar el responsable para tener datos actualizados
      const grupoActualizadoParaAsistentes = await ApiService.getGrupoById(selectedGrupo.id_grupo);
      const asistentesActualesActualizados = grupoActualizadoParaAsistentes.miembros_grupo?.filter(
        (m: UsuarioGrupo) => m.rol_en_grupo === 'asistente'
      ) || [];
      
      // Recargar grupo nuevamente para tener los datos más recientes
      const grupoRecargado = await ApiService.getGrupoById(selectedGrupo.id_grupo);
      const asistentesActualesRecargados = grupoRecargado.miembros_grupo?.filter(
        (m: UsuarioGrupo) => m.rol_en_grupo === 'asistente'
      ) || [];
      const asistentesActualesIds = asistentesActualesRecargados.map(a => a.usuario.id_usuario);
      
      // Filtrar asistentes: excluir al responsable actual de los deseados
      const asistentesIdsFiltrados = asistentesIds
        .filter(id => id !== responsableId.toString())
        .map(id => parseInt(id));
      
      // Si el responsable anterior fue convertido a asistente pero no está en la lista deseada, eliminarlo
      if (responsableAnteriorId && !esResponsableActual && !asistentesIds.includes(responsableAnteriorId.toString())) {
        const responsableAnteriorComoAsistente = asistentesActualesRecargados.find(
          (a: UsuarioGrupo) => a.usuario.id_usuario === responsableAnteriorId
        );
        if (responsableAnteriorComoAsistente) {
          await ApiService.removeMiembroGrupo(selectedGrupo.id_grupo, responsableAnteriorComoAsistente.id_usuario_grupo);
        }
      }
      
      // Recargar nuevamente después de posibles cambios
      const grupoFinal = await ApiService.getGrupoById(selectedGrupo.id_grupo);
      const asistentesFinales = grupoFinal.miembros_grupo?.filter(
        (m: UsuarioGrupo) => m.rol_en_grupo === 'asistente'
      ) || [];
      const asistentesFinalesIds = asistentesFinales.map(a => a.usuario.id_usuario);
      
      // Eliminar asistentes que ya no están en la lista deseada
      for (const asistente of asistentesFinales) {
        if (!asistentesIdsFiltrados.includes(asistente.usuario.id_usuario)) {
          await ApiService.removeMiembroGrupo(selectedGrupo.id_grupo, asistente.id_usuario_grupo);
        }
      }
      
      // Agregar nuevos asistentes que no están en el grupo
      for (const asistenteId of asistentesIdsFiltrados) {
        if (!asistentesFinalesIds.includes(asistenteId)) {
          await ApiService.addMiembroGrupo(selectedGrupo.id_grupo, {
            id_usuario: asistenteId,
            rol_en_grupo: 'asistente',
          });
        }
      }
      
      // Actualizar estudiantes
      const estudiantesActualesIds = estudiantesActuales.map(e => e.usuario.id_usuario);
      // Eliminar estudiantes que ya no están en la lista
      for (const estudiante of estudiantesActuales) {
        if (!estudiantesIds.includes(estudiante.usuario.id_usuario)) {
          await ApiService.removeMiembroGrupo(selectedGrupo.id_grupo, estudiante.id_usuario_grupo);
        }
      }
      // Agregar nuevos estudiantes
      for (const estudianteId of estudiantesIds) {
        if (!estudiantesActualesIds.includes(estudianteId)) {
          await ApiService.addMiembroGrupo(selectedGrupo.id_grupo, {
            id_usuario: estudianteId,
            rol_en_grupo: 'estudiante',
          });
        }
      }
      
      showToast('Miembros actualizados exitosamente', 'success');
      setShowModifyMembers(false);
      
      // Recargar el grupo seleccionado
      const grupoActualizado = await ApiService.getGrupoById(selectedGrupo.id_grupo);
      setSelectedGrupo(grupoActualizado);
      loadGrupos();
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (id_usuario_grupo: number) => {
    if (!selectedGrupo) return;

    if (!window.confirm('¿Está seguro de que desea eliminar a este miembro del grupo?')) {
      return;
    }

    try {
      await ApiService.removeMiembroGrupo(selectedGrupo.id_grupo, id_usuario_grupo);
      showToast('Miembro eliminado exitosamente', 'success');
      // Recargar el grupo seleccionado
      const grupoActualizado = await ApiService.getGrupoById(selectedGrupo.id_grupo);
      setSelectedGrupo(grupoActualizado);
      loadGrupos();
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const canRemoveMember = (miembro: UsuarioGrupo) => {
    // No permitir eliminar al responsable si es el único
    if (miembro.rol_en_grupo === 'responsable') {
      const responsables = getMiembrosByRol(selectedGrupo!, 'responsable');
      return responsables.length > 1;
    }
    return true;
  };

  const handleToggleActivo = async (grupo: Grupo) => {
    const accion = grupo.activo ? 'desactivar' : 'activar';
    if (!window.confirm(`¿Está seguro de que desea ${accion} el grupo "${grupo.nombre}"?`)) {
      return;
    }

    try {
      if (grupo.activo) {
        await ApiService.deactivateGrupo(grupo.id_grupo);
        showToast('Grupo desactivado exitosamente', 'success');
      } else {
        await ApiService.activateGrupo(grupo.id_grupo);
        showToast('Grupo activado exitosamente', 'success');
      }
      
      // Recargar grupos y actualizar el grupo seleccionado si es el mismo
      await loadGrupos();
      if (selectedGrupo && selectedGrupo.id_grupo === grupo.id_grupo) {
        const grupoActualizado = await ApiService.getGrupoById(grupo.id_grupo);
        setSelectedGrupo(grupoActualizado);
      }
    } catch (err: any) {
      showToast(`Error al ${accion} grupo: ${err.message}`, 'error');
    }
  };

  if (loading) {
    return (
      <div className="grupos-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Cargando grupos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grupos-container">
      <div className="grupos-header">
        <h2>👥 Grupos de Trabajo</h2>
        <div className="stats">
          <div className="stat-card">
            <span className="stat-number">{grupos.length}</span>
            <span className="stat-label">Grupos totales</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{grupos.filter(g => g.activo).length}</span>
            <span className="stat-label">Grupos activos</span>
          </div>
        </div>
      </div>

      {grupos.length === 0 ? (
        <div className="no-grupos">
          <p>📭 No hay grupos registrados</p>
          <p className="hint">Crea un nuevo grupo para comenzar</p>
        </div>
      ) : (
        <div className="grupos-grid">
          {grupos.map((grupo) => {
            const responsables = getMiembrosByRol(grupo, 'responsable');
            const asistentes = getMiembrosByRol(grupo, 'asistente');
            const estudiantes = getMiembrosByRol(grupo, 'estudiante');

            return (
              <div 
                key={grupo.id_grupo} 
                className={`grupo-card ${!grupo.activo ? 'inactive' : ''}`}
                onClick={() => setSelectedGrupo(grupo)}
              >
                <div className="grupo-card-header">
                  <h3>{grupo.nombre}</h3>
                  <span className={`estado-badge ${grupo.activo ? 'activo' : 'inactivo'}`}>
                    {grupo.activo ? '✓ Activo' : '⏸ Inactivo'}
                  </span>
                </div>

                {grupo.descripcion && (
                  <p className="grupo-descripcion">{grupo.descripcion}</p>
                )}

                <div className="grupo-miembros">
                  <div className="miembro-seccion">
                    <h4>👨‍🏫 Responsable</h4>
                    {responsables.length > 0 ? (
                      responsables.map(r => (
                        <div key={r.id_usuario_grupo} className="miembro-item responsable">
                          {r.usuario.nombre}
                        </div>
                      ))
                    ) : (
                      <p className="no-miembros">Sin responsable</p>
                    )}
                  </div>

                  <div className="miembro-seccion">
                    <h4>👥 Asistentes ({asistentes.length})</h4>
                    {asistentes.length > 0 ? (
                      <div className="miembros-list">
                        {asistentes.slice(0, 3).map(a => (
                          <div key={a.id_usuario_grupo} className="miembro-item asistente">
                            {a.usuario.nombre}
                          </div>
                        ))}
                        {asistentes.length > 3 && (
                          <div className="miembro-item more">
                            +{asistentes.length - 3} más
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="no-miembros">Sin asistentes</p>
                    )}
                  </div>

                  {estudiantes.length > 0 && (
                    <div className="miembro-seccion">
                      <h4>👨‍🎓 Estudiantes ({estudiantes.length})</h4>
                      <div className="miembros-list">
                        {estudiantes.slice(0, 2).map(e => (
                          <div key={e.id_usuario_grupo} className="miembro-item estudiante">
                            {e.usuario.nombre}
                          </div>
                        ))}
                        {estudiantes.length > 2 && (
                          <div className="miembro-item more">
                            +{estudiantes.length - 2} más
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grupo-stats">
                  <div className="stat-item">
                    <span className="stat-icon">📋</span>
                    <span>{grupo.tramites?.length || 0} trámites</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-icon">👤</span>
                    <span>{grupo.miembros_grupo?.length || 0} miembros</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedGrupo && (
        <div className="modal-overlay" onClick={() => {
          setSelectedGrupo(null);
          setShowModifyMembers(false);
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2>{selectedGrupo.nombre}</h2>
                <span className={`estado-badge ${selectedGrupo.activo ? 'activo' : 'inactivo'}`}>
                  {selectedGrupo.activo ? '✓ Activo' : '⏸ Inactivo'}
                </span>
              </div>
              <button className="close-btn" onClick={() => {
                setSelectedGrupo(null);
                setShowModifyMembers(false);
              }}>×</button>
            </div>
            
            <div className="modal-body">
              {selectedGrupo.descripcion && (
                <p className="descripcion">{selectedGrupo.descripcion}</p>
              )}

              {!showModifyMembers ? (
                <>
                  <div className="detalle-miembros-header">
                    <h3>👥 Miembros del Grupo</h3>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      {hasRole('admin') && (
                        <button 
                          className={`btn-toggle-activo ${selectedGrupo.activo ? 'deactivate' : 'activate'}`}
                          onClick={() => handleToggleActivo(selectedGrupo)}
                          title={selectedGrupo.activo ? 'Desactivar grupo' : 'Activar grupo'}
                        >
                          {selectedGrupo.activo ? '⏸ Desactivar' : '▶ Activar'}
                        </button>
                      )}
                      {(hasRole('admin') || hasRole('docente')) && (
                        <button 
                          className="btn-add-member"
                          onClick={handleOpenModifyMembers}
                        >
                          ✏️ Modificar Miembros
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="detalle-miembros">
                    <div className="miembros-seccion">
                      <h4>👨‍🏫 Responsable</h4>
                      {getMiembrosByRol(selectedGrupo, 'responsable').map(m => (
                        <div key={m.id_usuario_grupo} className="detalle-miembro">
                          <div className="miembro-info">
                            <span className="nombre">{m.usuario.nombre}</span>
                            <span className="ci">CI: {m.usuario.ci}</span>
                          </div>
                          {canRemoveMember(m) && (hasRole('admin') || hasRole('docente')) && (
                            <button
                              className="btn-remove-member"
                              onClick={() => handleRemoveMember(m.id_usuario_grupo)}
                              title="Eliminar miembro"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                      {getMiembrosByRol(selectedGrupo, 'responsable').length === 0 && (
                        <p className="no-miembros-text">Sin responsable asignado</p>
                      )}
                    </div>

                    <div className="miembros-seccion">
                      <div className="miembros-seccion-header">
                        <h4>👥 Asistentes ({getMiembrosByRol(selectedGrupo, 'asistente').length})</h4>
                      </div>
                      {getMiembrosByRol(selectedGrupo, 'asistente').length > 0 ? (
                        getMiembrosByRol(selectedGrupo, 'asistente').map(m => (
                          <div key={m.id_usuario_grupo} className="detalle-miembro">
                            <div className="miembro-info">
                              <span className="nombre">{m.usuario.nombre}</span>
                              <span className="ci">CI: {m.usuario.ci}</span>
                            </div>
                            {(hasRole('admin') || hasRole('docente')) && (
                              <button
                                className="btn-remove-member"
                                onClick={() => handleRemoveMember(m.id_usuario_grupo)}
                                title="Eliminar miembro"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="no-miembros-text">Sin asistentes asignados</p>
                      )}
                    </div>

                    <div className="miembros-seccion">
                      <div className="miembros-seccion-header">
                        <h4>👨‍🎓 Estudiantes ({getMiembrosByRol(selectedGrupo, 'estudiante').length})</h4>
                      </div>
                      {getMiembrosByRol(selectedGrupo, 'estudiante').length > 0 ? (
                        getMiembrosByRol(selectedGrupo, 'estudiante').map(m => (
                          <div key={m.id_usuario_grupo} className="detalle-miembro">
                            <div className="miembro-info">
                              <span className="nombre">{m.usuario.nombre}</span>
                              <span className="ci">CI: {m.usuario.ci}</span>
                            </div>
                            {(hasRole('admin') || hasRole('docente')) && (
                              <button
                                className="btn-remove-member"
                                onClick={() => handleRemoveMember(m.id_usuario_grupo)}
                                title="Eliminar miembro"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="no-miembros-text">Sin estudiantes asignados</p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="add-member-form">
                  <h3>✏️ Modificar Miembros del Grupo</h3>
                  
                  {loadingMembers ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                      <p>Cargando miembros...</p>
                    </div>
                  ) : (
                    <>
                      <div className="form-content">
                        <div className="form-group">
                          <label htmlFor="responsable">Docente Responsable *</label>
                          <select
                            id="responsable"
                            value={editFormData.responsable_id}
                            onChange={(e) => handleResponsableChange(e.target.value)}
                            disabled={saving}
                            required
                          >
                            <option value="">Seleccionar docente responsable</option>
                            {docentes.map((d) => (
                              <option key={d.id_usuario} value={d.id_usuario.toString()}>
                                {d.nombre} - CI: {d.ci}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group">
                          <label>Docentes Asistentes (opcional)</label>
                          <div className="asistentes-list">
                            {docentes.filter(d => d.id_usuario.toString() !== editFormData.responsable_id).length === 0 ? (
                              <p className="no-docentes">
                                {editFormData.responsable_id 
                                  ? 'No hay más docentes disponibles como asistentes' 
                                  : 'Seleccione primero un responsable'}
                              </p>
                            ) : (
                              docentes
                                .filter(d => d.id_usuario.toString() !== editFormData.responsable_id)
                                .map((d) => (
                                  <div key={d.id_usuario} className="asistente-item">
                                    <label>
                                      <input
                                        type="checkbox"
                                        checked={editFormData.asistentes_ids.includes(d.id_usuario.toString())}
                                        onChange={() => handleAsistenteToggle(d.id_usuario.toString())}
                                        disabled={saving}
                                      />
                                      <span>{d.nombre} - CI: {d.ci}</span>
                                    </label>
                                  </div>
                                ))
                            )}
                          </div>
                          <p className="selection-count">
                            Seleccionados: {editFormData.asistentes_ids.length}
                          </p>
                        </div>

                        <div className="form-group">
                          <label>Estudiantes (opcional)</label>
                          <p className="hint-text" style={{ fontSize: '0.85em', color: '#666', marginBottom: '10px' }}>
                            Nota: Los estudiantes solo pueden pertenecer a un grupo. Si un estudiante ya está en otro grupo, no podrá agregarse.
                          </p>
                          <div className="estudiantes-list">
                            {estudiantes.length === 0 ? (
                              <p className="no-docentes">
                                No hay estudiantes disponibles
                              </p>
                            ) : (
                              estudiantes.map((e) => (
                                <div key={e.id_usuario} className="asistente-item">
                                  <label>
                                    <input
                                      type="checkbox"
                                      checked={editFormData.estudiantes_ids.includes(e.id_usuario.toString())}
                                      onChange={() => handleEstudianteToggle(e.id_usuario.toString())}
                                      disabled={saving}
                                    />
                                    <span>{e.nombre} - CI: {e.ci}</span>
                                  </label>
                                </div>
                              ))
                            )}
                          </div>
                          <p className="selection-count">
                            Seleccionados: {editFormData.estudiantes_ids.length}
                          </p>
                        </div>
                      </div>
                      
                      <div className="form-actions-container">
                        <div className="form-actions">
                          <button
                            className="btn-cancel"
                            onClick={() => setShowModifyMembers(false)}
                            disabled={saving}
                          >
                            Cancelar
                          </button>
                          <button
                            className="btn-submit"
                            onClick={handleSaveMembers}
                            disabled={saving || !editFormData.responsable_id}
                          >
                            {saving ? 'Guardando...' : '💾 Guardar Cambios'}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

