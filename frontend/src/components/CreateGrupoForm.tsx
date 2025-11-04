import { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import './CreateGrupoForm.css';

interface Usuario {
  id_usuario: number;
  nombre: string;
  ci: string;
  rol: string;
  activo?: boolean;
}

interface Props {
  onSuccess?: () => void;
}

export function CreateGrupoForm({ onSuccess }: Props) {
  const [docentes, setDocentes] = useState<Usuario[]>([]);
  const [estudiantes, setEstudiantes] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    responsable_id: '',
    asistentes_ids: [] as string[],
    estudiantes_ids: [] as string[],
  });

  useEffect(() => {
    loadDocentes();
    loadEstudiantes();
  }, []);

  const loadDocentes = async () => {
    try {
      console.log('Cargando docentes...');
      
      // Cargar todos los usuarios y filtrar los que son docentes
      // Los docentes ahora todos tienen rol 'docente'
      const allUsers = await ApiService.getUsuarios();
      console.log('Todos los usuarios cargados:', allUsers);
      
      // Filtrar docentes por rol 'docente'
      const docentesList = allUsers.filter((u: Usuario) => {
        const esDocente = u.rol === 'docente';
        const esActivo = u.activo === true || u.activo === undefined || u.activo === null;
        return esDocente && esActivo;
      });
      
      console.log('Docentes encontrados:', docentesList);
      setDocentes(docentesList);
      
      if (docentesList.length === 0) {
        console.warn('No se encontraron docentes activos');
        // Mostrar todos los usuarios para debugging
        const usuariosConRol = allUsers.filter((u: Usuario) => 
          u.rol === 'docente'
        );
        console.log('Usuarios con rol "docente":', usuariosConRol);
      }
    } catch (err: any) {
      console.error('Error cargando docentes:', err);
      showToast(`Error al cargar docentes: ${err.message}`, 'error');
    }
  };

  const loadEstudiantes = async () => {
    try {
      console.log('Cargando estudiantes...');
      
      // Cargar todos los usuarios y filtrar los que son estudiantes sin grupo
      const allUsers = await ApiService.getUsuarios();
      
      // Filtrar estudiantes activos que no estén ya en un grupo
      const estudiantesList = allUsers.filter((u: any) => {
        const esEstudiante = u.rol === 'estudiante';
        const esActivo = u.activo === true || u.activo === undefined || u.activo === null;
        // Verificar si el estudiante ya está en un grupo
        // La API devuelve grupos_participa que es un array
        const yaEnGrupo = u.grupos_participa && u.grupos_participa.length > 0;
        
        return esEstudiante && esActivo && !yaEnGrupo;
      });
      
      console.log('Estudiantes encontrados (sin grupo):', estudiantesList);
      setEstudiantes(estudiantesList);
    } catch (err: any) {
      console.error('Error cargando estudiantes:', err);
      showToast(`Error al cargar estudiantes: ${err.message}`, 'error');
    }
  };

  const handleAsistenteToggle = (id: string) => {
    const newAsistentes = formData.asistentes_ids.includes(id)
      ? formData.asistentes_ids.filter(aid => aid !== id)
      : [...formData.asistentes_ids, id];
    
    setFormData({ ...formData, asistentes_ids: newAsistentes });
  };

  const handleEstudianteToggle = (id: string) => {
    const newEstudiantes = formData.estudiantes_ids.includes(id)
      ? formData.estudiantes_ids.filter(eid => eid !== id)
      : [...formData.estudiantes_ids, id];
    
    setFormData({ ...formData, estudiantes_ids: newEstudiantes });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.asistentes_ids.includes(formData.responsable_id)) {
      showToast('El responsable no puede ser asistente también', 'error');
      return;
    }

    setLoading(true);

    try {
      const data = {
        nombre: formData.nombre,
        descripcion: formData.descripcion || undefined,
        responsable_id: parseInt(formData.responsable_id),
        asistentes_ids: formData.asistentes_ids.map(id => parseInt(id)),
        estudiantes_ids: formData.estudiantes_ids.map(id => parseInt(id)),
      };

      await ApiService.createGrupo(data);
      showToast('Grupo creado exitosamente', 'success');
      
      // Reset form
      setFormData({
        nombre: '',
        descripcion: '',
        responsable_id: '',
        asistentes_ids: [],
        estudiantes_ids: [],
      });
      // Recargar estudiantes por si algún estudiante fue asignado
      loadEstudiantes();

      if (onSuccess) onSuccess();
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const docentesDisponiblesAsistentes = docentes.filter(
    d => d.id_usuario.toString() !== formData.responsable_id
  );

  return (
    <div className="create-grupo-container">
      <h2>👥 Crear Nuevo Grupo</h2>
      <p className="info-text">
        Un grupo debe tener 1 docente responsable. Los docentes asistentes y estudiantes son opcionales. Los estudiantes solo pueden pertenecer a un grupo.
      </p>

      <form onSubmit={handleSubmit} className="grupo-form">
        <div className="form-group">
          <label htmlFor="nombre">Nombre del Grupo *</label>
          <input
            id="nombre"
            type="text"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            required
            disabled={loading}
            placeholder="Ej: Grupo 1"
          />
        </div>

        <div className="form-group">
          <label htmlFor="descripcion">Descripción</label>
          <textarea
            id="descripcion"
            value={formData.descripcion}
            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
            disabled={loading}
            rows={3}
            placeholder="Descripción del grupo..."
          />
        </div>

        <div className="form-group">
          <label htmlFor="responsable">Docente Responsable *</label>
          <select
            id="responsable"
            value={formData.responsable_id}
            onChange={(e) => {
              console.log('Seleccionando docente:', e.target.value);
              setFormData({ ...formData, responsable_id: e.target.value });
            }}
            required
            disabled={loading}
          >
            <option value="">
              {docentes.length === 0 
                ? 'Cargando docentes...' 
                : 'Seleccionar docente responsable'}
            </option>
            {docentes.map((d) => {
              console.log('Agregando opción de docente:', d.id_usuario, d.nombre);
              return (
                <option key={d.id_usuario} value={d.id_usuario.toString()}>
                  {d.nombre} - CI: {d.ci}
                </option>
              );
            })}
          </select>
          {docentes.length > 0 ? (
            <p className="hint-text">
              {docentes.length} docente{docentes.length !== 1 ? 's' : ''} disponible{docentes.length !== 1 ? 's' : ''}
            </p>
          ) : (
            <p className="hint-text" style={{ color: '#e53e3e' }}>
              No se encontraron docentes. Verifique la consola para más detalles.
            </p>
          )}
        </div>

        <div className="form-group">
          <label>Docentes Asistentes (opcional)</label>
          <div className="asistentes-list">
            {docentesDisponiblesAsistentes.length === 0 ? (
              <p className="no-docentes">
                {formData.responsable_id 
                  ? 'No hay más docentes disponibles como asistentes' 
                  : 'Seleccione primero un responsable'}
              </p>
            ) : (
              docentesDisponiblesAsistentes.map((d) => (
                <div key={d.id_usuario} className="asistente-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.asistentes_ids.includes(d.id_usuario.toString())}
                      onChange={() => handleAsistenteToggle(d.id_usuario.toString())}
                      disabled={loading}
                    />
                    <span>{d.nombre} - CI: {d.ci}</span>
                  </label>
                </div>
              ))
            )}
          </div>
          <p className="selection-count">
            Seleccionados: {formData.asistentes_ids.length}
          </p>
        </div>

        <div className="form-group">
          <label>Estudiantes (opcional)</label>
          <p className="hint-text" style={{ fontSize: '0.85em', color: '#666', marginBottom: '10px' }}>
            Nota: Los estudiantes solo pueden pertenecer a un grupo. Si un estudiante ya está en otro grupo, no podrá agregarse.
          </p>
          <div className="asistentes-list">
            {estudiantes.length === 0 ? (
              <p className="no-docentes">
                No hay estudiantes disponibles sin grupo asignado
              </p>
            ) : (
              estudiantes.map((e) => (
                <div key={e.id_usuario} className="asistente-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.estudiantes_ids.includes(e.id_usuario.toString())}
                      onChange={() => handleEstudianteToggle(e.id_usuario.toString())}
                      disabled={loading}
                    />
                    <span>{e.nombre} - CI: {e.ci}</span>
                  </label>
                </div>
              ))
            )}
          </div>
          <p className="selection-count">
            Seleccionados: {formData.estudiantes_ids.length}
          </p>
        </div>

        <button 
          type="submit" 
          disabled={loading} 
          className="submit-btn"
        >
          {loading ? 'Creando...' : '👥 Crear Grupo'}
        </button>
      </form>
    </div>
  );
}

