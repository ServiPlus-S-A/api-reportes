import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";

@Injectable()
export class FinanzasAdapter {
  private readonly logger = new Logger(FinanzasAdapter.name);

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

  // [Pattern: Adapter] (Interoperability)
  async fetchIngresosPorPeriodo(periodo: string): Promise<any[]> {
    const url = process.env.EXTERNAL_FINANZAS_URL || "";

    try {
      if (url) {
        const response = await axios.get(`${url}?periodo=${periodo}`, {
          timeout: 3000,
        });
        return response.data;
      }
    } catch (error) {
      this.logger.warn(
        `Failed to fetch from external finanzas API. Using fallback mock data. Error: ${error.message}`,
      );
    }

    // Fallback Mock Data for demo/offline verification
    return [
      {
        id: "1",
        descripcion: "Soporte Técnico Especializado",
        monto: 12000,
        tipo: "ingreso",
        fecha: `${periodo}-05`,
      },
      {
        id: "2",
        descripcion: "Licenciamiento Anual SaaS",
        monto: 25000,
        tipo: "ingreso",
        fecha: `${periodo}-10`,
      },
      {
        id: "3",
        descripcion: "Honorarios Consultoría TI",
        monto: 8500,
        tipo: "ingreso",
        fecha: `${periodo}-15`,
      },
      {
        id: "4",
        descripcion: "Mantenimiento de Servidores Cloud",
        monto: 4500,
        tipo: "egreso",
        fecha: `${periodo}-20`,
      },
      {
        id: "5",
        descripcion: "Arrendamiento de Oficinas",
        monto: 3500,
        tipo: "egreso",
        fecha: `${periodo}-25`,
      },
    ];
  }

  async fetchSolicitudesParaPromedio(): Promise<any[]> {
    const url = process.env.EXTERNAL_SOLICITUDES_URL || "";

    try {
      if (url) {
        const response = await axios.get(url, { timeout: 3000 });
        return response.data;
      }
    } catch (error) {
      this.logger.warn(
        `Failed to fetch from external solicitudes API. Using fallback mock data. Error: ${error.message}`,
      );
    }

    return this.solicitudesDemo;
  }
}
