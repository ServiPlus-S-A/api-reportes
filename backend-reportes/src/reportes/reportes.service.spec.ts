import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AtencionesAdapter } from "./adapters/atenciones.adapter";
import { ClientesAdapter } from "./adapters/clientes.adapter";
import { ConsultoresAdapter } from "./adapters/consultores.adapter";
import { FinanzasAdapter } from "./adapters/finanzas.adapter";
import { ServiciosAdapter } from "./adapters/servicios.adapter";
import { SolicitudesAdapter } from "./adapters/solicitudes.adapter";
import { FirebaseReporteRepository } from "./repositories/firebase-reporte.repository";
import { ReportesService } from "./reportes.service";

let mockRedisOptions: any;
const mockRedisOn = jest.fn();
const mockRedisConstructor = jest.fn((options) => {
  mockRedisOptions = options;
  return {
    status: "end",
    on: mockRedisOn,
  };
});

jest.mock("ioredis", () => mockRedisConstructor, { virtual: true });

describe("ReportesService", () => {
  let service: ReportesService;
  let finanzasAdapter: { fetchIngresosPorPeriodo: jest.Mock };
  let firebaseRepository: { saveAccessLog: jest.Mock; saveAuditLog: jest.Mock };
  let solicitudesAdapter: {
    obtenerSolicitudPorId: jest.Mock;
    fetchSolicitudesParaPromedio: jest.Mock;
  };
  let clientesAdapter: { obtenerClientePorId: jest.Mock };
  let serviciosAdapter: { obtenerServicioPorId: jest.Mock };
  let consultoresAdapter: { obtenerConsultoresPorSolicitud: jest.Mock };
  let atencionesAdapter: { obtenerAtencionesPorSolicitud: jest.Mock };

  const solicitudCompletada = {
    id: "REQ-12345",
    estado: "completada",
    unidadId: "reportes-centro",
    servicioId: "srv-001",
    clienteId: "cli-001",
    servicioNombre: "Implementacion de mesa de ayuda",
    servicioTipo: "Consultoria",
    clienteNombre: "Industrias Nova SAS",
    gananciaGenerada: 3250000,
    fechaInicio: "2026-05-04T08:00:00Z",
    fechaFin: "2026-05-06T17:30:00Z",
    consultorApertura: { id: "con-001", nombre: "Andrea Salazar" },
    consultorCierre: { id: "con-004", nombre: "Julian Munoz" },
  };

  const solicitudesPromedio = [
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
      fechaCreacion: "2026-01-12T10:00:00.000Z",
      fechaCompletada: null,
    },
  ];

  beforeEach(async () => {
    mockRedisOptions = undefined;
    mockRedisOn.mockClear();
    mockRedisConstructor.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportesService,
        {
          provide: FinanzasAdapter,
          useValue: {
            fetchIngresosPorPeriodo: jest.fn().mockResolvedValue([
              { id: "1", monto: 1000, tipo: "ingreso" },
              { id: "2", monto: 2000, tipo: "ingreso" },
              { id: "3", monto: 500, tipo: "egreso" },
            ]),
          },
        },
        {
          provide: FirebaseReporteRepository,
          useValue: {
            saveAccessLog: jest.fn().mockResolvedValue(undefined),
            saveAuditLog: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: SolicitudesAdapter,
          useValue: {
            obtenerSolicitudPorId: jest
              .fn()
              .mockResolvedValue(solicitudCompletada),
            fetchSolicitudesParaPromedio: jest
              .fn()
              .mockResolvedValue(solicitudesPromedio),
          },
        },
        {
          provide: ClientesAdapter,
          useValue: {
            obtenerClientePorId: jest
              .fn()
              .mockResolvedValue({ nombre: "Industrias Nova SAS" }),
          },
        },
        {
          provide: ServiciosAdapter,
          useValue: {
            obtenerServicioPorId: jest.fn().mockResolvedValue({
              nombre: "Implementacion de mesa de ayuda",
              tipo: "Consultoria",
            }),
          },
        },
        {
          provide: ConsultoresAdapter,
          useValue: {
            obtenerConsultoresPorSolicitud: jest.fn().mockResolvedValue(
              Array.from({ length: 12 }, (_, index) => ({
                id: `con-${index + 1}`,
                nombre: `Consultor ${index + 1}`,
              })),
            ),
          },
        },
        {
          provide: AtencionesAdapter,
          useValue: {
            obtenerAtencionesPorSolicitud: jest.fn().mockResolvedValue(
              Array.from({ length: 30 }, (_, index) => ({
                id: `ate-${String(index + 1).padStart(4, "0")}`,
                solicitudId: "REQ-12345",
                descripcion: "Soporte tecnico",
                lugar: "Oficina Centro",
                fechaHora: new Date(2026, 4, 1 + (index % 30)).toISOString(),
                consultorId: `con-${(index % 12) + 1}`,
                nombreConsultor: `Consultor ${(index % 12) + 1}`,
              })),
            ),
          },
        },
      ],
    }).compile();

    service = module.get<ReportesService>(ReportesService);
    finanzasAdapter = module.get(FinanzasAdapter);
    firebaseRepository = module.get(FirebaseReporteRepository);
    solicitudesAdapter = module.get(SolicitudesAdapter);
    clientesAdapter = module.get(ClientesAdapter);
    serviciosAdapter = module.get(ServiciosAdapter);
    consultoresAdapter = module.get(ConsultoresAdapter);
    atencionesAdapter = module.get(AtencionesAdapter);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("configures Redis cache client defensively", () => {
    expect(mockRedisConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        host: expect.any(String),
        port: expect.any(Number),
        maxRetriesPerRequest: 1,
      }),
    );
    expect(mockRedisOn).toHaveBeenCalledWith("error", expect.any(Function));
    expect(mockRedisOptions.retryStrategy(1)).toBe(500);
    expect(mockRedisOptions.retryStrategy(3)).toBeNull();

    const errorHandler = mockRedisOn.mock.calls.find(
      ([event]) => event === "error",
    )?.[1];
    expect(() => errorHandler(new Error("connection down"))).not.toThrow();
  });

  it("generates a financial report and saves audit log", async () => {
    const result = await service.generarReporte(
      { periodo: "2026-05", tipo: "financiero" },
      "user-1",
    );

    expect(result.totalIngresos).toBe(3000);
    expect(result.totalEgresos).toBe(500);
    expect(result.balance).toBe(2500);
    expect(finanzasAdapter.fetchIngresosPorPeriodo).toHaveBeenCalledWith(
      "2026-05",
    );
    expect(firebaseRepository.saveAuditLog).toHaveBeenCalledWith(result);
  });

  it("returns cached financial report when cache is ready", async () => {
    (service as any).redisClient = {
      status: "ready",
      get: jest.fn().mockResolvedValue(
        JSON.stringify({
          id: "rep-1",
          periodo: "2026-05",
          tipo: "financiero",
          totalIngresos: 100,
          totalEgresos: 25,
          balance: 75,
          generadoPor: "old-user",
          fechaCreacion: "2026-05-01T00:00:00.000Z",
          detalles: [],
        }),
      ),
      set: jest.fn(),
    };

    const result = await service.generarReporte(
      { periodo: "2026-05", tipo: "financiero" },
      "user-2",
    );

    expect(result.balance).toBe(75);
    expect(finanzasAdapter.fetchIngresosPorPeriodo).not.toHaveBeenCalled();
    expect(firebaseRepository.saveAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ generadoPor: "user-2" }),
    );
  });

  it("continues generating report if cache read or write fails", async () => {
    (service as any).redisClient = {
      status: "ready",
      get: jest.fn().mockRejectedValue(new Error("cache read failed")),
      set: jest.fn().mockRejectedValue(new Error("cache write failed")),
    };

    const result = await service.generarReporte(
      { periodo: "2026-05", tipo: "financiero" },
      "user-1",
    );

    expect(result.balance).toBe(2500);
    expect(firebaseRepository.saveAuditLog).toHaveBeenCalledWith(result);
  });

  it("calculates average closing time for completed solicitudes", async () => {
    const result = await service.obtenerTiempoPromedioSolicitudes({
      fechaInicio: "2026-01-01T00:00:00.000Z",
      fechaFin: "2026-01-31T23:59:59.000Z",
      tipoServicio: "Finanzas",
    });

    expect(result.solicitudesProcesadas).toBe(2);
    expect(result.promedio).toBeGreaterThan(0);
    expect(result.historicoUltimos6Meses).toHaveLength(6);
  });

  it("returns zero average when no solicitudes match", async () => {
    const result = await service.obtenerTiempoPromedioSolicitudes({
      fechaInicio: "2026-05-01T00:00:00.000Z",
      fechaFin: "2026-05-31T23:59:59.000Z",
      tipoServicio: "Soporte",
    });

    expect(result.promedio).toBe(0);
    expect(result.solicitudesProcesadas).toBe(0);
    expect(result.mensaje).toBe(
      "Sin datos de cierre para el periodo consultado",
    );
  });

  it("returns paginated detalle and logs allowed access", async () => {
    const result = await service.obtenerDetalleSolicitudCompletada(
      "REQ-12345",
      {
        sub: "coord-1",
        role: "coordinador",
        unidadIds: ["reportes-centro"],
      },
      "127.0.0.1",
      2,
      10,
    );

    expect(result.id).toBe("REQ-12345");
    expect(result.gananciaGenerada).toBe("$3,250,000.00");
    expect(result.fechaInicio).toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/);
    expect(result.consultoresIntervinientes).toHaveLength(2);
    expect(result.metadata.pagination.total).toBe(12);
    expect(firebaseRepository.saveAccessLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "VIEW_SOLICITUD_DETALLE",
        allowed: true,
        timestamp: expect.stringMatching(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/,
        ),
      }),
    );
    expect(
      consultoresAdapter.obtenerConsultoresPorSolicitud,
    ).toHaveBeenCalled();
  });

  it("returns partial detalle with warnings when enrichments fail", async () => {
    clientesAdapter.obtenerClientePorId.mockRejectedValueOnce(new Error("x"));
    serviciosAdapter.obtenerServicioPorId.mockRejectedValueOnce(new Error("x"));

    const result = await service.obtenerDetalleSolicitudCompletada(
      "REQ-12345",
      {
        sub: "coord-1",
        role: "coordinador",
        unidadIds: ["reportes-centro"],
      },
      "127.0.0.1",
    );

    expect(result.metadata.warnings).toContain(
      "Advertencia: Algunos datos del cliente o servicio no pudieron ser recuperados desde el servidor central",
    );
    expect(result.cliente).toBe("Industrias Nova SAS");
  });

  it("adds warning when only service enrichment fails", async () => {
    serviciosAdapter.obtenerServicioPorId.mockRejectedValueOnce(new Error("x"));

    const result = await service.obtenerDetalleSolicitudCompletada(
      "REQ-12345",
      {
        sub: "coord-1",
        role: "coordinador",
        unidadIds: ["reportes-centro"],
      },
      "127.0.0.1",
    );

    expect(result.metadata.warnings).toContain(
      "Advertencia: Algunos datos del cliente o servicio no pudieron ser recuperados desde el servidor central",
    );
  });

  it("normalizes empty monetary and invalid date fields", async () => {
    solicitudesAdapter.obtenerSolicitudPorId.mockResolvedValueOnce({
      ...solicitudCompletada,
      gananciaGenerada: null,
      fechaInicio: null,
      fechaFin: "not-a-date",
      consultorApertura: null,
      consultorCierre: { id: "con-2", nombre: "" },
    });

    const result = await service.obtenerDetalleSolicitudCompletada(
      "REQ-12345",
      {
        sub: "coord-1",
        role: "coordinador",
        unidadIds: ["reportes-centro"],
      },
      "127.0.0.1",
    );

    expect(result.gananciaGenerada).toBe("$0.00");
    expect(result.fechaInicio).toBe("N/A");
    expect(result.fechaFin).toBe("N/A");
    expect(result.consultorApertura).toEqual({ id: "N/A", nombre: "N/A" });
    expect(result.consultorCierre).toEqual({ id: "con-2", nombre: "N/A" });
  });

  it("throws forbidden when unidad is not allowed", async () => {
    await expect(
      service.obtenerDetalleSolicitudCompletada(
        "REQ-12345",
        {
          sub: "coord-2",
          role: "coordinador",
          unidadIds: ["reportes-sur"],
        },
        "127.0.0.1",
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("throws bad request when solicitud is not completed", async () => {
    solicitudesAdapter.obtenerSolicitudPorId.mockResolvedValueOnce({
      ...solicitudCompletada,
      estado: "pendiente",
    });

    await expect(
      service.obtenerDetalleSolicitudCompletada(
        "REQ-55555",
        {
          sub: "coord-1",
          role: "coordinador",
          unidadIds: ["reportes-centro"],
        },
        "127.0.0.1",
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("throws not found when solicitud does not exist", async () => {
    solicitudesAdapter.obtenerSolicitudPorId.mockResolvedValueOnce(null);

    await expect(
      service.obtenerDetalleSolicitudCompletada(
        "REQ-00000",
        {
          sub: "coord-1",
          role: "coordinador",
          unidadIds: ["reportes-centro"],
        },
        "127.0.0.1",
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("returns paginated atenciones", async () => {
    const result = await service.obtenerAtencionesAnidadas(
      "REQ-12345",
      {
        sub: "coord-1",
        role: "coordinador",
        unidadIds: ["reportes-centro"],
      },
      "127.0.0.1",
      1,
      25,
    );

    expect(result.solicitudId).toBe("REQ-12345");
    expect(result.atenciones).toHaveLength(25);
    expect(result.pagination.total).toBe(30);
    expect(firebaseRepository.saveAccessLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "VIEW_ATENCIONES",
        allowed: true,
      }),
    );
  });

  it("adds warnings when atenciones cannot be loaded", async () => {
    atencionesAdapter.obtenerAtencionesPorSolicitud.mockRejectedValueOnce(
      new Error("ADAPTER_ERROR"),
    );

    const result = await service.obtenerAtencionesAnidadas(
      "REQ-12345",
      {
        sub: "coord-1",
        role: "coordinador",
        unidadIds: ["reportes-centro"],
      },
      "127.0.0.1",
    );

    expect(result.warnings).toContain(
      "Error de conexión temporal: No se pudieron cargar las atenciones asociadas",
    );
  });

  it("adds empty-state warning when solicitud has no atenciones", async () => {
    atencionesAdapter.obtenerAtencionesPorSolicitud.mockResolvedValueOnce([]);

    const result = await service.obtenerAtencionesAnidadas(
      "REQ-12345",
      {
        sub: "coord-1",
        role: "coordinador",
        unidadIds: ["reportes-centro"],
      },
      "127.0.0.1",
    );

    expect(result.atenciones).toHaveLength(0);
    expect(result.warnings).toContain(
      "No existen atenciones asociadas a esta solicitud",
    );
  });

  it("throws forbidden when atenciones unidad is not allowed", async () => {
    await expect(
      service.obtenerAtencionesAnidadas(
        "REQ-12345",
        {
          sub: "coord-2",
          role: "coordinador",
          unidadIds: ["reportes-sur"],
        },
        "127.0.0.1",
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("throws bad request when atenciones solicitud is not completed", async () => {
    solicitudesAdapter.obtenerSolicitudPorId.mockResolvedValueOnce({
      ...solicitudCompletada,
      estado: "pendiente",
    });

    await expect(
      service.obtenerAtencionesAnidadas(
        "REQ-12345",
        {
          sub: "coord-1",
          role: "coordinador",
          unidadIds: ["reportes-centro"],
        },
        "127.0.0.1",
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("throws not found when atenciones solicitud does not exist", async () => {
    solicitudesAdapter.obtenerSolicitudPorId.mockResolvedValueOnce(null);

    await expect(
      service.obtenerAtencionesAnidadas(
        "REQ-00000",
        {
          sub: "coord-1",
          role: "coordinador",
          unidadIds: ["reportes-centro"],
        },
        "127.0.0.1",
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("exports PDF successfully and logs access", async () => {
    const buffer = await service.exportarAtenciones(
      "REQ-12345",
      "pdf",
      {
        sub: "coord-1",
        role: "coordinador",
        unidadIds: ["reportes-centro"],
      },
      "127.0.0.1",
    );

    expect(buffer).toBeInstanceOf(Buffer);
    expect(firebaseRepository.saveAccessLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "EXPORT_ATENCIONES_PDF",
        allowed: true,
      }),
    );
  });

  it("exports Excel successfully and logs access", async () => {
    const buffer = await service.exportarAtenciones(
      "REQ-12345",
      "excel",
      {
        sub: "coord-1",
        role: "coordinador",
        unidadIds: ["reportes-centro"],
      },
      "127.0.0.1",
    );

    expect(buffer).toBeInstanceOf(Buffer);
    expect(firebaseRepository.saveAccessLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "EXPORT_ATENCIONES_EXCEL",
        allowed: true,
      }),
    );
  });

  it("throws internal error when atenciones export source fails", async () => {
    atencionesAdapter.obtenerAtencionesPorSolicitud.mockRejectedValueOnce(
      new Error("source failed"),
    );

    await expect(
      service.exportarAtenciones(
        "REQ-12345",
        "excel",
        {
          sub: "coord-1",
          role: "coordinador",
          unidadIds: ["reportes-centro"],
        },
        "127.0.0.1",
      ),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it("wraps unexpected export generation errors", async () => {
    firebaseRepository.saveAccessLog.mockRejectedValueOnce(
      new Error("audit failed"),
    );

    await expect(
      service.exportarAtenciones(
        "REQ-12345",
        "excel",
        {
          sub: "coord-1",
          role: "coordinador",
          unidadIds: ["reportes-centro"],
        },
        "127.0.0.1",
      ),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it("rethrows internal export generation errors", async () => {
    firebaseRepository.saveAccessLog.mockRejectedValueOnce(
      new InternalServerErrorException("timeout"),
    );

    await expect(
      service.exportarAtenciones(
        "REQ-12345",
        "excel",
        {
          sub: "coord-1",
          role: "coordinador",
          unidadIds: ["reportes-centro"],
        },
        "127.0.0.1",
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        message: "timeout",
      }),
    });
  });

  it("throws forbidden when exporting atenciones from another unidad", async () => {
    await expect(
      service.exportarAtenciones(
        "REQ-12345",
        "pdf",
        {
          sub: "coord-2",
          role: "coordinador",
          unidadIds: ["reportes-sur"],
        },
        "127.0.0.1",
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("throws bad request if PDF export has more than 500 records", async () => {
    atencionesAdapter.obtenerAtencionesPorSolicitud.mockResolvedValueOnce(
      Array.from({ length: 501 }, (_, index) => ({
        id: `ate-${index}`,
        solicitudId: "REQ-12345",
        descripcion: "Test",
        lugar: "Office",
        fechaHora: new Date().toISOString(),
        consultorId: "con-1",
        nombreConsultor: "Test Consultor",
      })),
    );

    await expect(
      service.exportarAtenciones(
        "REQ-12345",
        "pdf",
        {
          sub: "coord-1",
          role: "coordinador",
          unidadIds: ["reportes-centro"],
        },
        "127.0.0.1",
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
