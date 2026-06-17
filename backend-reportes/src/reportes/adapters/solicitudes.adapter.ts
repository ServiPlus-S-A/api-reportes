import { Injectable } from "@nestjs/common";
import { SolicitudDetalleBase } from "../interfaces/detalle-solicitud.interface";

@Injectable()
export class SolicitudesAdapter {
  private readonly solicitudes: Record<string, SolicitudDetalleBase> = {
    "REQ-12345": {
      id: "REQ-12345",
      estado: "completada",
      unidadId: "reportes-centro",
      servicioId: "srv-001",
      clienteId: "cli-001",
      servicioNombre: "Implementacion de mesa de ayuda",
      servicioTipo: "Consultoria",
      clienteNombre: "Industrias Nova SAS",
      gananciaGenerada: 3250000,
      fechaInicio: "2026-05-04T08:00:00Z",
      fechaFin: "2026-05-06T17:30:00Z",
      consultorApertura: { id: "con-001", nombre: "Andrea Salazar" },
      consultorCierre: { id: "con-004", nombre: "Julian Muñoz" },
    },
    "REQ-54321": {
      id: "REQ-54321",
      estado: "completada",
      unidadId: "reportes-norte",
      servicioId: "srv-missing",
      clienteId: "cli-missing",
      servicioNombre: null,
      servicioTipo: "Soporte",
      clienteNombre: null,
      gananciaGenerada: null,
      fechaInicio: "2026-05-15T13:15:00Z",
      fechaFin: "2026-05-16T19:00:00Z",
      consultorApertura: { id: "con-010", nombre: null },
      consultorCierre: { id: "con-011", nombre: "Paula Torres" },
    },
  };

  async obtenerSolicitudPorId(
    id: string,
  ): Promise<SolicitudDetalleBase | null> {
    return this.solicitudes[id] ?? null;
  }
}
