import { Injectable } from "@nestjs/common";
import { AtencionRaw } from "../interfaces/atenciones.interface";

@Injectable()
export class AtencionesAdapter {
  private readonly atencionesPorSolicitud: Record<string, AtencionRaw[]> =
    this.generarAtencionesMotas();

  private generarAtencionesMotas(): Record<string, AtencionRaw[]> {
    const atenciones = [];

    for (let i = 1; i <= 145; i++) {
      atenciones.push({
        id: `ate-${String(i).padStart(4, "0")}`,
        solicitudId: "REQ-12345",
        descripcion:
          i % 3 === 0
            ? "Implementación de módulo de gestión de inventario con funcionalidades avanzadas"
            : i % 3 === 1
              ? "Soporte técnico y ajustes de configuración del sistema principal"
              : "Capacitación al equipo de trabajo en nuevas herramientas",
        lugar:
          i % 5 === 0
            ? "Oficina Centro, Bogotá"
            : i % 5 === 1
              ? "Oficina Norte, Medellín"
              : i % 5 === 2
                ? "Oficina Sur, Cali"
                : i % 5 === 3
                  ? "Oficina Este, Barranquilla"
                  : "Oficina Oeste, Bucaramanga",
        fechaHora: new Date(
          2026,
          4,
          i % 30 === 0 ? 1 : i % 30,
          8 + (i % 12),
        ).toISOString(),
        consultorId: `con-${String((i % 12) + 1).padStart(3, "0")}`,
        nombreConsultor:
          i % 12 === 1
            ? "Andrea Salazar"
            : i % 12 === 2
              ? "Jhon Cuero"
              : i % 12 === 3
                ? "Sofia Rojas"
                : i % 12 === 4
                  ? "Julian Muñoz"
                  : i % 12 === 5
                    ? "Daniela Renteria"
                    : i % 12 === 6
                      ? "Camilo Giraldo"
                      : i % 12 === 7
                        ? "Nicolas Osorio"
                        : i % 12 === 8
                          ? "Maria Mejia"
                          : i % 12 === 9
                            ? "Hector Solis"
                            : i % 12 === 10
                              ? "Paula Torres"
                              : i % 12 === 11
                                ? "Luis Parra"
                                : "Valeria Quintero",
      });
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

  async obtenerAtencionesPorSolicitud(
    solicitudId: string,
  ): Promise<AtencionRaw[]> {
    return this.atencionesPorSolicitud[solicitudId] ?? [];
  }
}
