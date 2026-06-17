import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";

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

  async fetchSolicitudesParaPromedio(): Promise<any[]> {
    const url = process.env.EXTERNAL_SOLICITUDES_URL || "";

    try {
      if (url) {
        const response = await axios.get(url, { timeout: 3000 });
        return response.data;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to fetch from external solicitudes API. Using fallback mock data. Error: ${message}`,
      );
    }

    return this.solicitudesDemo;
  }
}
