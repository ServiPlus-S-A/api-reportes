import { ConsultorResumenDto } from "../dto/detalle-solicitud-response.dto";

export interface SolicitudDetalleBase {
  id: string;
  estado: "completada" | "pendiente" | "en_ejecucion";
  unidadId: string;
  servicioId: string;
  clienteId: string;
  servicioNombre: string | null;
  servicioTipo: string | null;
  clienteNombre: string | null;
  gananciaGenerada: number | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  consultorApertura: ConsultorResumenDto | null;
  consultorCierre: ConsultorResumenDto | null;
}

export interface JwtPayloadData {
  sub: string;
  role: string;
  unidadIds: string[];
}
