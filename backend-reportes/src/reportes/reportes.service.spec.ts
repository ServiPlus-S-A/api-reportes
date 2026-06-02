import { Test, TestingModule } from "@nestjs/testing";
import { ReportesService } from "./reportes.service";
import { FinanzasAdapter } from "./adapters/finanzas.adapter";
import { FirebaseReporteRepository } from "./repositories/firebase-reporte.repository";
import { GenerarReporteDto } from "./dto/generar-reporte.dto";

// Mock Redis client manually to control ready state and methods
jest.mock("ioredis", () => {
  return jest.fn().mockImplementation(() => {
    return {
      status: "ready",
      get: jest.fn(),
      set: jest.fn(),
      on: jest.fn(),
    };
  });
});

describe("ReportesService", () => {
  let service: ReportesService;
  let finanzasAdapter: FinanzasAdapter;
  let firebaseRepository: FirebaseReporteRepository;

  const mockFinanzasData = [
    {
      id: "1",
      descripcion: "Ingreso 1",
      monto: 1000,
      tipo: "ingreso",
      fecha: "2026-05-01",
    },
    {
      id: "2",
      descripcion: "Ingreso 2",
      monto: 2000,
      tipo: "ingreso",
      fecha: "2026-05-02",
    },
    {
      id: "3",
      descripcion: "Egreso 1",
      monto: 500,
      tipo: "egreso",
      fecha: "2026-05-03",
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportesService,
        {
          provide: FinanzasAdapter,
          useValue: {
            fetchIngresosPorPeriodo: jest
              .fn()
              .mockResolvedValue(mockFinanzasData),
          },
        },
        {
          provide: FirebaseReporteRepository,
          useValue: {
            saveAuditLog: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<ReportesService>(ReportesService);
    finanzasAdapter = module.get<FinanzasAdapter>(FinanzasAdapter);
    firebaseRepository = module.get<FirebaseReporteRepository>(
      FirebaseReporteRepository,
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("generarReporte - Cache Miss", () => {
    it("should fetch fresh data, perform correct calculations, write to cache, and save audit logs", async () => {
      // Force Redis get to return null (cache miss)
      const mockRedisInstance = (service as any).redisClient;
      mockRedisInstance.get = jest.fn().mockResolvedValue(null);
      mockRedisInstance.set = jest.fn().mockResolvedValue("OK");

      const dto: GenerarReporteDto = {
        periodo: "2026-05",
        tipo: "finanzas",
      };

      const result = await service.generarReporte(dto, "test_user");

      // Assert calculations
      expect(result.totalIngresos).toBe(3000);
      expect(result.totalEgresos).toBe(500);
      expect(result.balance).toBe(2500);
      expect(result.generadoPor).toBe("test_user");

      // Assert dependencies were invoked
      expect(finanzasAdapter.fetchIngresosPorPeriodo).toHaveBeenCalledWith(
        "2026-05",
      );
      expect(mockRedisInstance.set).toHaveBeenCalled();
      expect(firebaseRepository.saveAuditLog).toHaveBeenCalled();
    });
  });

  describe("generarReporte - Cache Hit", () => {
    it("should return cached data directly and write audit logs", async () => {
      const cachedReport = {
        id: "cached123",
        periodo: "2026-05",
        tipo: "finanzas",
        totalIngresos: 5000,
        totalEgresos: 1000,
        balance: 4000,
        generadoPor: "old_user",
        fechaCreacion: new Date().toISOString(),
        detalles: [],
      };

      // Force Redis get to return cached object
      const mockRedisInstance = (service as any).redisClient;
      mockRedisInstance.get = jest
        .fn()
        .mockResolvedValue(JSON.stringify(cachedReport));

      const dto: GenerarReporteDto = {
        periodo: "2026-05",
        tipo: "finanzas",
      };

      const result = await service.generarReporte(dto, "new_user");

      // Assert returned report matches the cached data
      expect(result.id).toBe("cached123");
      expect(result.balance).toBe(4000);

      // Verify adapter is bypassed
      expect(finanzasAdapter.fetchIngresosPorPeriodo).not.toHaveBeenCalled();
      expect(firebaseRepository.saveAuditLog).toHaveBeenCalled();
    });
  });
});
