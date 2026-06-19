import { ServiciosAdapter } from "./servicios.adapter";

describe("ServiciosAdapter", () => {
  const adapter = new ServiciosAdapter();

  it("returns a mocked service", async () => {
    await expect(adapter.obtenerServicioPorId("srv-001")).resolves.toEqual({
      nombre: "Implementacion de mesa de ayuda",
      tipo: "Consultoria",
    });
  });

  it("throws when service is unavailable", async () => {
    await expect(adapter.obtenerServicioPorId("srv-404")).rejects.toThrow(
      "SERVICE_CATALOG_UNAVAILABLE",
    );
  });
});
