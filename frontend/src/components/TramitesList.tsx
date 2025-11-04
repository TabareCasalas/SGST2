import { useEffect, useState } from 'react';
import { ApiService } from '../services/api';
import type { Tramite } from '../types/tramite';
import { RechazoModal } from './RechazoModal';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  FaFileAlt, FaChevronDown, FaChevronUp, FaClock, FaCheckCircle, FaTimesCircle, 
  FaUser, FaUsers, FaFolderOpen, FaCalendarAlt, FaTrash, FaCommentAlt, FaSync,
  FaClipboardCheck, FaRoute, FaPaperclip
} from 'react-icons/fa';
import { HojaRutaModal } from './HojaRutaModal';
import { DocumentosModal } from './DocumentosModal';
import './TramitesList.css';

export function TramitesList() {
  const [tramites, setTramites] = useState<Tramite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [showRechazoModal, setShowRechazoModal] = useState(false);
  const [tramiteRechazar, setTramiteRechazar] = useState<number | null>(null);
  const [showConsultanteModal, setShowConsultanteModal] = useState(false);
  const [consultanteInfo, setConsultanteInfo] = useState<any>(null);
  const [loadingConsultante, setLoadingConsultante] = useState(false);
  const [showHojaRutaModal, setShowHojaRutaModal] = useState(false);
  const [tramiteHojaRuta, setTramiteHojaRuta] = useState<number | null>(null);
  const [showDocumentosModal, setShowDocumentosModal] = useState(false);
  const [tramiteDocumentos, setTramiteDocumentos] = useState<number | null>(null);
  const { showToast } = useToast();
  const { user, hasRole, hasAccessLevel } = useAuth();

  useEffect(() => {
    loadTramites();
    // Auto-refresh cada 30 segundos
    const interval = setInterval(loadTramites, 30000);
    return () => clearInterval(interval);
  }, [user]); // Recargar cuando cambia el usuario

  const loadTramites = async () => {
    try {
      setLoading(true);
      let data = await ApiService.getTramites();
      
      // Filtrar según rol
      if (hasRole('estudiante') && user?.grupos_participa) {
        // Estudiantes solo ven trámites de sus grupos asignados
        const gruposIds = user.grupos_participa.map(gp => gp.id_grupo);
        data = data.filter((t: Tramite) => gruposIds.includes(t.id_grupo));
      } else if (hasRole('consultante')) {
        // Consultantes solo ven sus propios trámites
        data = data.filter((t: Tramite) => t.consultante?.id_usuario === user?.id_usuario);
      } else if (hasRole('docente') && user?.grupos_participa) {
        // Docentes ven trámites de los grupos donde participan
        const gruposIds = user.grupos_participa.map(gp => gp.id_grupo);
        data = data.filter((t: Tramite) => gruposIds.includes(t.id_grupo));
      }
      // Admin ve todos los trámites
      
      setTramites(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (expandedRows.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este trámite?')) return;
    
    try {
      await ApiService.deleteTramite(id);
      await loadTramites();
      showToast('Trámite eliminado exitosamente', 'success');
    } catch (err: any) {
      showToast(`Error al eliminar: ${err.message}`, 'error');
    }
  };

  const handleCompletarTarea = async (id: number, aprobado: boolean) => {
    if (!aprobado) {
      setTramiteRechazar(id);
      setShowRechazoModal(true);
      return;
    }
    await ejecutarCompletar(id, true);
  };

  const handleConfirmarRechazo = async (razon: string) => {
    if (tramiteRechazar) {
      setShowRechazoModal(false);
      await ejecutarCompletar(tramiteRechazar, false, razon);
      setTramiteRechazar(null);
    }
  };

  const ejecutarCompletar = async (id: number, aprobado: boolean, razon?: string) => {
    try {
      await ApiService.completarTarea(id, aprobado, razon);
      await loadTramites();
      showToast(
        `Trámite ${aprobado ? 'aprobado' : 'rechazado'} exitosamente`,
        aprobado ? 'success' : 'info'
      );
    } catch (err: any) {
      showToast(`Error al completar tarea: ${err.message}`, 'error');
    }
  };

  const handleConsultanteClick = async (idConsultante: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasRole('estudiante')) return;
    
    try {
      setLoadingConsultante(true);
      const consultante = await ApiService.getConsultanteById(idConsultante);
      setConsultanteInfo(consultante);
      setShowConsultanteModal(true);
    } catch (err: any) {
      showToast(`Error al cargar información del consultante: ${err.message}`, 'error');
    } finally {
      setLoadingConsultante(false);
    }
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'iniciado': return <FaClock className="status-icon iniciado" />;
      case 'en_revision': return <FaSync className="status-icon en-revision spin" />;
      case 'aprobado': return <FaCheckCircle className="status-icon aprobado" />;
      case 'rechazado': return <FaTimesCircle className="status-icon rechazado" />;
      case 'cerrado': return <FaClipboardCheck className="status-icon cerrado" />;
      default: return <FaFileAlt className="status-icon" />;
    }
  };

  const getEstadoLabel = (estado: string) => {
    const labels: { [key: string]: string } = {
      iniciado: 'Iniciado',
      en_revision: 'En Revisión',
      aprobado: 'Aprobado',
      rechazado: 'Rechazado',
      cerrado: 'Cerrado',
    };
    return labels[estado] || estado;
  };

  if (loading && tramites.length === 0) return <div className="loading">Cargando trámites...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="tramites-container">
      <div className="tramites-header">
        <h2>📋 Lista de Trámites</h2>
        <div className="header-actions">
          <button onClick={loadTramites} className="refresh-btn" title="Actualizar">
            <FaSync /> Actualizar
          </button>
        </div>
      </div>

      {/* Tabla */}
      {tramites.length === 0 ? (
        <div className="empty-state">
          <p>No hay trámites registrados</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="tramites-table">
            <thead>
              <tr>
                <th></th>
                <th><FaFolderOpen /> Carpeta #</th>
                <th><FaUser /> Consultante</th>
                <th><FaUsers /> Grupo</th>
                <th><FaClipboardCheck /> Estado</th>
                <th><FaCalendarAlt /> Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tramites.map((tramite) => (
                <>
                  <tr 
                    key={tramite.id_tramite} 
                    className={`table-row ${tramite.estado === 'en_revision' ? 'highlight-row' : ''}`}
                    onClick={() => toggleRow(tramite.id_tramite)}
                  >
                    <td className="expand-icon">
                      {expandedRows.has(tramite.id_tramite) ? <FaChevronUp /> : <FaChevronDown />}
                    </td>
                    <td className="folder-number">
                      <strong>{tramite.num_carpeta}</strong>
                    </td>
                    <td className="consultante-name">
                      {tramite.consultante && hasRole('estudiante') ? (
                        <button
                          className="consultante-link-btn"
                          onClick={(e) => handleConsultanteClick(tramite.consultante!.id_consultante, e)}
                          title="Ver información completa del consultante"
                        >
                          {tramite.consultante.usuario?.nombre || 'N/A'}
                        </button>
                      ) : (
                        tramite.consultante?.usuario?.nombre || 'N/A'
                      )}
                    </td>
                    <td>
                      {tramite.grupo?.nombre || 'N/A'}
                    </td>
                    <td>
                      <div className="estado-badge-container">
                        {getEstadoIcon(tramite.estado)}
                        <span className={`estado-badge estado-${tramite.estado}`}>
                          {getEstadoLabel(tramite.estado)}
                        </span>
                      </div>
                    </td>
                    <td>
                      {new Date(tramite.fecha_inicio).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="action-buttons">
                      {/* Solo docentes responsables y admins docente/sistema pueden aprobar/rechazar */}
                      {tramite.estado === 'en_revision' && (
                        (hasRole('admin') && hasAccessLevel(2)) || 
                        (hasRole('docente') && user?.grupos_participa?.some(
                          gp => gp.id_grupo === tramite.id_grupo && gp.rol_en_grupo === 'responsable'
                        ))
                      ) && (
                        <div className="tarea-actions">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCompletarTarea(tramite.id_tramite, true);
                            }}
                            className="action-btn approve-btn"
                            title="Aprobar trámite"
                          >
                            <FaCheckCircle /> Aprobar
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCompletarTarea(tramite.id_tramite, false);
                            }}
                            className="action-btn reject-btn"
                            title="Rechazar trámite"
                          >
                            <FaTimesCircle /> Rechazar
                          </button>
                        </div>
                      )}
                      {/* Solo admin sistema y admin docente pueden eliminar */}
                      {hasRole('admin') && hasAccessLevel(2) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(tramite.id_tramite);
                          }}
                          className="action-btn delete-btn"
                          title="Eliminar trámite"
                        >
                          <FaTrash />
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedRows.has(tramite.id_tramite) && (
                    <tr className="expanded-content">
                      <td colSpan={7}>
                        <div className="details-grid">
                          <div className="detail-item">
                            <FaUser className="detail-icon" />
                            <div>
                              <strong>Consultante</strong>
                              {tramite.consultante && hasRole('estudiante') ? (
                                <button
                                  className="consultante-link-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleConsultanteClick(tramite.consultante!.id_consultante, e);
                                  }}
                                  title="Ver información completa del consultante"
                                >
                                  <p>{tramite.consultante.usuario?.nombre || 'N/A'}</p>
                                  <small>CI: {tramite.consultante.usuario?.ci || 'N/A'} - Click para ver más</small>
                                </button>
                              ) : (
                                <>
                                  <p>{tramite.consultante.usuario?.nombre || 'N/A'}</p>
                                  <small>CI: {tramite.consultante.usuario?.ci || 'N/A'}</small>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="detail-item">
                            <FaUsers className="detail-icon" />
                            <div>
                              <strong>Grupo</strong>
                              <p>{tramite.grupo?.nombre || 'N/A'}</p>
                              {tramite.grupo?.descripcion && (
                                <small>{tramite.grupo.descripcion}</small>
                              )}
                            </div>
                          </div>
                          <div className="detail-item">
                            <FaCalendarAlt className="detail-icon" />
                            <div>
                              <strong>Fecha de Inicio</strong>
                              <p>{new Date(tramite.fecha_inicio).toLocaleString('es-ES')}</p>
                            </div>
                          </div>
                          {tramite.fecha_cierre && (
                            <div className="detail-item">
                              <FaTimesCircle className="detail-icon" />
                              <div>
                                <strong>Fecha de Cierre</strong>
                                <p>{new Date(tramite.fecha_cierre).toLocaleString('es-ES')}</p>
                              </div>
                            </div>
                          )}
                          {tramite.observaciones && (
                            <div className="detail-item full-width">
                              <FaCommentAlt className="detail-icon" />
                              <div>
                                <strong>Observaciones</strong>
                                <p>{tramite.observaciones}</p>
                              </div>
                            </div>
                          )}
                          {tramite.motivo_cierre && (
                            <div className="detail-item full-width">
                              <FaCommentAlt className="detail-icon" />
                              <div>
                                <strong>Motivo de Cierre</strong>
                                <p>{tramite.motivo_cierre}</p>
                              </div>
                            </div>
                          )}
                          {tramite.process_instance_id && (
                            <div className="detail-item full-width">
                              <strong>Proceso Camunda</strong>
                              <p className="process-id">{tramite.process_instance_id}</p>
                            </div>
                          )}
                          {/* Botón para ver hoja de ruta (estudiantes y docentes) */}
                          {(hasRole('estudiante') || hasRole('docente')) && (
                            <div className="detail-item full-width">
                              <button
                                className="btn-hoja-ruta"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTramiteHojaRuta(tramite.id_tramite);
                                  setShowHojaRutaModal(true);
                                }}
                                title="Ver hoja de ruta y bitácora de actuaciones"
                              >
                                <FaRoute /> Ver Hoja de Ruta
                                {tramite.hoja_ruta && tramite.hoja_ruta.length > 0 && (
                                  <span className="badge-count">{tramite.hoja_ruta.length}</span>
                                )}
                              </button>
                            </div>
                          )}
                          {/* Botón para ver documentos adjuntos */}
                          {(hasRole('estudiante') || hasRole('docente')) && (
                            <div className="detail-item full-width">
                              <button
                                className="btn-documentos"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTramiteDocumentos(tramite.id_tramite);
                                  setShowDocumentosModal(true);
                                }}
                                title="Ver y gestionar documentos adjuntos"
                              >
                                <FaPaperclip /> Documentos Adjuntos
                                {tramite.documentos && tramite.documentos.length > 0 && (
                                  <span className="badge-count">{tramite.documentos.length}</span>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RechazoModal
        isOpen={showRechazoModal}
        onClose={() => {
          setShowRechazoModal(false);
          setTramiteRechazar(null);
        }}
        onConfirm={handleConfirmarRechazo}
      />

      {/* Modal de información del consultante para estudiantes */}
      {showConsultanteModal && consultanteInfo && (
        <div className="modal-overlay" onClick={() => setShowConsultanteModal(false)}>
          <div className="modal-content consultante-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>👤 Información del Consultante</h2>
              <button 
                className="close-btn" 
                onClick={() => setShowConsultanteModal(false)}
                title="Cerrar"
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              {loadingConsultante ? (
                <div className="loading">Cargando información...</div>
              ) : (
                <>
                  <div className="consultante-info-section">
                    <h3>📋 Datos Personales</h3>
                    <div className="info-grid">
                      <div className="info-item">
                        <strong>Nombre:</strong>
                        <span>{consultanteInfo.usuario?.nombre || 'N/A'}</span>
                      </div>
                      <div className="info-item">
                        <strong>Cédula de Identidad:</strong>
                        <span>{consultanteInfo.usuario?.ci || 'N/A'}</span>
                      </div>
                      <div className="info-item">
                        <strong>Estado Civil:</strong>
                        <span>{consultanteInfo.est_civil || 'N/A'}</span>
                      </div>
                      <div className="info-item">
                        <strong>Número de Padrón:</strong>
                        <span>{consultanteInfo.nro_padron || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="consultante-info-section">
                    <h3>📧 Información de Contacto</h3>
                    <div className="info-grid">
                      <div className="info-item full-width">
                        <strong>Correo Electrónico:</strong>
                        {consultanteInfo.usuario?.correo ? (
                          <span>{consultanteInfo.usuario.correo.split('|').map((c: string, idx: number) => (
                            <div key={idx} className="multi-value-item">
                              📧 {c}
                            </div>
                          ))}</span>
                        ) : (
                          <span>N/A</span>
                        )}
                      </div>
                      <div className="info-item full-width">
                        <strong>Teléfono:</strong>
                        {consultanteInfo.usuario?.telefono ? (
                          <span>{consultanteInfo.usuario.telefono.split('|').map((t: string, idx: number) => (
                            <div key={idx} className="multi-value-item">
                              📞 {t}
                            </div>
                          ))}</span>
                        ) : (
                          <span>N/A</span>
                        )}
                      </div>
                      <div className="info-item full-width">
                        <strong>Domicilio:</strong>
                        {consultanteInfo.usuario?.domicilio ? (
                          <span>{consultanteInfo.usuario.domicilio.split('|').map((d: string, idx: number) => (
                            <div key={idx} className="multi-value-item">
                              📍 {d}
                            </div>
                          ))}</span>
                        ) : (
                          <span>N/A</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {consultanteInfo.tramites && consultanteInfo.tramites.length > 0 && (
                    <div className="consultante-info-section">
                      <h3>📂 Trámites del Consultante</h3>
                      <div className="tramites-list-consultante">
                        {consultanteInfo.tramites.map((tramite: any) => (
                          <div key={tramite.id_tramite} className="tramite-item-consultante">
                            <div className="tramite-header-consultante">
                              <strong>Carpeta #{tramite.num_carpeta}</strong>
                              <span className={`estado-badge estado-${tramite.estado}`}>
                                {getEstadoLabel(tramite.estado)}
                              </span>
                            </div>
                            {tramite.grupo && (
                              <small>Grupo: {tramite.grupo.nombre}</small>
                            )}
                            <small>Fecha: {new Date(tramite.fecha_inicio).toLocaleString('es-ES')}</small>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de hoja de ruta */}
      {showHojaRutaModal && tramiteHojaRuta && (
        <HojaRutaModal
          idTramite={tramiteHojaRuta}
          isOpen={showHojaRutaModal}
          onClose={() => {
            setShowHojaRutaModal(false);
            setTramiteHojaRuta(null);
          }}
          onUpdate={loadTramites}
          tramiteInfo={tramites.find(t => t.id_tramite === tramiteHojaRuta)}
        />
      )}

      {/* Modal de documentos adjuntos */}
      {showDocumentosModal && tramiteDocumentos && (
        <DocumentosModal
          idTramite={tramiteDocumentos}
          isOpen={showDocumentosModal}
          onClose={() => {
            setShowDocumentosModal(false);
            setTramiteDocumentos(null);
          }}
          onUpdate={loadTramites}
        />
      )}
    </div>
  );
}
