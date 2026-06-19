import { Injectable } from "@nestjs/common";

@Injectable()
export class ClientesAdapter {
  private readonly clientes: Record<string, { nombre: string }> = {
    "cli-001": { nombre: "Industrias Nova SAS" },
  };

  async obtenerClientePorId(clienteId: string): Promise<{ nombre: string }> {
    const cliente = this.clientes[clienteId];
    if (!cliente) {
      throw new Error("CLIENT_SERVICE_UNAVAILABLE");
    }

    return cliente;
  }
}
