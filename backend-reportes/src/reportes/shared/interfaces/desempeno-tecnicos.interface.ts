export type EspecialidadTecnica =
  | "Soporte"
  | "Mantenimiento"
  | "Consultoria";

export interface TecnicoDesempenoRaw {
  id: string;
  nombre: string;
  especialidad: EspecialidadTecnica;
}

export interface SolicitudDesempenoRaw {
  id: string;
  estado: string;
  fechaFinalizacion: string | null;
  tecnicoId: string;
  especialidad: EspecialidadTecnica;
  calificacion: number | null;
}
