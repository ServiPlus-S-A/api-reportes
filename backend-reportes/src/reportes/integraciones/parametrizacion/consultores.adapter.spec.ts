import { ConsultoresAdapter } from "./consultores.adapter";

describe("ConsultoresAdapter", () => {
  const adapter = new ConsultoresAdapter();

  it("returns mocked consultores for solicitud", async () => {
    const result = await adapter.obtenerConsultoresPorSolicitud("REQ-12345");
    expect(result.length).toBeGreaterThan(10);
  });

  it("returns empty list for unknown solicitud", async () => {
    await expect(
      adapter.obtenerConsultoresPorSolicitud("REQ-00000"),
    ).resolves.toEqual([]);
  });
});
