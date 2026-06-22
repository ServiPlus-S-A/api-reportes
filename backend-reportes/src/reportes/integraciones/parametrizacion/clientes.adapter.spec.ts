import { ClientesAdapter } from "./clientes.adapter";

describe("ClientesAdapter", () => {
  const adapter = new ClientesAdapter();

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
  });
});
