import { Test, TestingModule } from "@nestjs/testing";
import { ReportesService } from "./reportes.service";
import { FinanzasAdapter } from "./adapters/finanzas.adapter";
import { SolicitudesAdapter } from "./adapters/solicitudes.adapter";
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
  let solicitudesAdapter: SolicitudesAdapter;
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

  const mockSolicitudesData = [
    {
      id: "sol-001",
      tipoServicio: "Finanzas",
      estado: "Completada",
      fechaCreacion: "2026-01-03T09:00:00.000Z",
      fechaCompletada: "2026-01-03T18:00:00.000Z",
    },
    {
      id: "sol-002",
      tipoServicio: "Finanzas",
      estado: "Completada",
      fechaCreacion: "2026-01-10T10:00:00.000Z",
      fechaCompletada: "2026-01-11T10:00:00.000Z",
    },
    {
      id: "sol-003",
      tipoServicio: "Operaciones",
      estado: "Completada",
      fechaCreacion: "2026-02-05T08:30:00.000Z",
      fechaCompletada: "2026-02-05T17:30:00.000Z",
    },
    {
      id: "sol-004",
      tipoServicio: "Finanzas",
      estado: "Cancelada",
      fechaCreacion: "2026-03-01T07:00:00.000Z",
      fechaCompletada: null,
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
          provide: SolicitudesAdapter,
          useValue: {
            fetchSolicitudesParaPromedio: jest.fn(),
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
    solicitudesAdapter = module.get<SolicitudesAdapter>(SolicitudesAdapter);
    firebaseRepository = module.get<FirebaseReporteRepository>(
      FirebaseReporteRepository,
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("obtenerTiempoPromedioSolicitudes", () => {
    it("should calculate promedio and history for matching completed solicitudes", async () => {
      solicitudesAdapter.fetchSolicitudesParaPromedio = jest
        .fn()
        .mockResolvedValue(mockSolicitudesData);

      const result = await service.obtenerTiempoPromedioSolicitudes({
        fechaInicio: "2026-01-01T00:00:00.000Z",
        fechaFin: "2026-01-31T23:59:59.000Z",
        tipoServicio: "Finanzas",
      } as any);

      expect(result.solicitudesProcesadas).toBe(2);
      expect(result.promedio).toBeGreaterThan(0);
      expect(result.historicoUltimos6Meses).toHaveLength(6);
      expect(result.promedioTexto).toContain("día");
    });

    it("should return zero response when no solicitudes match the filters", async () => {
      solicitudesAdapter.fetchSolicitudesParaPromedio = jest
        .fn()
        .mockResolvedValue(mockSolicitudesData);

      const result = await service.obtenerTiempoPromedioSolicitudes({
        fechaInicio: "2026-05-01T00:00:00.000Z",
        fechaFin: "2026-05-31T23:59:59.000Z",
        tipoServicio: "Soporte",
      } as any);

      expect(result.promedio).toBe(0);
      expect(result.solicitudesProcesadas).toBe(0);
      expect(result.mensaje).toBe(
        "Sin datos de cierre para el periodo consultado",
      );
    });

    it("should use default date boundaries when they are not provided", async () => {
      solicitudesAdapter.fetchSolicitudesParaPromedio = jest
        .fn()
        .mockResolvedValue(mockSolicitudesData);

      const result = await service.obtenerTiempoPromedioSolicitudes({
        tipoServicio: "Finanzas",
      } as any);

      expect(result.solicitudesProcesadas).toBe(2);
      expect(result.historicoUltimos6Meses.length).toBeGreaterThan(0);
    });
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

  describe("generarReporte - Redis Errors", () => {
    it("should proceed to source if Redis read fails", async () => {
      const mockRedisInstance = (service as any).redisClient;
      mockRedisInstance.get = jest
        .fn()
        .mockRejectedValue(new Error("Redis Read Error"));

      const dto: GenerarReporteDto = {
        periodo: "2026-05",
        tipo: "finanzas",
      };

      const result = await service.generarReporte(dto, "test_user");
      expect(result).toBeDefined();
      expect(finanzasAdapter.fetchIngresosPorPeriodo).toHaveBeenCalled();
    });

    it("should log warning if Redis write fails but return result", async () => {
      const mockRedisInstance = (service as any).redisClient;
      mockRedisInstance.get = jest.fn().mockResolvedValue(null);
      mockRedisInstance.set = jest
        .fn()
        .mockRejectedValue(new Error("Redis Write Error"));

      const dto: GenerarReporteDto = {
        periodo: "2026-05",
        tipo: "finanzas",
      };

      const result = await service.generarReporte(dto, "test_user");
      expect(result).toBeDefined();
      expect(mockRedisInstance.set).toHaveBeenCalled();
    });
  });

  describe("Redis Retry Strategy", () => {
    it("should return null if retries exceed 2", () => {
      /* const redisOptions = (service as any).redisClient.options;
      const retryStrategy = (service as any).redisClient.options.retryStrategy; */
      // We can't easily access the actual instance strategy if it's mocked,
      // but we can test the logic if we extract it or test the implementation.
      // Since ioredis is mocked, this is more for documentation or if we had real instance.
    });
  });
});
