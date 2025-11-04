import { useState, useEffect, useRef } from 'react';
import { ApiService } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import type { DocumentoAdjunto } from '../types/tramite';
import { FaPlus, FaTrash, FaDownload, FaFileAlt, FaUpload } from 'react-icons/fa';
import './DocumentosModal.css';

interface Props {
  idTramite: number;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export function DocumentosModal({ idTramite, isOpen, onClose, onUpdate }: Props) {
  const [documentos, setDocumentos] = useState<DocumentoAdjunto[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    archivo: null as File | null,
    descripcion: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadDocumentos();
    }
  }, [isOpen, idTramite]);

  const loadDocumentos = async () => {
    try {
      setLoading(true);
      const data = await ApiService.getDocumentosByTramite(idTramite);
      setDocumentos(data);
    } catch (err: any) {
      showToast(`Error al cargar documentos: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validar tipo de archivo
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/jpg',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ];

      if (!allowedTypes.includes(file.type)) {
        showToast('Tipo de archivo no permitido. Solo se permiten: PDF, imágenes (JPG, PNG), Word, Excel', 'error');
        return;
      }

      // Validar tamaño (10MB)
      if (file.size > 10 * 1024 * 1024) {
        showToast('El archivo es demasiado grande. El tamaño máximo es 10MB', 'error');
        return;
      }

      setFormData({ ...formData, archivo: file });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.archivo) {
      showToast('Debes seleccionar un archivo', 'error');
      return;
    }

    try {
      setUploading(true);
      await ApiService.uploadDocumento(idTramite, formData.archivo, formData.descripcion || undefined);
      showToast('Documento subido exitosamente', 'success');
      setFormData({ archivo: null, descripcion: '' });
      setShowForm(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      await loadDocumentos();
      if (onUpdate) onUpdate();
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (id: number, nombreArchivo: string) => {
    try {
      await ApiService.downloadDocumento(id);
      showToast('Documento descargado exitosamente', 'success');
    } catch (err: any) {
      showToast(`Error al descargar: ${err.message}`, 'error');
    }
  };

  const handleDelete = async (id: number, nombreArchivo: string) => {
    if (!confirm(`¿Estás seguro de eliminar el documento "${nombreArchivo}"?`)) return;

    try {
      await ApiService.deleteDocumento(id);
      showToast('Documento eliminado exitosamente', 'success');
      await loadDocumentos();
      if (onUpdate) onUpdate();
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const canDelete = (documento: DocumentoAdjunto) => {
    return user?.id_usuario === documento.id_usuario;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (tipoMime: string) => {
    if (tipoMime.includes('pdf')) return '📄';
    if (tipoMime.includes('image')) return '🖼️';
    if (tipoMime.includes('word')) return '📝';
    if (tipoMime.includes('excel') || tipoMime.includes('spreadsheet')) return '📊';
    return '📎';
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay documentos-overlay" onClick={onClose}>
      <div className="modal-content documentos-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📎 Documentos Adjuntos</h2>
          <div className="header-actions">
            <button className="close-btn" onClick={onClose} title="Cerrar">
              ✕
            </button>
          </div>
        </div>

        <div className="modal-body">
          {/* Botón para subir documento */}
          {!showForm && (
            <button
              className="btn-upload-documento"
              onClick={() => setShowForm(true)}
            >
              <FaUpload /> Subir Documento
            </button>
          )}

          {/* Formulario para subir documento */}
          {showForm && (
            <form onSubmit={handleSubmit} className="upload-form">
              <div className="form-group">
                <label htmlFor="archivo">
                  <FaFileAlt /> Seleccionar Archivo *
                </label>
                <input
                  ref={fileInputRef}
                  id="archivo"
                  type="file"
                  onChange={handleFileChange}
                  required
                  disabled={uploading}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                />
                {formData.archivo && (
                  <div className="file-info">
                    <span>📎 {formData.archivo.name}</span>
                    <span className="file-size">({formatFileSize(formData.archivo.size)})</span>
                  </div>
                )}
                <small>Formatos permitidos: PDF, JPG, PNG, Word, Excel. Tamaño máximo: 10MB</small>
              </div>

              <div className="form-group">
                <label htmlFor="descripcion">
                  Descripción (opcional)
                </label>
                <textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  disabled={uploading}
                  placeholder="Describe el contenido del documento..."
                  rows={3}
                />
              </div>

              <div className="form-actions">
                <button type="submit" disabled={uploading || !formData.archivo} className="btn-save">
                  {uploading ? 'Subiendo...' : 'Subir Documento'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({ archivo: null, descripcion: '' });
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  disabled={uploading}
                  className="btn-cancel"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {/* Lista de documentos */}
          {loading ? (
            <div className="loading">Cargando documentos...</div>
          ) : documentos.length === 0 ? (
            <div className="empty-state">
              <FaFileAlt />
              <p>No hay documentos adjuntos aún.</p>
              <p className="hint">Sube el primer documento para comenzar.</p>
            </div>
          ) : (
            <div className="documentos-list">
              {documentos.map((documento) => (
                <div key={documento.id_documento} className="documento-item">
                  <div className="documento-header">
                    <div className="documento-info">
                      <span className="file-icon">{getFileIcon(documento.tipo_mime)}</span>
                      <div className="documento-details">
                        <strong>{documento.nombre_archivo}</strong>
                        <div className="documento-meta">
                          <span>{formatFileSize(documento.tamano)}</span>
                          <span>•</span>
                          <span>{new Date(documento.created_at).toLocaleDateString('es-ES')}</span>
                          <span>•</span>
                          <span>{documento.usuario?.nombre || 'Usuario desconocido'}</span>
                        </div>
                        {documento.descripcion && (
                          <p className="documento-descripcion">{documento.descripcion}</p>
                        )}
                      </div>
                    </div>
                    <div className="documento-actions">
                      <button
                        className="btn-download"
                        onClick={() => handleDownload(documento.id_documento, documento.nombre_archivo)}
                        title="Descargar documento"
                      >
                        <FaDownload />
                      </button>
                      {canDelete(documento) && (
                        <button
                          className="btn-delete"
                          onClick={() => handleDelete(documento.id_documento, documento.nombre_archivo)}
                          title="Eliminar documento"
                        >
                          <FaTrash />
                        </button>
                      )}
                    </div>
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

