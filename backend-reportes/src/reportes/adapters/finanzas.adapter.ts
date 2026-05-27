import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";

@Injectable()
export class FinanzasAdapter {
  private readonly logger = new Logger(FinanzasAdapter.name);

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
}
