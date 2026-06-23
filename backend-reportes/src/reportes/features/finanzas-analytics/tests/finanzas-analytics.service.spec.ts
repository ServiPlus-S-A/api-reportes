import { Test, TestingModule } from "@nestjs/testing";
import { FinanzasAnalyticsService } from "../finanzas-analytics.service";
import { FinanzasAdapter } from "../../../integraciones/finanzas/finanzas.adapter";
import { FirebaseReporteRepository } from "../../../shared/repositories/firebase-reporte.repository";
import Redis from "ioredis";
import {
  generarExcelFinanciero,
  generarPdfFinanciero,
} from "../../../shared/utils/export-financiero.util";

// Mock ioredis before any import resolves it
jest.mock("ioredis", () => {
  const mockRedis = {
    status: "ready",
    on: jest.fn(),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue("OK"),
    disconnect: jest.fn(),
  };
  return { default: jest.fn(() => mockRedis), __esModule: true };
});

jest.mock("../../../shared/utils/export-financiero.util", () => ({
  generarExcelFinanciero: jest.fn(),
  generarPdfFinanciero: jest.fn(),
}));

describe("FinanzasAnalyticsService", () => {
  let service: FinanzasAnalyticsService;
  let adapter: jest.Mocked<FinanzasAdapter>;
  let repository: jest.Mocked<FirebaseReporteRepository>;
  let mockRedisClient: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinanzasAnalyticsService,
        {
          provide: FinanzasAdapter,
          useValue: {
            fetchIngresosPorPeriodo: jest.fn(),
            fetchFacturasParaExportar: jest.fn(),
          },
        },
        {
          provide: FirebaseReporteRepository,
          useValue: { saveAuditLog: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<FinanzasAnalyticsService>(FinanzasAnalyticsService);
    adapter = module.get(FinanzasAdapter);
    repository = module.get(FirebaseReporteRepository);
    mockRedisClient = (service as any).redisClient;
    (generarExcelFinanciero as jest.Mock).mockResolvedValue(
      Buffer.from("xlsx"),
    );
    (generarPdfFinanciero as jest.Mock).mockResolvedValue(Buffer.from("pdf"));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("redis initialization", () => {
    it("should handle retryStrategy", () => {
      const loggerWarnSpy = jest.spyOn((service as any).logger, "warn");
      const redisConstructorMock = Redis as unknown as jest.Mock;
      const options = redisConstructorMock.mock.calls[0][0];

      const retryResult1 = options.retryStrategy(1);
      expect(retryResult1).toBe(500);

      const retryResult3 = options.retryStrategy(3);
      expect(retryResult3).toBeNull();
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        "Redis connection failed too many times. Running without caching.",
      );
    });

    it("should handle redis error event", () => {
      const loggerWarnSpy = jest.spyOn((service as any).logger, "warn");
      const redisConstructorMock = Redis as unknown as jest.Mock;
      const mockRedisInstance = redisConstructorMock.mock.results[0].value;

      const errorHandler = mockRedisInstance.on.mock.calls.find(
        (call: any) => call[0] === "error",
      )[1];

      errorHandler(new Error("Test Error"));
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        "Redis Cache Connection Error: Test Error. Bypassing Redis cache.",
      );
    });
  });

  describe("generarReporte", () => {
    it("deberia retornar el reporte desde el cache si está disponible", async () => {
      const cachedReport = {
        id: "123",
        periodo: "2024-Q1",
        tipo: "trimestral",
        totalIngresos: 100,
        totalEgresos: 40,
        balance: 60,
        generadoPor: "user1",
        fechaCreacion: "2024-01-01T00:00:00Z",
        detalles: [],
      };

      mockRedisClient.status = "ready";
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedReport));

      const dto = { periodo: "2024-Q1", tipo: "trimestral" };
      const resultado = await service.generarReporte(dto, "user2");

      expect(resultado.balance).toBe(60);
      expect(resultado.generadoPor).toBe("user1");
      expect(repository.saveAuditLog).toHaveBeenCalledWith({
        ...cachedReport,
        generadoPor: "user2",
      });
      expect(adapter.fetchIngresosPorPeriodo).not.toHaveBeenCalled();
    });

    it("deberia ignorar errores al leer del cache y proceder a buscar datos", async () => {
      mockRedisClient.status = "ready";
      mockRedisClient.get.mockRejectedValue(new Error("Redis Get Error"));

      adapter.fetchIngresosPorPeriodo.mockResolvedValue([
        { monto: 100, tipo: "ingreso", periodo: "2024-Q1", id: "1" },
        { monto: 40, tipo: "egreso", periodo: "2024-Q1", id: "2" },
      ]);

      const dto = { periodo: "2024-Q1", tipo: "trimestral" };
      const resultado = await service.generarReporte(dto, "user1");

      expect(resultado.balance).toBe(60);
      expect(adapter.fetchIngresosPorPeriodo).toHaveBeenCalled();
    });

    it("deberia guardar en cache de manera segura si falla la escritura", async () => {
      mockRedisClient.status = "ready";
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.set.mockRejectedValue(new Error("Redis Set Error"));

      adapter.fetchIngresosPorPeriodo.mockResolvedValue([]);

      const dto = { periodo: "2024-Q2", tipo: "mensual" };
      const resultado = await service.generarReporte(dto, "user2");

      expect(resultado.balance).toBe(0);
      expect(repository.saveAuditLog).toHaveBeenCalled();
    });

    it("deberia proceder normalmente si redisClient no está ready", async () => {
      mockRedisClient.status = "close";

      adapter.fetchIngresosPorPeriodo.mockResolvedValue([
        { monto: 100, tipo: "ingreso", periodo: "2024-Q1", id: "1" },
        { monto: 40, tipo: "egreso", periodo: "2024-Q1", id: "2" },
      ]);

      const dto = { periodo: "2024-Q1", tipo: "trimestral" };
      const resultado = await service.generarReporte(dto, "user1");

      expect(resultado.balance).toBe(60);
    });

    it("deberia ignorar items con tipo desconocido al calcular totales", async () => {
      mockRedisClient.status = "close";
      adapter.fetchIngresosPorPeriodo.mockResolvedValue([
        { monto: 200, tipo: "ingreso", periodo: "2024-Q3", id: "1" },
        { monto: 50, tipo: "otro", periodo: "2024-Q3", id: "2" },
      ]);

      const dto = { periodo: "2024-Q3", tipo: "trimestral" };
      const resultado = await service.generarReporte(dto, "user3");

      expect(resultado.totalIngresos).toBe(200);
      expect(resultado.totalEgresos).toBe(0);
      expect(resultado.balance).toBe(200);
    });

    it("deberia manejar montos con valor no numerico como 0", async () => {
      mockRedisClient.status = "close";
      adapter.fetchIngresosPorPeriodo.mockResolvedValue([
        { monto: null as any, tipo: "ingreso", periodo: "2024-Q4", id: "1" },
        {
          monto: undefined as any,
          tipo: "egreso",
          periodo: "2024-Q4",
          id: "2",
        },
      ]);

      const dto = { periodo: "2024-Q4", tipo: "anual" };
      const resultado = await service.generarReporte(dto, "user4");

      expect(resultado.totalIngresos).toBe(0);
      expect(resultado.totalEgresos).toBe(0);
    });

    it("deberia propagar el error si el adapter falla", async () => {
      mockRedisClient.status = "close";
      adapter.fetchIngresosPorPeriodo.mockRejectedValue(
        new Error("Adapter Error"),
      );

      const dto = { periodo: "2024-Q1", tipo: "trimestral" };
      await expect(service.generarReporte(dto, "user5")).rejects.toThrow(
        "Adapter Error",
      );
    });
  });

  describe("exportarReporteFinanciero", () => {
    const factura = {
      idFactura: "FAC-1",
      nombreCliente: "Cliente Uno",
      tipoServicio: "Consultoría",
      valorServicio: 100,
      impuestosAplicados: 19,
      totalNeto: 119,
      fecha: "2026-01-10T00:00:00.000Z",
    };

    it("bloquea la descarga cuando no existen datos", async () => {
      adapter.fetchFacturasParaExportar.mockResolvedValue([]);

      await expect(
        service.exportarReporteFinanciero({
          formato: "xlsx" as any,
          fechaInicio: "2026-01-01",
          fechaFin: "2026-01-31",
        }),
      ).rejects.toThrow("No hay datos disponibles para exportar");
    });

    it("solicita confirmación cuando hay más de 5.000 registros", async () => {
      adapter.fetchFacturasParaExportar.mockResolvedValue(
        Array.from({ length: 5001 }, (_, index) => ({
          ...factura,
          idFactura: `FAC-${index}`,
        })),
      );

      await expect(
        service.exportarReporteFinanciero({
          formato: "pdf" as any,
          fechaInicio: "2026-01-01",
          fechaFin: "2026-01-31",
        }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          message:
            "La exportación de un volumen alto de datos puede tardar unos segundos, ¿desea continuar?",
          requiereConfirmacion: true,
          totalRegistros: 5001,
        }),
      });
      expect(generarPdfFinanciero).not.toHaveBeenCalled();
    });

    it("genera Excel después de validar datos y rango", async () => {
      adapter.fetchFacturasParaExportar.mockResolvedValue([factura]);

      const archivo = await service.exportarReporteFinanciero({
        formato: "xlsx" as any,
        fechaInicio: "2026-01-01",
        fechaFin: "2026-01-31",
      });

      expect(archivo.contentType).toContain("spreadsheetml");
      expect(archivo.nombreArchivo).toMatch(/\.xlsx$/);
      expect(archivo.totalRegistros).toBe(1);
      expect(generarExcelFinanciero).toHaveBeenCalled();
    });

    it("retorna el mensaje crítico ante falta de memoria", async () => {
      adapter.fetchFacturasParaExportar.mockResolvedValue([factura]);
      (generarPdfFinanciero as jest.Mock).mockRejectedValueOnce(
        new RangeError("Array buffer allocation failed"),
      );

      await expect(
        service.exportarReporteFinanciero({
          formato: "pdf" as any,
          fechaInicio: "2026-01-01",
          fechaFin: "2026-01-31",
        }),
      ).rejects.toThrow(
        "Error crítico: El archivo es demasiado grande para ser procesado, intente filtrar por un rango de fechas menor",
      );
    });
  });

  describe("obtenerMensajeError", () => {
    it("serializa errores no estandar sin usar Object.toString por defecto", () => {
      expect((service as any).obtenerMensajeError("fallo")).toBe("fallo");
      expect((service as any).obtenerMensajeError({ code: "OOM" })).toBe(
        '{"code":"OOM"}',
      );

      const circular: any = { code: "CIRCULAR" };
      circular.self = circular;

      expect((service as any).obtenerMensajeError(circular)).toBe(
        "Unknown error",
      );
    });
  });
});
