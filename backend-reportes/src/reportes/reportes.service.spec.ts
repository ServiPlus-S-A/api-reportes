import { BadRequestException, ForbiddenException, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ClientesAdapter } from "./adapters/clientes.adapter";
import { ConsultoresAdapter } from "./adapters/consultores.adapter";
import { ServiciosAdapter } from "./adapters/servicios.adapter";
import { SolicitudesAdapter } from "./adapters/solicitudes.adapter";
import { AtencionesAdapter } from "./adapters/atenciones.adapter";
import { FirebaseReporteRepository } from "./repositories/firebase-reporte.repository";
import { ReportesService } from "./reportes.service";

describe("ReportesService", () => {
  let service: ReportesService;
  let firebaseRepository: { saveAccessLog: jest.Mock };
  let solicitudesAdapter: { obtenerSolicitudPorId: jest.Mock };
  let clientesAdapter: { obtenerClientePorId: jest.Mock };
  let serviciosAdapter: { obtenerServicioPorId: jest.Mock };
  let consultoresAdapter: { obtenerConsultoresPorSolicitud: jest.Mock };
  let atencionesAdapter: { obtenerAtencionesPorSolicitud: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportesService,
        {
          provide: FirebaseReporteRepository,
          useValue: {
            saveAccessLog: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: SolicitudesAdapter,
          useValue: {
            obtenerSolicitudPorId: jest.fn().mockResolvedValue({
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
              consultorApertura: {
                id: "con-001",
                nombre: "Andrea Salazar",
              },
              consultorCierre: {
                id: "con-004",
                nombre: "Julian Muñoz",
              },
            }),
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
              Array.from({ length: 145 }, (_, index) => ({
                id: `ate-${String(index + 1).padStart(4, "0")}`,
                solicitudId: "REQ-12345",
                descripcion:
                  index % 3 === 0
                    ? "Implementación de módulo de gestión de inventario"
                    : "Soporte técnico",
                lugar: "Oficina Centro, Bogotá",
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
    expect(result.consultoresIntervinientes).toHaveLength(2);
    expect(result.metadata.pagination.total).toBe(12);
    expect(result.metadata.pagination.totalPages).toBe(2);
    expect(firebaseRepository.saveAccessLog).toHaveBeenCalledWith(
      expect.objectContaining({
        solicitudId: "REQ-12345",
        userId: "coord-1",
        ip: "127.0.0.1",
        allowed: true,
      }),
    );
    expect(consultoresAdapter.obtenerConsultoresPorSolicitud).toHaveBeenCalled();
  });

  it("returns partial data with warnings when enrichments fail", async () => {
    clientesAdapter.obtenerClientePorId.mockRejectedValueOnce(
      new Error("CLIENT_SERVICE_UNAVAILABLE"),
    );
    serviciosAdapter.obtenerServicioPorId.mockRejectedValueOnce(
      new Error("SERVICE_CATALOG_UNAVAILABLE"),
    );

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
    expect(result.servicio.nombre).toBe("Implementacion de mesa de ayuda");
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

    expect(firebaseRepository.saveAccessLog).toHaveBeenCalledWith(
      expect.objectContaining({
        allowed: false,
        solicitudId: "REQ-12345",
        userId: "coord-2",
      }),
    );
  });

  it("throws bad request when solicitud is not completed", async () => {
    solicitudesAdapter.obtenerSolicitudPorId.mockResolvedValueOnce({
      id: "REQ-55555",
      estado: "pendiente",
      unidadId: "reportes-centro",
      servicioId: "srv-001",
      clienteId: "cli-001",
      servicioNombre: "Servicio temporal",
      servicioTipo: "Consultoria",
      clienteNombre: "Cliente temporal",
      gananciaGenerada: 1000,
      fechaInicio: "2026-05-04T08:00:00Z",
      fechaFin: null,
      consultorApertura: null,
      consultorCierre: null,
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
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        message: "Solo se permite consultar solicitudes completadas.",
      }),
    });
  });

  it("normalizes null consultores and empty dates", async () => {
    solicitudesAdapter.obtenerSolicitudPorId.mockResolvedValueOnce({
      id: "REQ-54321",
      estado: "completada",
      unidadId: "reportes-centro",
      servicioId: "srv-missing",
      clienteId: "cli-missing",
      servicioNombre: null,
      servicioTipo: null,
      clienteNombre: null,
      gananciaGenerada: null,
      fechaInicio: null,
      fechaFin: null,
      consultorApertura: null,
      consultorCierre: null,
    });
    consultoresAdapter.obtenerConsultoresPorSolicitud.mockResolvedValueOnce([]);
    clientesAdapter.obtenerClientePorId.mockRejectedValueOnce(new Error("x"));
    serviciosAdapter.obtenerServicioPorId.mockRejectedValueOnce(new Error("x"));

    const result = await service.obtenerDetalleSolicitudCompletada(
      "REQ-54321",
      {
        sub: "coord-1",
        role: "coordinador",
        unidadIds: ["reportes-centro"],
      },
      "127.0.0.1",
    );

    expect(result.fechaInicio).toBe("N/A");
    expect(result.consultorApertura).toEqual({ id: "N/A", nombre: "N/A" });
    expect(result.gananciaGenerada).toBe(0);
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

  describe("obtenerAtencionesAnidadas", () => {
    it("should return paginated atenciones", async () => {
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
      expect(result.pagination.total).toBe(145);
      expect(result.pagination.totalPages).toBe(6);
      expect(result.pagination.page).toBe(1);
    });

    it("should paginate correctly on second page", async () => {
      const result = await service.obtenerAtencionesAnidadas(
        "REQ-12345",
        {
          sub: "coord-1",
          role: "coordinador",
          unidadIds: ["reportes-centro"],
        },
        "127.0.0.1",
        2,
        25,
      );

      expect(result.atenciones).toHaveLength(25);
      expect(result.pagination.page).toBe(2);
    });

    it("should truncate descriptions to 150 characters", async () => {
      const result = await service.obtenerAtencionesAnidadas(
        "REQ-12345",
        {
          sub: "coord-1",
          role: "coordinador",
          unidadIds: ["reportes-centro"],
        },
        "127.0.0.1",
      );

      result.atenciones.forEach((atencion) => {
        if (atencion.descripcion !== "N/A") {
          expect(atencion.descripcion.length).toBeLessThanOrEqual(153);
        }
      });
    });

    it("should format dates correctly", async () => {
      const result = await service.obtenerAtencionesAnidadas(
        "REQ-12345",
        {
          sub: "coord-1",
          role: "coordinador",
          unidadIds: ["reportes-centro"],
        },
        "127.0.0.1",
      );

      result.atenciones.forEach((atencion) => {
        if (atencion.fecha !== "N/A") {
          expect(atencion.fecha).toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}/);
        }
      });
    });

    it("should log access with VIEW_ATENCIONES action", async () => {
      await service.obtenerAtencionesAnidadas(
        "REQ-12345",
        {
          sub: "coord-1",
          role: "coordinador",
          unidadIds: ["reportes-centro"],
        },
        "127.0.0.1",
      );

      expect(firebaseRepository.saveAccessLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "VIEW_ATENCIONES",
          allowed: true,
          solicitudId: "REQ-12345",
        }),
      );
    });

    it("should throw forbidden when unidad is not allowed", async () => {
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

      expect(firebaseRepository.saveAccessLog).toHaveBeenCalledWith(
        expect.objectContaining({
          allowed: false,
          action: "VIEW_ATENCIONES",
        }),
      );
    });

    it("should handle empty atenciones list with warning", async () => {
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
        "No se encontraron registros de atención para esta solicitud",
      );
    });

    it("should add warning if adapter fails", async () => {
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
        "Advertencia: No se pudieron cargar las atenciones asociadas",
      );
    });
  });

  describe("exportarAtenciones", () => {
    it("should export PDF successfully", async () => {
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
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("should export Excel successfully", async () => {
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
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("should throw bad request if PDF with >500 records", async () => {
      atencionesAdapter.obtenerAtencionesPorSolicitud.mockResolvedValueOnce(
        Array.from({ length: 501 }, (_, i) => ({
          id: `ate-${i}`,
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

    it("should allow Excel export with >500 records", async () => {
      atencionesAdapter.obtenerAtencionesPorSolicitud.mockResolvedValueOnce(
        Array.from({ length: 501 }, (_, i) => ({
          id: `ate-${i}`,
          solicitudId: "REQ-12345",
          descripcion: "Test",
          lugar: "Office",
          fechaHora: new Date().toISOString(),
          consultorId: "con-1",
          nombreConsultor: "Test Consultor",
        })),
      );

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
    });

    it("should log PDF export with EXPORT_ATENCIONES_PDF action", async () => {
      await service.exportarAtenciones(
        "REQ-12345",
        "pdf",
        {
          sub: "coord-1",
          role: "coordinador",
          unidadIds: ["reportes-centro"],
        },
        "127.0.0.1",
      );

      expect(firebaseRepository.saveAccessLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "EXPORT_ATENCIONES_PDF",
          allowed: true,
        }),
      );
    });

    it("should log Excel export with EXPORT_ATENCIONES_EXCEL action", async () => {
      await service.exportarAtenciones(
        "REQ-12345",
        "excel",
        {
          sub: "coord-1",
          role: "coordinador",
          unidadIds: ["reportes-centro"],
        },
        "127.0.0.1",
      );

      expect(firebaseRepository.saveAccessLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "EXPORT_ATENCIONES_EXCEL",
          allowed: true,
        }),
      );
    });

    it("should throw forbidden when unidad not allowed", async () => {
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

    it("should throw not found when solicitud does not exist", async () => {
      solicitudesAdapter.obtenerSolicitudPorId.mockResolvedValueOnce(null);

      await expect(
        service.exportarAtenciones(
          "REQ-00000",
          "pdf",
          {
            sub: "coord-1",
            role: "coordinador",
            unidadIds: ["reportes-centro"],
          },
          "127.0.0.1",
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
