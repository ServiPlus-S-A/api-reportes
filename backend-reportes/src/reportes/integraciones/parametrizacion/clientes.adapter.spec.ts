import { ClientesAdapter } from "./clientes.adapter";

describe("ClientesAdapter", () => {
  let adapter: ClientesAdapter;

  beforeEach(() => {
    adapter = new ClientesAdapter();
  });

  it("returns a mocked client with geographic data", async () => {
    await expect(adapter.obtenerClientePorId("cli-001")).resolves.toEqual({
      nombre: "Industrias Nova SAS",
      ciudad: "Bogotá",
      depto: "Cundinamarca",
      monto: 1250000,
      tipo: "empresarial",
      estado: "activo",
    });
  });

  it("returns a department distribution report with percentages", async () => {
    const result = await adapter.obtenerDistribucionClientesPorDepartamento();

    expect(result.totalClientes).toBeGreaterThan(0);
    expect(result.resumenPorDepartamento.length).toBeGreaterThan(0);
    expect(result.resumenPorDepartamento[0]).toEqual(
      expect.objectContaining({
        departamento: expect.any(String),
        totalClientes: expect.any(Number),
        porcentaje: expect.any(Number),
        clientes: expect.any(Array),
      }),
    );
  });

  it("returns all clients and filters clients by department", async () => {
    const allClients = await adapter.obtenerClientes();
    const antioquia = await adapter.obtenerClientesDepto("Antioquia");

    expect(Object.keys(allClients)).toHaveLength(6);
    expect(antioquia).toEqual([
      expect.objectContaining({
        nombre: "Soluciones del Norte S.A.S",
        depto: "Antioquia",
      }),
    ]);
  });

  it("throws when client is unavailable", async () => {
    await expect(adapter.obtenerClientePorId("cli-404")).rejects.toThrow(
      "CLIENT_SERVICE_UNAVAILABLE",
    );
  });

  describe("reporte consolidado por ciudad HU-08", () => {
    it("separa el gráfico de la tabla e incluye ciudades con cero solo en la tabla", async () => {
      const result = await adapter.obtenerReporteConsolidadoPorCiudad();

      expect(result.grafico.some((fila) => fila.ciudad === "Cartagena")).toBe(
        false,
      );
      expect(result.tabla).toContainEqual({
        ciudad: "Cartagena",
        departamento: "Bolívar",
        numeroClientesActivos: 0,
        porcentajeParticipacion: 0,
      });
    });

    it("agrupa ubicaciones vacías y retorna la advertencia requerida", async () => {
      const result = await adapter.obtenerReporteConsolidadoPorCiudad();

      expect(result.grafico).toContainEqual({
        ciudad: "Ciudad No Definida",
        numeroClientes: 1,
      });
      expect(result.advertencia).toBe(
        "Existen registros con datos de ubicación incompletos",
      );
    });

    it("aplica conjuntamente los filtros de tipo y estado", async () => {
      const result = await adapter.obtenerReporteConsolidadoPorCiudad(
        "persona_natural",
        "inactivo",
      );

      expect(result.totalClientes).toBe(1);
      expect(result.grafico).toEqual([
        { ciudad: "Barranquilla", numeroClientes: 1 },
      ]);
      expect(result.advertencia).toBeNull();
    });

    it("acepta alias de tipo de cliente y conserva ciudades configuradas con cero clientes", async () => {
      const result = await adapter.obtenerReporteConsolidadoPorCiudad(
        "empresa",
        "activo",
      );

      expect(result.totalClientes).toBe(4);
      expect(result.filtros).toEqual({
        tipo: "empresa",
        estado: "activo",
      });
      expect(result.grafico).toEqual(
        expect.arrayContaining([
          { ciudad: "Bogotá", numeroClientes: 1 },
          { ciudad: "Medellín", numeroClientes: 1 },
        ]),
      );
      expect(result.tabla).toContainEqual({
        ciudad: "Barranquilla",
        departamento: "Atlántico",
        numeroClientesActivos: 0,
        porcentajeParticipacion: 0,
      });
    });

    it("incluye en la tabla y el grÃ¡fico ciudades fuera del catÃ¡logo configurado", async () => {
      (adapter as any).clientes["cli-007"] = {
        nombre: "Cafeteros del Eje",
        ciudad: "Pereira",
        depto: "Risaralda",
        monto: 300000,
        tipo: "empresarial",
        estado: "activo",
      };
      (adapter as any).direccionesPrincipales["cli-007"] = {
        ciudad: "Pereira",
        departamento: "Risaralda",
      };

      const result = await adapter.obtenerReporteConsolidadoPorCiudad();

      expect(result.grafico).toContainEqual({
        ciudad: "Pereira",
        numeroClientes: 1,
      });
      expect(result.tabla).toContainEqual({
        ciudad: "Pereira",
        departamento: "Risaralda",
        numeroClientesActivos: 1,
        porcentajeParticipacion: Number((100 / 7).toFixed(2)),
      });
    });

    it("retorna totales en cero cuando los filtros no tienen coincidencias", async () => {
      const result = await adapter.obtenerReporteConsolidadoPorCiudad(
        "pyme",
        "activo",
      );

      expect(result.totalClientes).toBe(0);
      expect(result.grafico).toEqual([]);
      expect(result.advertencia).toBeNull();
      expect(
        result.tabla.every((fila) => fila.porcentajeParticipacion === 0),
      ).toBe(true);
    });
  });

  describe("reportes legados por departamento", () => {
    it("agrupa por departamento y ciudad usando alias de persona natural", async () => {
      const result = await adapter.obtenerDistribucionClientesPorDepartamento(
        "persona",
        "activo",
      );

      expect(result.totalClientes).toBe(1);
      expect(result.resumenPorDepartamento).toEqual([
        expect.objectContaining({
          departamento: "Bogotá D.C.",
          ciudad: "Ciudad No Definida",
          totalClientes: 1,
          clientesActivos: 1,
          porcentaje: 100,
        }),
      ]);
      expect(result.advertencia).toBe(
        "Existen registros con datos de ubicación incompletos",
      );
    });

    it("retorna resumen vacÃ­o sin advertencia cuando no hay coincidencias por filtros", async () => {
      const result = await adapter.obtenerDistribucionClientesPorDepartamento(
        "pyme",
        "inactivo",
      );

      expect(result).toEqual({
        totalClientes: 0,
        resumenPorDepartamento: [],
        advertencia: null,
      });
    });

    it("resume clientes por departamento con ciudades Ãºnicas y porcentajes", async () => {
      const result =
        await adapter.obtenerDistribucionClientesPorDepartamentoResumen();

      expect(result.totalClientes).toBe(6);
      expect(result.resumenPorDepartamento).toContainEqual(
        expect.objectContaining({
          departamento: "Bogotá D.C.",
          totalClientes: 1,
          clientesActivos: 1,
          porcentaje: Number((100 / 6).toFixed(2)),
          ciudades: ["Ciudad No Definida"],
        }),
      );
      expect(result.advertencia).toBe(
        "Existen registros con datos de ubicación incompletos",
      );
    });

    it("resume por departamento aplicando filtros de alias empresarial e inactivo", async () => {
      const result =
        await adapter.obtenerDistribucionClientesPorDepartamentoResumen(
          "empresa",
          "inactivo",
        );

      expect(result).toEqual({
        totalClientes: 0,
        resumenPorDepartamento: [],
        advertencia: null,
      });
    });
  });
});
