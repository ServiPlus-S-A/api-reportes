import { Injectable } from "@nestjs/common";
import { ConsultorResumenDto } from "../../shared/dto/detalle-solicitud-response.dto";
import { TecnicoDesempenoRaw } from "../../shared/interfaces/desempeno-tecnicos.interface";

@Injectable()
export class ConsultoresAdapter {
  private readonly consultoresPorSolicitud: Record<
    string,
    ConsultorResumenDto[]
  > = {
    "REQ-12345": [
      { id: "con-001", nombre: "Andrea Salazar" },
      { id: "con-002", nombre: "Jhon Cuero" },
      { id: "con-003", nombre: "Sofia Rojas" },
      { id: "con-004", nombre: "Julian Muñoz" },
      { id: "con-005", nombre: "Daniela Renteria" },
      { id: "con-006", nombre: "Camilo Giraldo" },
      { id: "con-007", nombre: "Nicolas Osorio" },
      { id: "con-008", nombre: "Maria Mejia" },
      { id: "con-009", nombre: "Hector Solis" },
      { id: "con-010", nombre: "Paula Torres" },
      { id: "con-011", nombre: "Luis Parra" },
      { id: "con-012", nombre: "Valeria Quintero" },
    ],
    "REQ-54321": [
      { id: "con-010", nombre: null },
      { id: "con-011", nombre: "Paula Torres" },
    ],
  };

  private readonly tecnicosDesempeno: TecnicoDesempenoRaw[] = [
    { id: "tec-001", nombre: "Andrea Salazar", especialidad: "Soporte" },
    {
      id: "tec-002",
      nombre: "Julian Munoz",
      especialidad: "Mantenimiento",
    },
    { id: "tec-003", nombre: "Paula Torres", especialidad: "Consultoria" },
    { id: "tec-004", nombre: "Camilo Giraldo", especialidad: "Soporte" },
    {
      id: "tec-005",
      nombre: "Valeria Quintero",
      especialidad: "Mantenimiento",
    },
    {
      id: "tec-006",
      nombre: "Nicolas Osorio",
      especialidad: "Consultoria",
    },
  ];

  async obtenerConsultoresPorSolicitud(
    solicitudId: string,
  ): Promise<ConsultorResumenDto[]> {
    return this.consultoresPorSolicitud[solicitudId] ?? [];
  }

  async obtenerTecnicosParaDesempeno(): Promise<TecnicoDesempenoRaw[]> {
    return this.tecnicosDesempeno;
  }
}
