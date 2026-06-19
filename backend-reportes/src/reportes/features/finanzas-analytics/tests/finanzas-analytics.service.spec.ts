import { Test, TestingModule } from "@nestjs/testing";
import { FinanzasAnalyticsService } from "../finanzas-analytics.service";
import { FinanzasAdapter } from "../../../integraciones/finanzas/finanzas.adapter";
import { FirebaseReporteRepository } from "../../../shared/repositories/firebase-reporte.repository";

jest.mock("ioredis", () => require("ioredis-mock"));

describe("FinanzasAnalyticsService", () => {
  let service: FinanzasAnalyticsService;
  let adapter: jest.Mocked<FinanzasAdapter>;
  let repository: jest.Mocked<FirebaseReporteRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinanzasAnalyticsService,
        {
          provide: FinanzasAdapter,
          useValue: { fetchIngresosPorPeriodo: jest.fn() },
        },
        {
          provide: FirebaseReporteRepository,
          useValue: { saveAuditLog: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<FinanzasAnalyticsService>(FinanzasAnalyticsService);
    adapter = module.get(FinanzasAdapter);
    repository = module.get(FirebaseReporteRepository);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("generarReporte", () => {
    it("deberia generar el reporte calculando ingresos y egresos correctamente", async () => {
      adapter.fetchIngresosPorPeriodo.mockResolvedValue([
        { monto: 100, tipo: "ingreso", periodo: "2024-Q1", id: "1" },
        { monto: 40, tipo: "egreso", periodo: "2024-Q1", id: "2" },
      ]);
      const dto = { periodo: "2024-Q1", tipo: "trimestral" };
      const resultado = await service.generarReporte(dto, "user1");

      expect(resultado.totalIngresos).toBe(100);
      expect(resultado.totalEgresos).toBe(40);
      expect(resultado.balance).toBe(60);
      expect(repository.saveAuditLog).toHaveBeenCalled();
    });
  });
});
