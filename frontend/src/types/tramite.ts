export interface Tramite {
  id_tramite: number;
  id_consultante: number;
  id_grupo: number;
  num_carpeta: number;
  estado: string;
  observaciones?: string;
  fecha_inicio: string;
  fecha_cierre?: string;
  motivo_cierre?: string;
  process_instance_id?: string;
  created_at: string;
  updated_at: string;
  consultante?: Consultante;
  grupo?: Grupo;
  notificaciones?: Notificacion[];
  hoja_ruta?: HojaRuta[];
  documentos?: DocumentoAdjunto[];
}

export interface DocumentoAdjunto {
  id_documento: number;
  id_tramite: number;
  id_usuario: number;
  nombre_archivo: string;
  nombre_almacenado: string;
  ruta_archivo: string;
  tipo_mime: string;
  tamano: number;
  descripcion?: string;
  created_at: string;
  updated_at: string;
  usuario?: {
    id_usuario: number;
    nombre: string;
    ci: string;
  };
}

export interface HojaRuta {
  id_hoja_ruta: number;
  id_tramite: number;
  id_usuario: number;
  fecha_actuacion: string;
  descripcion: string;
  created_at: string;
  updated_at: string;
  usuario?: {
    id_usuario: number;
    nombre: string;
    ci: string;
  };
}

export interface Consultante {
  id_consultante: number;
  id_usuario: number;
  est_civil: string;
  nro_padron: number;
  usuario?: Usuario;
}

export interface Usuario {
  id_usuario: number;
  nombre: string;
  ci: string;
  domicilio: string;
  telefono: string;
  correo: string;
}

export interface Grupo {
  id_grupo: number;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

export interface Notificacion {
  id_notificacion: number;
  id_tramite: number;
  tipo_notificacion: string;
  mensaje: string;
  enviado: boolean;
  created_at: string;
}

export interface CreateTramiteDTO {
  id_consultante: number;
  id_grupo: number;
  num_carpeta: number;
  observaciones?: string;
}

