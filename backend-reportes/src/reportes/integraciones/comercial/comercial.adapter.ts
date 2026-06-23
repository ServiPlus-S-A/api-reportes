import { Injectable, Logger } from "@nestjs/common";

export interface FacturaComercial {
  id: string;
  tipoServicio: string;
  monto: number;
  moneda: string;
  estadoFactura: string;
  fechaFactura: string;
}

@Injectable()
export class ComercialAdapter {
  private readonly logger = new Logger(ComercialAdapter.name);

  // [Pattern: Adapter] (Interoperability)
  async fetchFacturasPagadas(): Promise<FacturaComercial[]> {
    const url = process.env.EXTERNAL_COMERCIAL_URL || "";

    try {
      if (url) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        try {
          const response = await fetch(url, {
            signal: controller.signal,
          });
          if (!response.ok) {
            throw new Error(`HTTP status error: ${response.status}`);
          }
          return await response.json();
        } finally {
          clearTimeout(timeout);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to fetch from external comercial API. Using fallback mock data. Error: ${message}`,
      );
      // In production, integration failures should propagate if needed.
      // But according to user stories/tests, we throw on integration errors.
      // Let's propagate the error so that the service can catch and throw the 500 error message.
      throw new Error(`Error de integración comercial: ${message}`);
    }

    // Fallback Mock Data for local verification and demo
    return [
      {
        id: "FAC-001",
        tipoServicio: "Soporte",
        monto: 1000000,
        moneda: "COP",
        estadoFactura: "Pagada",
        fechaFactura: "2026-05-10T10:00:00.000Z",
      },
      {
        id: "FAC-002",
        tipoServicio: "Mantenimiento",
        monto: 1500000,
        moneda: "COP",
        estadoFactura: "Pagada",
        fechaFactura: "2026-05-15T14:30:00.000Z",
      },
      {
        id: "FAC-003",
        tipoServicio: "Consultoría",
        monto: 2000000,
        moneda: "COP",
        estadoFactura: "Pagada",
        fechaFactura: "2026-05-20T09:00:00.000Z",
      },
      {
        id: "FAC-004",
        tipoServicio: "Soporte",
        monto: 500, // USD
        moneda: "USD",
        estadoFactura: "Pagada",
        fechaFactura: "2026-05-25T11:15:00.000Z",
      },
      {
        id: "FAC-005",
        tipoServicio: "Consultoría",
        monto: 3000000,
        moneda: "COP",
        estadoFactura: "Pendiente", // Should be ignored (not Pagada)
        fechaFactura: "2026-06-02T16:00:00.000Z",
      },
      {
        id: "FAC-006",
        tipoServicio: "Mantenimiento",
        monto: 2500, // USD
        moneda: "USD",
        estadoFactura: "Pagada",
        fechaFactura: "2026-06-10T08:45:00.000Z",
      },
      {
        id: "FAC-007",
        tipoServicio: "Consultoría",
        monto: 1200000,
        moneda: "COP",
        estadoFactura: "Anulada", // Should be ignored (not Pagada)
        fechaFactura: "2026-06-15T15:20:00.000Z",
      },
    ];
  }
}
