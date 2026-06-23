export interface SolicitudEnEjecucionRaw {
  id: string;
  estado: string;
  clienteNombre: string | null;
  servicioNombre: string | null;
  prioridad: "Alta" | "Media" | "Baja";
  tecnicoId: string | null;
  tecnicoNombre: string | null;
  fechaInicioEjecucion: string;
  porcentajeAvance: number;
}

export interface SolicitudEjecucionData {
  id: string;
  cliente: string;
  servicio: string;
  prioridad: string;
  tecnicoAsignado: string;
  fechaInicioEjecucion: string;
  tiempoTranscurridoMinutos: number;
  porcentajeAvance: number;
}
