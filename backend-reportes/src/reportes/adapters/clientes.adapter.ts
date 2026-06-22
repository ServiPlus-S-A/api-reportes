import { Injectable } from "@nestjs/common";

export interface ClienteMock {
  nombre: string;
  ciudad: string;
  depto: string;
  monto: number;
  tipo: string;
  estado: string;
}

@Injectable()
export class ClientesAdapter {
  private readonly clientes: Record<string, ClienteMock> = {
    "cli-001": {
      nombre: "Industrias Nova SAS",
      ciudad: "Bogotá",
      depto: "Cundinamarca",
      monto: 1250000,
      tipo: "empresarial",
      estado: "activo",
    },
    "cli-002": {
      nombre: "Soluciones del Norte S.A.S",
      ciudad: "Medellín",
      depto: "Antioquia",
      monto: 980000,
      tipo: "empresarial",
      estado: "activo",
    },
    "cli-003": {
      nombre: "AgroAndina Ltda",
      ciudad: "Cali",
      depto: "Valle del Cauca",
      monto: 1500000,
      tipo: "empresarial",
      estado: "activo",
    },
    "cli-004": {
      nombre: "Textiles del Caribe",
      ciudad: "Barranquilla",
      depto: "Atlántico",
      monto: 720000,
      tipo: "persona_natural",
      estado: "inactivo",
    },
    "cli-005": {
      nombre: "Inversiones Andina",
      ciudad: "Bucaramanga",
      depto: "Santander",
      monto: 2140000,
      tipo: "empresarial",
      estado: "activo",
    },
    "cli-006": {
      nombre: "Comercializadora Centro",
      ciudad: "",
      depto: "Bogotá D.C.",
      monto: 400000,
      tipo: "persona_natural",
      estado: "activo",
    },
  };

  async obtenerClientePorId(clienteId: string): Promise<ClienteMock> {
    const cliente = this.clientes[clienteId];
    if (!cliente) {
      throw new Error("CLIENT_SERVICE_UNAVAILABLE");
    }

    return cliente;
  }

  async obtenerClientes(): Promise<Record<string, ClienteMock>> {
    return this.clientes;
  }

  async obtenerClientesDepto(depto: string): Promise<ClienteMock[]> {
    return Object.values(this.clientes).filter(
      (cliente) => cliente.depto === depto,
    );
  }

  async obtenerDistribucionClientesPorDepartamento(
    tipo?: string,
    estado?: string,
  ): Promise<{
    totalClientes: number;
    resumenPorDepartamento: Array<{
      departamento: string;
      ciudad: string;
      totalClientes: number;
      clientesActivos: number;
      porcentaje: number;
      clientes: ClienteMock[];
    }>;
    advertencia: string | null;
  }> {
    const clientes = this.filtrarClientes(tipo, estado);
    const totalClientes = clientes.length;

    const agrupado = new Map<string, ClienteMock[]>();

    for (const cliente of clientes) {
      const departamento = cliente.depto?.trim() || "Departamento No Definido";
      const ciudad = cliente.ciudad?.trim() || "Ciudad No Definida";
      const key = `${departamento}::${ciudad}`;

      if (!agrupado.has(key)) {
        agrupado.set(key, []);
      }
      agrupado.get(key)!.push(cliente);
    }

    const resumenPorDepartamento = Array.from(agrupado.entries())
      .map(([key, clientesDelGrupo]) => {
        const [departamento, ciudad] = key.split("::");
        const totalClientesGrupo = clientesDelGrupo.length;
        const clientesActivos = clientesDelGrupo.filter(
          (cliente) => cliente.estado.toLowerCase() === "activo",
        ).length;
        const porcentaje = totalClientes
          ? Number(((totalClientesGrupo / totalClientes) * 100).toFixed(2))
          : 0;

        return {
          departamento,
          ciudad,
          totalClientes: totalClientesGrupo,
          clientesActivos,
          porcentaje,
          clientes: clientesDelGrupo,
        };
      })
      .sort((a, b) => b.totalClientes - a.totalClientes);

    return {
      totalClientes,
      resumenPorDepartamento,
      advertencia: this.obtenerAdvertencia(clientes),
    };
  }

  async obtenerDistribucionClientesPorDepartamentoResumen(
    tipo?: string,
    estado?: string,
  ): Promise<{
    totalClientes: number;
    resumenPorDepartamento: Array<{
      departamento: string;
      totalClientes: number;
      clientesActivos: number;
      porcentaje: number;
      ciudades: string[];
      clientes: ClienteMock[];
    }>;
    advertencia: string | null;
  }> {
    const clientes = this.filtrarClientes(tipo, estado);
    const totalClientes = clientes.length;

    const agrupado = new Map<string, ClienteMock[]>();

    for (const cliente of clientes) {
      const departamento = cliente.depto?.trim() || "Departamento No Definido";
      if (!agrupado.has(departamento)) {
        agrupado.set(departamento, []);
      }
      agrupado.get(departamento)!.push(cliente);
    }

    const resumenPorDepartamento = Array.from(agrupado.entries())
      .map(([departamento, clientesDelDepartamento]) => {
        const totalClientesDepartamento = clientesDelDepartamento.length;
        const clientesActivos = clientesDelDepartamento.filter(
          (cliente) => cliente.estado.toLowerCase() === "activo",
        ).length;
        const porcentaje = totalClientes
          ? Number(
              ((totalClientesDepartamento / totalClientes) * 100).toFixed(2),
            )
          : 0;
        const ciudades = Array.from(
          new Set(
            clientesDelDepartamento.map((cliente) =>
              (cliente.ciudad || "Ciudad No Definida").trim() ||
                "Ciudad No Definida",
            ),
          ),
        );

        return {
          departamento,
          totalClientes: totalClientesDepartamento,
          clientesActivos,
          porcentaje,
          ciudades,
          clientes: clientesDelDepartamento,
        };
      })
      .sort((a, b) => b.totalClientes - a.totalClientes);

    return {
      totalClientes,
      resumenPorDepartamento,
      advertencia: this.obtenerAdvertencia(clientes),
    };
  }

  private filtrarClientes(tipo?: string, estado?: string): ClienteMock[] {
    return Object.values(this.clientes).filter((cliente) => {
      const matchTipo = !tipo
        ? true
        : cliente.tipo.toLowerCase() === tipo.toLowerCase() ||
          (tipo.toLowerCase() === "persona" &&
            cliente.tipo.toLowerCase() === "persona_natural") ||
          (tipo.toLowerCase() === "empresa" &&
            cliente.tipo.toLowerCase() === "empresarial");
      const matchEstado = !estado
        ? true
        : cliente.estado.toLowerCase() === estado.toLowerCase();
      return matchTipo && matchEstado;
    });
  }

  private obtenerAdvertencia(clientes: ClienteMock[]): string | null {
    return clientes.some(
      (cliente) => !cliente.ciudad || cliente.ciudad.trim() === "",
    )
      ? "Existen registros con datos de ubicación incompletos"
      : null;
  }
}
