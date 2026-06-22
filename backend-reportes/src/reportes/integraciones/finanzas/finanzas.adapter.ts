import { Injectable, Logger } from "@nestjs/common";
import { FacturaFinanciera } from "../../shared/interfaces/factura-financiera.interface";

@Injectable()
export class FinanzasAdapter {
  private readonly logger = new Logger(FinanzasAdapter.name);

  // [Pattern: Adapter] (Interoperability)
  async fetchIngresosPorPeriodo(periodo: string): Promise<any[]> {
    const url = process.env.EXTERNAL_FINANZAS_URL || "";

    try {
      if (url) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        try {
          const response = await fetch(`${url}?periodo=${periodo}`, {
            signal: controller.signal,
          });
          return await response.json();
        } finally {
          clearTimeout(timeout);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to fetch from external finanzas API. Using fallback mock data. Error: ${message}`,
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

  async fetchFacturasParaExportar(
    fechaInicio: string,
    fechaFin: string,
  ): Promise<FacturaFinanciera[]> {
    const baseUrl =
      process.env.EXTERNAL_FINANZAS_EXPORT_URL ||
      (process.env.EXTERNAL_FINANZAS_URL
        ? `${process.env.EXTERNAL_FINANZAS_URL.replace(/\/$/, "")}/facturas`
        : "");

    if (baseUrl) {
      const url = new URL(baseUrl);
      url.searchParams.set("fechaInicio", fechaInicio);
      url.searchParams.set("fechaFin", fechaFin);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const response = await fetch(url.toString(), {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`FINANZAS_API_${response.status}`);
        }
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error("INVALID_FINANZAS_RESPONSE");
        return data as FacturaFinanciera[];
      } finally {
        clearTimeout(timeout);
      }
    }

    return this.facturasDemo.filter(
      (factura) => factura.fecha >= fechaInicio && factura.fecha <= fechaFin,
    );
  }

  private readonly facturasDemo: FacturaFinanciera[] = [
    {
      idFactura: "FAC-2026-001",
      nombreCliente: "Industrias Nova SAS",
      tipoServicio: "Consultoría financiera",
      valorServicio: 12000000,
      impuestosAplicados: 2280000,
      totalNeto: 14280000,
      fecha: "2026-01-05T14:00:00.000Z",
    },
    {
      idFactura: "FAC-2026-002",
      nombreCliente: "Soluciones del Norte SAS",
      tipoServicio: "Auditoría contable",
      valorServicio: 8500000,
      impuestosAplicados: 1615000,
      totalNeto: 10115000,
      fecha: "2026-02-18T16:30:00.000Z",
    },
  ];
}
