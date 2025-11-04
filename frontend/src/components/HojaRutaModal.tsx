import { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import type { HojaRuta } from '../types/tramite';
import { FaPlus, FaEdit, FaTrash, FaCalendarAlt, FaUser, FaFileAlt, FaPrint } from 'react-icons/fa';
import './HojaRutaModal.css';

interface Props {
  idTramite: number;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
  tramiteInfo?: {
    num_carpeta: number;
    consultante?: { usuario?: { nombre: string; ci: string } };
    grupo?: { nombre: string };
    fecha_inicio: string;
  };
}

export function HojaRutaModal({ idTramite, isOpen, onClose, onUpdate, tramiteInfo }: Props) {
  const [actuaciones, setActuaciones] = useState<HojaRuta[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const { showToast } = useToast();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    fecha_actuacion: new Date().toISOString().split('T')[0],
    descripcion: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadActuaciones();
    }
  }, [isOpen, idTramite]);

  const loadActuaciones = async () => {
    try {
      setLoading(true);
      const data = await ApiService.getHojaRutaByTramite(idTramite);
      setActuaciones(data);
    } catch (err: any) {
      showToast(`Error al cargar hoja de ruta: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.descripcion.trim()) {
      showToast('La descripción es requerida', 'error');
      return;
    }

    try {
      setSaving(true);
      if (editingId) {
        await ApiService.updateActuacion(editingId, formData);
        showToast('Actuación actualizada exitosamente', 'success');
      } else {
        await ApiService.createActuacion({
          id_tramite: idTramite,
          ...formData,
        });
        showToast('Actuación agregada exitosamente', 'success');
      }
      setFormData({
        fecha_actuacion: new Date().toISOString().split('T')[0],
        descripcion: '',
      });
      setShowForm(false);
      setEditingId(null);
      await loadActuaciones();
      if (onUpdate) onUpdate();
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (actuacion: HojaRuta) => {
    setFormData({
      fecha_actuacion: new Date(actuacion.fecha_actuacion).toISOString().split('T')[0],
      descripcion: actuacion.descripcion,
    });
    setEditingId(actuacion.id_hoja_ruta);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta actuación?')) return;

    try {
      await ApiService.deleteActuacion(id);
      showToast('Actuación eliminada exitosamente', 'success');
      await loadActuaciones();
      if (onUpdate) onUpdate();
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const canEdit = (actuacion: HojaRuta) => {
    return user?.id_usuario === actuacion.id_usuario;
  };

  const handlePrintPDF = async () => {
    try {
      // Importación dinámica de jsPDF para evitar problemas con Vite
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let yPosition = margin;

      // Función para agregar nueva página si es necesario
      const checkPageBreak = (requiredSpace: number) => {
        if (yPosition + requiredSpace > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
          return true;
        }
        return false;
      };

      // Encabezado
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('HOJA DE RUTA - BITÁCORA DE ACTUACIONES', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      // Línea separadora
      doc.setLineWidth(0.5);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;

      // Información del trámite
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('INFORMACIÓN DEL TRÁMITE', margin, yPosition);
      yPosition += 7;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      if (tramiteInfo) {
        doc.text(`Carpeta Nº: ${tramiteInfo.num_carpeta}`, margin, yPosition);
        yPosition += 6;

        if (tramiteInfo.consultante?.usuario) {
          doc.text(`Consultante: ${tramiteInfo.consultante.usuario.nombre}`, margin, yPosition);
          yPosition += 6;
          doc.text(`CI: ${tramiteInfo.consultante.usuario.ci}`, margin, yPosition);
          yPosition += 6;
        }

        if (tramiteInfo.grupo) {
          doc.text(`Grupo: ${tramiteInfo.grupo.nombre}`, margin, yPosition);
          yPosition += 6;
        }

        const fechaInicio = new Date(tramiteInfo.fecha_inicio).toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        doc.text(`Fecha de Inicio: ${fechaInicio}`, margin, yPosition);
        yPosition += 6;

        doc.text(`Fecha de Impresión: ${new Date().toLocaleDateString('es-ES')}`, margin, yPosition);
        yPosition += 10;
      }

      // Línea separadora
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;

      // Título de actuaciones
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('ACTUACIONES REGISTRADAS', margin, yPosition);
      yPosition += 7;

      // Lista de actuaciones
      if (actuaciones.length === 0) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.text('No hay actuaciones registradas.', margin, yPosition);
      } else {
        actuaciones.forEach((actuacion, index) => {
          checkPageBreak(25);

          // Fecha de actuación
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          const fechaActuacion = new Date(actuacion.fecha_actuacion).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
          doc.text(`${index + 1}. Fecha: ${fechaActuacion}`, margin, yPosition);
          yPosition += 5;

          // Usuario que realizó la actuación
          doc.setFont('helvetica', 'normal');
          const usuarioNombre = actuacion.usuario?.nombre || 'Usuario desconocido';
          const usuarioCI = actuacion.usuario?.ci || '';
          doc.text(`   Realizada por: ${usuarioNombre}${usuarioCI ? ` (CI: ${usuarioCI})` : ''}`, margin, yPosition);
          yPosition += 5;

          // Descripción
          doc.setFont('helvetica', 'normal');
          const descripcionLines = doc.splitTextToSize(`   ${actuacion.descripcion}`, pageWidth - 2 * margin);
          doc.text(descripcionLines, margin, yPosition);
          yPosition += descripcionLines.length * 5 + 3;

          // Línea separadora entre actuaciones (excepto la última)
          if (index < actuaciones.length - 1) {
            doc.setLineWidth(0.2);
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, yPosition, pageWidth - margin, yPosition);
            yPosition += 5;
            doc.setDrawColor(0, 0, 0);
          }
        });
      }

      // Pie de página
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text(
          `Página ${i} de ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      // Generar nombre del archivo
      const fechaActual = new Date().toISOString().split('T')[0];
      const numCarpeta = tramiteInfo?.num_carpeta || idTramite;
      const fileName = `HojaRuta_Carpeta_${numCarpeta}_${fechaActual}.pdf`;

      // Descargar PDF
      doc.save(fileName);
      showToast('PDF generado exitosamente', 'success');
    } catch (err: any) {
      showToast(`Error al generar PDF: ${err.message}`, 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay hoja-ruta-overlay" onClick={onClose}>
      <div className="modal-content hoja-ruta-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📋 Hoja de Ruta - Bitácora de Actuaciones</h2>
          <div className="header-actions">
            {actuaciones.length > 0 && (
              <button className="btn-print-pdf" onClick={handlePrintPDF} title="Imprimir/Descargar PDF">
                <FaPrint /> PDF
              </button>
            )}
            <button className="close-btn" onClick={onClose} title="Cerrar">
              ✕
            </button>
          </div>
        </div>

        <div className="modal-body">
          {/* Botón para agregar nueva actuación (solo estudiantes) */}
          {user?.rol === 'estudiante' && !showForm && (
            <button
              className="btn-add-actuacion"
              onClick={() => {
                setShowForm(true);
                setEditingId(null);
                setFormData({
                  fecha_actuacion: new Date().toISOString().split('T')[0],
                  descripcion: '',
                });
              }}
            >
              <FaPlus /> Agregar Actuación
            </button>
          )}

          {/* Formulario para agregar/editar actuación */}
          {showForm && user?.rol === 'estudiante' && (
            <form onSubmit={handleSubmit} className="actuacion-form">
              <div className="form-group">
                <label htmlFor="fecha_actuacion">
                  <FaCalendarAlt /> Fecha de Actuación *
                </label>
                <input
                  id="fecha_actuacion"
                  type="date"
                  value={formData.fecha_actuacion}
                  onChange={(e) => setFormData({ ...formData, fecha_actuacion: e.target.value })}
                  required
                  disabled={saving}
                />
              </div>

              <div className="form-group">
                <label htmlFor="descripcion">
                  <FaFileAlt /> Descripción de la Actuación *
                </label>
                <textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  required
                  disabled={saving}
                  placeholder="Describe las actuaciones realizadas en esta fecha..."
                  rows={6}
                />
              </div>

              <div className="form-actions">
                <button type="submit" disabled={saving} className="btn-save">
                  {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Agregar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setFormData({
                      fecha_actuacion: new Date().toISOString().split('T')[0],
                      descripcion: '',
                    });
                  }}
                  disabled={saving}
                  className="btn-cancel"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {/* Lista de actuaciones */}
          {loading ? (
            <div className="loading">Cargando actuaciones...</div>
          ) : actuaciones.length === 0 ? (
            <div className="empty-state">
              <FaFileAlt />
              <p>No hay actuaciones registradas aún.</p>
              {user?.rol === 'estudiante' && (
                <p className="hint">Agrega la primera actuación para comenzar la bitácora.</p>
              )}
            </div>
          ) : (
            <div className="actuaciones-list">
              {actuaciones.map((actuacion) => (
                <div key={actuacion.id_hoja_ruta} className="actuacion-item">
                  <div className="actuacion-header">
                    <div className="actuacion-fecha">
                      <FaCalendarAlt />
                      <strong>
                        {new Date(actuacion.fecha_actuacion).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </strong>
                    </div>
                    {canEdit(actuacion) && user?.rol === 'estudiante' && (
                      <div className="actuacion-actions">
                        <button
                          className="btn-edit"
                          onClick={() => handleEdit(actuacion)}
                          title="Editar actuación"
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDelete(actuacion.id_hoja_ruta)}
                          title="Eliminar actuación"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="actuacion-usuario">
                    <FaUser />
                    <span>{actuacion.usuario?.nombre || 'Usuario desconocido'}</span>
                    {actuacion.usuario?.ci && <small>(CI: {actuacion.usuario.ci})</small>}
                  </div>
                  <div className="actuacion-descripcion">{actuacion.descripcion}</div>
                  <div className="actuacion-timestamp">
                    Registrado: {new Date(actuacion.created_at).toLocaleString('es-ES')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

