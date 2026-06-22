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
});
