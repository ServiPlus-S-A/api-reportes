import { Injectable } from "@nestjs/common";
import { AtencionRaw } from "../../shared/interfaces/atenciones.interface";

@Injectable()
export class AtencionesAdapter {
  private readonly atencionesPorSolicitud: Record<string, AtencionRaw[]> =
    this.generarAtencionesMotas();

  private generarAtencionesMotas(): Record<string, AtencionRaw[]> {
    const atenciones = [];

    for (let i = 1; i <= 145; i++) {
      atenciones.push(this.crearAtencionMock(i));
    }

    return {
      "REQ-12345": atenciones,
      "REQ-54321": [
        {
          id: "ate-0001",
          solicitudId: "REQ-54321",
          descripcion: "Consultoría inicial del proyecto",
          lugar: "Oficina Centro, Bogotá",
          fechaHora: new Date(2026, 4, 1, 9, 0).toISOString(),
          consultorId: "con-010",
          nombreConsultor: null,
        },
        {
          id: "ate-0002",
          solicitudId: "REQ-54321",
          descripcion: "Revisión de requerimientos técnicos",
          lugar: "Oficina Norte, Medellín",
          fechaHora: new Date(2026, 4, 2, 10, 30).toISOString(),
          consultorId: "con-011",
          nombreConsultor: "Paula Torres",
        },
      ],
    };
  }

  private crearAtencionMock(i: number): AtencionRaw {
    return {
      id: `ate-${String(i).padStart(4, "0")}`,
      solicitudId: "REQ-12345",
      descripcion: this.getMockDescripcion(i),
      lugar: this.getMockLugar(i),
      fechaHora: this.getMockFechaHora(i),
      consultorId: `con-${String((i % 12) + 1).padStart(3, "0")}`,
      nombreConsultor: this.getMockNombreConsultor(i),
    };
  }

  private getMockDescripcion(i: number): string {
    const descripciones = [
      "Implementación de módulo de gestión de inventario con funcionalidades avanzadas",
      "Soporte técnico y ajustes de configuración del sistema principal",
      "Capacitación al equipo de trabajo en nuevas herramientas",
    ];
    return descripciones[i % 3];
  }

  private getMockLugar(i: number): string {
    const lugares = [
      "Oficina Centro, Bogotá",
      "Oficina Norte, Medellín",
      "Oficina Sur, Cali",
      "Oficina Este, Barranquilla",
      "Oficina Oeste, Bucaramanga",
    ];
    return lugares[i % 5];
  }

  private getMockFechaHora(i: number): string {
    const day = i % 30 === 0 ? 1 : i % 30;
    const hour = 8 + (i % 12);
    return new Date(2026, 4, day, hour).toISOString();
  }

  private getMockNombreConsultor(i: number): string {
    const nombres = [
      "Valeria Quintero",
      "Andrea Salazar",
      "Jhon Cuero",
      "Sofia Rojas",
      "Julian Muñoz",
      "Daniela Renteria",
      "Camilo Giraldo",
      "Nicolas Osorio",
      "Maria Mejia",
      "Hector Solis",
      "Paula Torres",
      "Luis Parra",
    ];
    return nombres[i % 12];
  }

  async obtenerAtencionesPorSolicitud(
    solicitudId: string,
  ): Promise<AtencionRaw[]> {
    return this.atencionesPorSolicitud[solicitudId] ?? [];
  }
}
