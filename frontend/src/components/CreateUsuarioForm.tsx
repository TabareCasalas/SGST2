import { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import './CreateUsuarioForm.css';

interface Grupo {
  id_grupo: number;
  nombre: string;
  descripcion?: string;
}

interface Props {
  onSuccess?: () => void;
}

export function CreateUsuarioForm({ onSuccess }: Props) {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  // Form data
  const [formData, setFormData] = useState({
    nombre: '',
    ci: '',
    domicilios: [''],
    telefonos: [''],
    correos: [''],
    rol: 'estudiante',
    nivel_acceso: '',
    semestre: '',
    id_grupo: '',
  });

  useEffect(() => {
    loadGrupos();
  }, []);

  const loadGrupos = async () => {
    try {
      const data = await ApiService.getGrupos();
      setGrupos(data.filter((g: Grupo) => g.id_grupo));
    } catch (err) {
      console.error('Error cargando grupos:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validar que haya al menos un valor en cada campo requerido
      const correosFiltrados = formData.correos.filter(c => c.trim());
      const telefonosFiltrados = formData.telefonos.filter(t => t.trim());
      const domiciliosFiltrados = formData.domicilios.filter(d => d.trim());

      if (correosFiltrados.length === 0) {
        showToast('Debe ingresar al menos un correo electrónico', 'error');
        setLoading(false);
        return;
      }

      if (telefonosFiltrados.length === 0) {
        showToast('Debe ingresar al menos un teléfono', 'error');
        setLoading(false);
        return;
      }

      if (domiciliosFiltrados.length === 0) {
        showToast('Debe ingresar al menos un domicilio', 'error');
        setLoading(false);
        return;
      }

      // Combinar múltiples valores en strings separados por |
      const domicilio = domiciliosFiltrados.join('|');
      const telefono = telefonosFiltrados.join('|');
      // El primer correo es el principal (para el unique constraint)
      const correo = correosFiltrados[0];
      const correosAdicionales = correosFiltrados.slice(1);

      const data: any = {
        nombre: formData.nombre,
        ci: formData.ci,
        domicilio: domicilio,
        telefono: telefono,
        correo: correo,
        rol: formData.rol,
      };

      // Si hay correos adicionales, enviarlos también
      if (correosAdicionales.length > 0) {
        data.correos_adicionales = correosAdicionales.join('|');
      }

      // Agregar nivel_acceso si es administrador
      if (formData.rol === 'administrador' && formData.nivel_acceso) {
        data.nivel_acceso = parseInt(formData.nivel_acceso);
      }

      // Solo agregar semestre y grupo si es estudiante
      if (formData.rol === 'estudiante') {
        data.semestre = formData.semestre;
        data.id_grupo = parseInt(formData.id_grupo);
      }

      await ApiService.createUsuario(data);
      showToast('Usuario creado exitosamente', 'success');
      
      // Reset form
      setFormData({
        nombre: '',
        ci: '',
        domicilios: [''],
        telefonos: [''],
        correos: [''],
        rol: 'estudiante',
        nivel_acceso: '',
        semestre: '',
        id_grupo: '',
      });

      if (onSuccess) onSuccess();
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-usuario-container">
      <h2>➕ Crear Nuevo Usuario</h2>

      <form onSubmit={handleSubmit} className="usuario-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="nombre">Nombre Completo *</label>
            <input
              id="nombre"
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              required
              disabled={loading}
              placeholder="Juan Pérez"
            />
          </div>

          <div className="form-group">
            <label htmlFor="ci">Cédula de Identidad *</label>
            <input
              id="ci"
              type="text"
              value={formData.ci}
              onChange={(e) => setFormData({ ...formData, ci: e.target.value })}
              required
              disabled={loading}
              placeholder="12345678"
            />
          </div>
        </div>

        <div className="form-group">
          <label>Correos Electrónicos *</label>
          {formData.correos.map((correo, index) => (
            <div key={index} className="multi-input-row">
              <input
                type="email"
                value={correo}
                onChange={(e) => {
                  const nuevosCorreos = [...formData.correos];
                  nuevosCorreos[index] = e.target.value;
                  setFormData({ ...formData, correos: nuevosCorreos });
                }}
                required={index === 0}
                disabled={loading}
                placeholder="correo@ejemplo.com"
              />
              {index === formData.correos.length - 1 && formData.correos.length < 5 && (
                <button
                  type="button"
                  className="add-field-btn"
                  onClick={() => setFormData({ ...formData, correos: [...formData.correos, ''] })}
                  disabled={loading}
                  title="Agregar otro correo"
                >
                  ➕
                </button>
              )}
              {formData.correos.length > 1 && (
                <button
                  type="button"
                  className="remove-field-btn"
                  onClick={() => {
                    const nuevosCorreos = formData.correos.filter((_, i) => i !== index);
                    setFormData({ ...formData, correos: nuevosCorreos });
                  }}
                  disabled={loading}
                  title="Eliminar correo"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="form-group">
          <label>Teléfonos *</label>
          {formData.telefonos.map((telefono, index) => (
            <div key={index} className="multi-input-row">
              <input
                type="text"
                value={telefono}
                onChange={(e) => {
                  const nuevosTelefonos = [...formData.telefonos];
                  nuevosTelefonos[index] = e.target.value;
                  setFormData({ ...formData, telefonos: nuevosTelefonos });
                }}
                required={index === 0}
                disabled={loading}
                placeholder="0987654321"
              />
              {index === formData.telefonos.length - 1 && formData.telefonos.length < 5 && (
                <button
                  type="button"
                  className="add-field-btn"
                  onClick={() => setFormData({ ...formData, telefonos: [...formData.telefonos, ''] })}
                  disabled={loading}
                  title="Agregar otro teléfono"
                >
                  ➕
                </button>
              )}
              {formData.telefonos.length > 1 && (
                <button
                  type="button"
                  className="remove-field-btn"
                  onClick={() => {
                    const nuevosTelefonos = formData.telefonos.filter((_, i) => i !== index);
                    setFormData({ ...formData, telefonos: nuevosTelefonos });
                  }}
                  disabled={loading}
                  title="Eliminar teléfono"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="form-group">
          <label>Domicilios *</label>
          {formData.domicilios.map((domicilio, index) => (
            <div key={index} className="multi-input-row">
              <input
                type="text"
                value={domicilio}
                onChange={(e) => {
                  const nuevosDomicilios = [...formData.domicilios];
                  nuevosDomicilios[index] = e.target.value;
                  setFormData({ ...formData, domicilios: nuevosDomicilios });
                }}
                required={index === 0}
                disabled={loading}
                placeholder="Calle, número, ciudad"
              />
              {index === formData.domicilios.length - 1 && formData.domicilios.length < 5 && (
                <button
                  type="button"
                  className="add-field-btn"
                  onClick={() => setFormData({ ...formData, domicilios: [...formData.domicilios, ''] })}
                  disabled={loading}
                  title="Agregar otro domicilio"
                >
                  ➕
                </button>
              )}
              {formData.domicilios.length > 1 && (
                <button
                  type="button"
                  className="remove-field-btn"
                  onClick={() => {
                    const nuevosDomicilios = formData.domicilios.filter((_, i) => i !== index);
                    setFormData({ ...formData, domicilios: nuevosDomicilios });
                  }}
                  disabled={loading}
                  title="Eliminar domicilio"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="form-group">
          <label htmlFor="rol">Rol *</label>
          <select
            id="rol"
            value={formData.rol}
            onChange={(e) => setFormData({ ...formData, rol: e.target.value, semestre: '', id_grupo: '', nivel_acceso: '' })}
            required
            disabled={loading}
          >
            <option value="estudiante">👨‍🎓 Estudiante</option>
            <option value="docente">👨‍🏫 Docente</option>
            <option value="consultante">👤 Consultante</option>
            <option value="administrador">👨‍💼 Administrador</option>
          </select>
        </div>

        {formData.rol === 'administrador' && (
          <div className="form-group">
            <label htmlFor="nivel_acceso">Nivel de Acceso *</label>
            <select
              id="nivel_acceso"
              value={formData.nivel_acceso}
              onChange={(e) => setFormData({ ...formData, nivel_acceso: e.target.value })}
              required
              disabled={loading}
            >
              <option value="">Seleccionar nivel</option>
              <option value="3">Nivel 3 - Administrador del Sistema</option>
              <option value="2">Nivel 2 - Administrador Docente</option>
              <option value="1">Nivel 1 - Administrador Administrativo</option>
            </select>
          </div>
        )}

        {formData.rol === 'estudiante' && (
          <>
            <div className="form-group">
              <label htmlFor="semestre">Semestre *</label>
              <input
                id="semestre"
                type="text"
                value={formData.semestre}
                onChange={(e) => setFormData({ ...formData, semestre: e.target.value })}
                required
                disabled={loading}
                placeholder="2024-1"
              />
            </div>

            <div className="form-group">
              <label htmlFor="id_grupo">Grupo *</label>
              <select
                id="id_grupo"
                value={formData.id_grupo}
                onChange={(e) => setFormData({ ...formData, id_grupo: e.target.value })}
                required
                disabled={loading}
              >
                <option value="">Seleccionar grupo</option>
                {grupos.map((g) => (
                  <option key={g.id_grupo} value={g.id_grupo}>
                    {g.nombre}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? 'Creando...' : '👤 Crear Usuario'}
        </button>
      </form>
    </div>
  );
}

