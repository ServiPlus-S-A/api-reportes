import { SolicitudesAdapter } from "./solicitudes.adapter";

describe("SolicitudesAdapter", () => {
  const adapter = new SolicitudesAdapter();

  it("returns a mocked completed solicitud", async () => {
    const result = await adapter.obtenerSolicitudPorId("REQ-12345");
    expect(result?.estado).toBe("completada");
  });

  it("returns null for unknown solicitud", async () => {
    await expect(
      adapter.obtenerSolicitudPorId("REQ-00000"),
    ).resolves.toBeNull();
  });
});
