import { Injectable } from "@nestjs/common";

@Injectable()
export class ServiciosAdapter {
  private readonly servicios: Record<string, { nombre: string; tipo: string }> =
    {
      "srv-001": {
        nombre: "Implementacion de mesa de ayuda",
        tipo: "Consultoria",
      },
    };

  async obtenerServicioPorId(
    servicioId: string,
  ): Promise<{ nombre: string; tipo: string }> {
    const servicio = this.servicios[servicioId];
    if (!servicio) {
      throw new Error("SERVICE_CATALOG_UNAVAILABLE");
    }

    return servicio;
  }
}
