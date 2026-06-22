import { Injectable, Logger } from "@nestjs/common";
import { SolicitudDetalleBase } from "../../shared/interfaces/detalle-solicitud.interface";

@Injectable()
export class SolicitudesAdapter {
  private readonly logger = new Logger(SolicitudesAdapter.name);

  private readonly solicitudesDemo = [
    {
      id: "sol-001",
      tipoServicio: "Finanzas",
      estado: "Completada",
      fechaCreacion: "2026-01-03T09:00:00.000Z",
      fechaCompletada: "2026-01-04T16:00:00.000Z",
    },
    {
      id: "sol-002",
      tipoServicio: "Finanzas",
      estado: "Completada",
      fechaCreacion: "2026-01-10T10:00:00.000Z",
      fechaCompletada: "2026-01-11T13:00:00.000Z",
    },
    {
      id: "sol-003",
      tipoServicio: "Operaciones",
      estado: "Completada",
      fechaCreacion: "2026-02-05T08:30:00.000Z",
      fechaCompletada: "2026-02-06T12:30:00.000Z",
    },
    {
      id: "sol-004",
      tipoServicio: "Operaciones",
      estado: "Cancelada",
      fechaCreacion: "2026-02-07T09:00:00.000Z",
      fechaCompletada: null,
    },
    {
      id: "sol-005",
      tipoServicio: "Finanzas",
      estado: "Completada",
      fechaCreacion: "2026-03-01T07:00:00.000Z",
      fechaCompletada: "2026-03-03T07:00:00.000Z",
    },
    {
      id: "sol-006",
      tipoServicio: "Soporte",
      estado: "Completada",
      fechaCreacion: "2026-03-15T11:00:00.000Z",
      fechaCompletada: "2026-03-15T23:00:00.000Z",
    },
  ];

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
      consultorCierre: { id: "con-004", nombre: "Julian Munoz" },
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

  async fetchSolicitudesParaPromedio(): Promise<any[]> {
    const url = process.env.EXTERNAL_SOLICITUDES_URL || "";

    try {
      if (url) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        try {
          const response = await fetch(url, { signal: controller.signal });
          return await response.json();
        } finally {
          clearTimeout(timeout);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to fetch from external solicitudes API. Using fallback mock data. Error: ${message}`,
      );
    }

    return this.solicitudesDemo;
  }

  async obtenerSolicitudPorId(
    id: string,
  ): Promise<SolicitudDetalleBase | null> {
    return this.solicitudes[id] ?? null;
  }
}
