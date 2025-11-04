export interface CreateTramiteRequest {
  id_consultante: number;
  id_grupo: number;
  num_carpeta: number;
  observaciones?: string;
}

export interface Tramite {
  id: number;
  id_consultante: number;
  id_grupo: number;
  num_carpeta: number;
  fecha_inicio: string;
  estado: string;
  observaciones?: string;
  fecha_cierre?: string;
  motivo_cierre?: string;
  consultante?: {
    id_consultante: number;
    id_usuario: number;
    est_civil: string;
    nro_padron: number;
    usuario?: {
      id_usuario: number;
      nombre: string;
      ci: string;
      domicilio: string;
      telefono: string;
      correo: string;
    };
  };
  grupo?: {
    id_grupo: number;
    nombre: string;
  };
}

export interface UpdateTramiteRequest {
  estado?: string;
  observaciones?: string;
  fecha_cierre?: string;
  motivo_cierre?: string;
}

export interface TramiteStats {
  total: number;
  pendientes: number;
  en_proceso: number;
  completados: number;
  cancelados: number;
}




