import { Injectable } from "@nestjs/common";

export interface ClienteMock {
  nombre: string;
  ciudad: string;
  depto: string;
  monto: number;
  tipo: string;
  estado: string;
}

export interface DistribucionClientesResponse {
  totalClientes: number;
  filtros: { tipo: string | null; estado: string | null };
  grafico: Array<{ ciudad: string; numeroClientes: number }>;
  tabla: Array<{
    ciudad: string;
    departamento: string;
    numeroClientesActivos: number;
    porcentajeParticipacion: number;
  }>;
  advertencia: string | null;
}

@Injectable()
export class ClientesAdapter {
  /** Catálogo de ubicaciones configurado por Gestión de Clientes. */
  private readonly ciudadesConfiguradas = [
    { ciudad: "Bogotá", departamento: "Cundinamarca" },
    { ciudad: "Medellín", departamento: "Antioquia" },
    { ciudad: "Cali", departamento: "Valle del Cauca" },
    { ciudad: "Barranquilla", departamento: "Atlántico" },
    { ciudad: "Bucaramanga", departamento: "Santander" },
    { ciudad: "Cartagena", departamento: "Bolívar" },
  ];

  /** Ubicación tomada de la dirección principal del registro de cada cliente. */
  private readonly direccionesPrincipales: Record<
    string,
    { ciudad: string; departamento: string }
  > = {
    "cli-001": { ciudad: "Bogotá", departamento: "Cundinamarca" },
    "cli-002": { ciudad: "Medellín", departamento: "Antioquia" },
    "cli-003": { ciudad: "Cali", departamento: "Valle del Cauca" },
    "cli-004": { ciudad: "Barranquilla", departamento: "Atlántico" },
    "cli-005": { ciudad: "Bucaramanga", departamento: "Santander" },
    "cli-006": { ciudad: "", departamento: "Bogotá D.C." },
  };

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

  async obtenerReporteConsolidadoPorCiudad(
    tipo?: string,
    estado?: string,
  ): Promise<DistribucionClientesResponse> {
    const registros = Object.entries(this.clientes)
      .filter(([, cliente]) => this.coincideFiltro(cliente, tipo, estado))
      .map(([id, cliente]) => ({
        cliente,
        direccionPrincipal: this.direccionesPrincipales[id] ?? {
          ciudad: "",
          departamento: "",
        },
      }));

    const totalClientes = registros.length;
    const conteo = new Map<
      string,
      { ciudad: string; departamento: string; total: number; activos: number }
    >();

    for (const { cliente, direccionPrincipal } of registros) {
      const ciudad =
        direccionPrincipal.ciudad?.trim() || "Ciudad No Definida";
      const departamento =
        direccionPrincipal.departamento?.trim() ||
        "Departamento No Definido";
      const key = `${departamento}::${ciudad}`;
      const actual = conteo.get(key) ?? {
        ciudad,
        departamento,
        total: 0,
        activos: 0,
      };
      actual.total += 1;
      if (cliente.estado.toLowerCase() === "activo") actual.activos += 1;
      conteo.set(key, actual);
    }

    const tablaBase = this.ciudadesConfiguradas.map((ubicacion) => {
      const key = `${ubicacion.departamento}::${ubicacion.ciudad}`;
      return (
        conteo.get(key) ?? { ...ubicacion, total: 0, activos: 0 }
      );
    });
    const ciudadNoDefinida = Array.from(conteo.values()).find(
      (item) => item.ciudad === "Ciudad No Definida",
    );
    const clavesCatalogo = new Set(
      this.ciudadesConfiguradas.map(
        (item) => `${item.departamento}::${item.ciudad}`,
      ),
    );
    const ciudadesFueraDelCatalogo = Array.from(conteo.entries())
      .filter(
        ([key, item]) =>
          !clavesCatalogo.has(key) && item.ciudad !== "Ciudad No Definida",
      )
      .map(([, item]) => item);
    const filas = [
      ...tablaBase,
      ...ciudadesFueraDelCatalogo,
      ...(ciudadNoDefinida ? [ciudadNoDefinida] : []),
    ];

    return {
      totalClientes,
      filtros: { tipo: tipo ?? null, estado: estado ?? null },
      grafico: Array.from(conteo.values())
        .filter((item) => item.total > 0)
        .map((item) => ({ ciudad: item.ciudad, numeroClientes: item.total }))
        .sort((a, b) => b.numeroClientes - a.numeroClientes),
      tabla: filas
        .map((item) => ({
          ciudad: item.ciudad,
          departamento: item.departamento,
          numeroClientesActivos: item.activos,
          porcentajeParticipacion: totalClientes
            ? Number(((item.total / totalClientes) * 100).toFixed(2))
            : 0,
        }))
        .sort((a, b) =>
          a.ciudad.localeCompare(b.ciudad, "es", { sensitivity: "base" }),
        ),
      advertencia: ciudadNoDefinida
        ? "Existen registros con datos de ubicación incompletos"
        : null,
    };
  }

  private filtrarClientes(tipo?: string, estado?: string): ClienteMock[] {
    return Object.values(this.clientes).filter((cliente) =>
      this.coincideFiltro(cliente, tipo, estado),
    );
  }

  private coincideFiltro(
    cliente: ClienteMock,
    tipo?: string,
    estado?: string,
  ): boolean {
    const tipoNormalizado = tipo?.toLowerCase();
    const tipoCliente = cliente.tipo.toLowerCase();
    const matchTipo = tipoNormalizado
      ? tipoCliente === tipoNormalizado ||
        (tipoNormalizado === "persona" && tipoCliente === "persona_natural") ||
        (tipoNormalizado === "empresa" && tipoCliente === "empresarial")
      : true;

    const estadoNormalizado = estado?.toLowerCase();
    const matchEstado = estadoNormalizado
      ? cliente.estado.toLowerCase() === estadoNormalizado
      : true;

    return matchTipo && matchEstado;
  }

  private obtenerAdvertencia(clientes: ClienteMock[]): string | null {
    return clientes.some(
      (cliente) => !cliente.ciudad || cliente.ciudad.trim() === "",
    )
      ? "Existen registros con datos de ubicación incompletos"
      : null;
  }
}
