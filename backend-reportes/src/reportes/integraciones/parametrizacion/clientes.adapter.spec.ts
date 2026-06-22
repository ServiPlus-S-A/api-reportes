import { ClientesAdapter } from "./clientes.adapter";

describe("ClientesAdapter", () => {
  const adapter = new ClientesAdapter();

  it("returns a mocked client", async () => {
    await expect(adapter.obtenerClientePorId("cli-001")).resolves.toEqual({
      nombre: "Industrias Nova SAS",
    });
  });

  it("throws when client is unavailable", async () => {
    await expect(adapter.obtenerClientePorId("cli-404")).rejects.toThrow(
      "CLIENT_SERVICE_UNAVAILABLE",
    );
  });
});
