import { Injectable, Logger } from "@nestjs/common";
import { SolicitudDesempenoRaw } from "../../shared/interfaces/desempeno-tecnicos.interface";
import { SolicitudDetalleBase } from "../../shared/interfaces/detalle-solicitud.interface";

interface SolicitudMock
  extends
    Omit<Partial<SolicitudDetalleBase>, "estado">,
    Partial<SolicitudDesempenoRaw> {
  id: string;
  estado: string;
  tipoServicio?: string;
  fechaCreacion?: string | null;
  fechaCompletada?: string | null;
}

@Injectable()
export class SolicitudesAdapter {
  private readonly logger = new Logger(SolicitudesAdapter.name);

  private readonly solicitudesMock: SolicitudMock[] = [
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
    {
      id: "REQ-12345",
      estado: "completada",
      fechaFinalizacion: "2026-05-06T17:30:00Z",
      tecnicoId: "tec-001",
      especialidad: "Consultoria",
      calificacion: 4.7,
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
    {
      id: "REQ-54321",
      estado: "completada",
      fechaFinalizacion: "2026-05-16T19:00:00Z",
      tecnicoId: "tec-004",
      especialidad: "Soporte",
      calificacion: null,
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
    {
      id: "sol-des-001",
      estado: "Completada",
      fechaFinalizacion: "2026-05-02T12:00:00.000Z",
      tecnicoId: "tec-001",
      especialidad: "Soporte",
      calificacion: 4.5,
    },
    {
      id: "sol-des-002",
      estado: "Completada",
      fechaFinalizacion: "2026-05-08T17:30:00.000Z",
      tecnicoId: "tec-001",
      especialidad: "Soporte",
      calificacion: 4.8,
    },
    {
      id: "sol-des-003",
      estado: "Completada",
      fechaFinalizacion: "2026-05-10T16:00:00.000Z",
      tecnicoId: "tec-002",
      especialidad: "Mantenimiento",
      calificacion: 4.1,
    },
    {
      id: "sol-des-004",
      estado: "En Proceso",
      fechaFinalizacion: null,
      tecnicoId: "tec-002",
      especialidad: "Mantenimiento",
      calificacion: null,
    },
    {
      id: "sol-des-005",
      estado: "Completada",
      fechaFinalizacion: "2026-05-18T09:45:00.000Z",
      tecnicoId: "tec-003",
      especialidad: "Consultoria",
      calificacion: null,
    },
    {
      id: "sol-des-006",
      estado: "Completada",
      fechaFinalizacion: "2026-05-20T15:15:00.000Z",
      tecnicoId: "tec-004",
      especialidad: "Soporte",
      calificacion: 3.9,
    },
    {
      id: "sol-des-007",
      estado: "Completada",
      fechaFinalizacion: "2026-06-03T10:30:00.000Z",
      tecnicoId: "tec-005",
      especialidad: "Mantenimiento",
      calificacion: 4.3,
    },
    {
      id: "sol-des-008",
      estado: "Completada",
      fechaFinalizacion: "2026-06-06T11:00:00.000Z",
      tecnicoId: "tec-003",
      especialidad: "Consultoria",
      calificacion: 4.9,
    },
  ];

  async fetchSolicitudesParaPromedio(): Promise<any[]> {
    const url = process.env.EXTERNAL_SOLICITUDES_URL || "";

    try {
      if (url) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        timeout.unref?.();

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

    return this.solicitudesMock
      .filter(
        (solicitud) =>
          solicitud.fechaCreacion &&
          Object.prototype.hasOwnProperty.call(solicitud, "fechaCompletada") &&
          typeof solicitud.tipoServicio === "string",
      )
      .map((solicitud) => ({
        id: solicitud.id,
        tipoServicio: solicitud.tipoServicio,
        estado: solicitud.estado,
        fechaCreacion: solicitud.fechaCreacion,
        fechaCompletada: solicitud.fechaCompletada ?? null,
      }));
  }

  async obtenerSolicitudPorId(
    id: string,
  ): Promise<SolicitudDetalleBase | null> {
    const solicitud = this.solicitudesMock.find(
      (item) =>
        item.id === id &&
        typeof item.unidadId === "string" &&
        typeof item.servicioId === "string" &&
        typeof item.clienteId === "string",
    );

    if (!solicitud) {
      return null;
    }

    return {
      id: solicitud.id,
      estado: solicitud.estado as SolicitudDetalleBase["estado"],
      unidadId: solicitud.unidadId!,
      servicioId: solicitud.servicioId!,
      clienteId: solicitud.clienteId!,
      servicioNombre: solicitud.servicioNombre ?? null,
      servicioTipo: solicitud.servicioTipo ?? null,
      clienteNombre: solicitud.clienteNombre ?? null,
      gananciaGenerada: solicitud.gananciaGenerada ?? null,
      fechaInicio: solicitud.fechaInicio ?? null,
      fechaFin: solicitud.fechaFin ?? null,
      consultorApertura: solicitud.consultorApertura ?? null,
      consultorCierre: solicitud.consultorCierre ?? null,
    };
  }

  async fetchSolicitudesParaDesempeno(): Promise<SolicitudDesempenoRaw[]> {
    return this.solicitudesMock
      .filter(
        (solicitud) =>
          typeof solicitud.tecnicoId === "string" &&
          typeof solicitud.especialidad === "string" &&
          Object.prototype.hasOwnProperty.call(solicitud, "fechaFinalizacion"),
      )
      .map((solicitud) => ({
        id: solicitud.id,
        estado: solicitud.estado,
        fechaFinalizacion: solicitud.fechaFinalizacion ?? null,
        tecnicoId: solicitud.tecnicoId!,
        especialidad: solicitud.especialidad!,
        calificacion: solicitud.calificacion ?? null,
      }));
  }
}
