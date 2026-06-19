import { Test, TestingModule } from "@nestjs/testing";
import { AtencionesAdapter } from "./atenciones.adapter";

describe("AtencionesAdapter", () => {
  let adapter: AtencionesAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AtencionesAdapter],
    }).compile();

    adapter = module.get<AtencionesAdapter>(AtencionesAdapter);
  });

  describe("obtenerAtencionesPorSolicitud", () => {
    it("should return 145 attentions for REQ-12345", async () => {
      const resultado =
        await adapter.obtenerAtencionesPorSolicitud("REQ-12345");
      expect(resultado).toHaveLength(145);
      expect(resultado[0]).toHaveProperty("id");
      expect(resultado[0]).toHaveProperty("solicitudId", "REQ-12345");
    });

    it("should return 2 attentions for REQ-54321", async () => {
      const resultado =
        await adapter.obtenerAtencionesPorSolicitud("REQ-54321");
      expect(resultado).toHaveLength(2);
      expect(resultado[0].solicitudId).toBe("REQ-54321");
    });

    it("should return empty array for unknown solicitude", async () => {
      const resultado =
        await adapter.obtenerAtencionesPorSolicitud("REQ-UNKNOWN");
      expect(resultado).toHaveLength(0);
      expect(Array.isArray(resultado)).toBe(true);
    });

    it("should return attentions with proper structure", async () => {
      const resultado =
        await adapter.obtenerAtencionesPorSolicitud("REQ-12345");
      const atencion = resultado[0];

      expect(atencion).toHaveProperty("id");
      expect(atencion).toHaveProperty("solicitudId");
      expect(atencion).toHaveProperty("descripcion");
      expect(atencion).toHaveProperty("lugar");
      expect(atencion).toHaveProperty("fechaHora");
      expect(atencion).toHaveProperty("consultorId");
      expect(atencion).toHaveProperty("nombreConsultor");
    });

    it("should have consultants names in atenciones", async () => {
      const resultado =
        await adapter.obtenerAtencionesPorSolicitud("REQ-12345");
      const conNombre = resultado.filter((a) => a.nombreConsultor !== null);
      expect(conNombre.length).toBeGreaterThan(0);
    });
  });
});
