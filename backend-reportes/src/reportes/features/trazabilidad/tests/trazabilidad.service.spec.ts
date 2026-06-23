import { Test, TestingModule } from "@nestjs/testing";
import { TrazabilidadService } from "../trazabilidad.service";
import { SolicitudesAdapter } from "../../../integraciones/solicitudes/solicitudes.adapter";
import { ClientesAdapter } from "../../../integraciones/parametrizacion/clientes.adapter";
import { ServiciosAdapter } from "../../../integraciones/parametrizacion/servicios.adapter";
import { ConsultoresAdapter } from "../../../integraciones/parametrizacion/consultores.adapter";
import { AtencionesAdapter } from "../../../integraciones/atenciones/atenciones.adapter";
import { FirebaseReporteRepository } from "../../../shared/repositories/firebase-reporte.repository";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";

const USER_WITH_ACCESS = {
  sub: "usr1",
  role: "coordinador",
  unidadIds: ["U1"],
} as any;
const USER_NO_ACCESS = {
  sub: "usr2",
  role: "coordinador",
  unidadIds: ["U99"],
} as any;
const BASE_SOLICITUD = {
  id: "REQ-3",
  estado: "completada",
  unidadId: "U1",
  gananciaGenerada: 500,
  fechaInicio: "2024-01-01",
} as any;

describe("TrazabilidadService", () => {
  let service: TrazabilidadService;
  let solicitudesAdapter: jest.Mocked<SolicitudesAdapter>;
  let clientesAdapter: jest.Mocked<ClientesAdapter>;
  let serviciosAdapter: jest.Mocked<ServiciosAdapter>;
  let consultoresAdapter: jest.Mocked<ConsultoresAdapter>;
  let atencionesAdapter: jest.Mocked<AtencionesAdapter>;
  let repository: jest.Mocked<FirebaseReporteRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrazabilidadService,
        {
          provide: SolicitudesAdapter,
          useValue: {
            obtenerSolicitudPorId: jest.fn(),
            obtenerSolicitudesEnEjecucion: jest.fn(),
          },
        },
        {
          provide: ClientesAdapter,
          useValue: { obtenerClientePorId: jest.fn() },
        },
        {
          provide: ServiciosAdapter,
          useValue: { obtenerServicioPorId: jest.fn() },
        },
        {
          provide: ConsultoresAdapter,
          useValue: {
            obtenerConsultoresPorSolicitud: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: AtencionesAdapter,
          useValue: { obtenerAtencionesPorSolicitud: jest.fn() },
        },
        {
          provide: FirebaseReporteRepository,
          useValue: { saveAccessLog: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<TrazabilidadService>(TrazabilidadService);
    solicitudesAdapter = module.get(SolicitudesAdapter);
    clientesAdapter = module.get(ClientesAdapter);
    serviciosAdapter = module.get(ServiciosAdapter);
    consultoresAdapter = module.get(ConsultoresAdapter);
    atencionesAdapter = module.get(AtencionesAdapter);
    repository = module.get(FirebaseReporteRepository);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ─── obtenerDetalleSolicitudCompletada ───────────────────────────────────────

  describe("obtenerDetalleSolicitudCompletada", () => {
    it("debe propagar NotFoundException si la solicitud no existe", async () => {
      solicitudesAdapter.obtenerSolicitudPorId.mockResolvedValue(null);

      await expect(
        service.obtenerDetalleSolicitudCompletada(
          "REQ-1",
          USER_WITH_ACCESS,
          "0.0.0.0",
        ),
      ).rejects.toThrow(NotFoundException);

      expect(repository.saveAccessLog).toHaveBeenCalledWith(
        expect.objectContaining({ allowed: false }),
      );
    });

    it("debe propagar BadRequestException si la solicitud no está completada", async () => {
      solicitudesAdapter.obtenerSolicitudPorId.mockResolvedValue({
        estado: "en_curso",
      } as any);

      await expect(
        service.obtenerDetalleSolicitudCompletada(
          "REQ-2",
          USER_WITH_ACCESS,
          "0.0.0.0",
        ),
      ).rejects.toThrow(BadRequestException);

      expect(repository.saveAccessLog).toHaveBeenCalledWith(
        expect.objectContaining({ allowed: false }),
      );
    });

    it("debe propagar ForbiddenException si el usuario no tiene acceso a la unidad", async () => {
      solicitudesAdapter.obtenerSolicitudPorId.mockResolvedValue(
        BASE_SOLICITUD,
      );

      await expect(
        service.obtenerDetalleSolicitudCompletada(
          "REQ-3",
          USER_NO_ACCESS,
          "0.0.0.0",
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(repository.saveAccessLog).toHaveBeenCalledWith(
        expect.objectContaining({ allowed: false }),
      );
    });

    it("debe retornar correctamente los detalles si cumple las condiciones", async () => {
      solicitudesAdapter.obtenerSolicitudPorId.mockResolvedValue(
        BASE_SOLICITUD,
      );
      clientesAdapter.obtenerClientePorId.mockResolvedValue({
        nombre: "Cliente Test",
      });
      serviciosAdapter.obtenerServicioPorId.mockResolvedValue({
        nombre: "Servicio Test",
        tipo: "Consultoria",
      });
      consultoresAdapter.obtenerConsultoresPorSolicitud.mockResolvedValue([]);

      const res = await service.obtenerDetalleSolicitudCompletada(
        "REQ-3",
        USER_WITH_ACCESS,
        "0.0.0.0",
      );

      expect(res.id).toBe("REQ-3");
      expect(res.gananciaGenerada).toBe("$500.00");
      expect(res.cliente).toBe("Cliente Test");
      expect(res.servicio.nombre).toBe("Servicio Test");
      expect(repository.saveAccessLog).toHaveBeenCalledWith(
        expect.objectContaining({ allowed: true }),
      );
    });

    it("debe retornar N/A cuando el cliente y servicio no se pueden cargar", async () => {
      solicitudesAdapter.obtenerSolicitudPorId.mockResolvedValue(
        BASE_SOLICITUD,
      );
      clientesAdapter.obtenerClientePorId.mockRejectedValue(
        new Error("CLIENT_SERVICE_UNAVAILABLE"),
      );
      serviciosAdapter.obtenerServicioPorId.mockRejectedValue(
        new Error("SERVICE_CATALOG_UNAVAILABLE"),
      );
      consultoresAdapter.obtenerConsultoresPorSolicitud.mockResolvedValue([]);

      const res = await service.obtenerDetalleSolicitudCompletada(
        "REQ-3",
        USER_WITH_ACCESS,
        "0.0.0.0",
      );

      expect(res.cliente).toBe("N/A");
      expect(res.servicio.nombre).toBe("N/A");
      expect(res.metadata.warnings.length).toBeGreaterThan(0);
    });

    it("debe retornar N/A y agregar warning si solo servicio falla", async () => {
      solicitudesAdapter.obtenerSolicitudPorId.mockResolvedValue(
        BASE_SOLICITUD,
      );
      clientesAdapter.obtenerClientePorId.mockResolvedValue({
        nombre: "Cliente Test",
      });
      serviciosAdapter.obtenerServicioPorId.mockRejectedValue(
        new Error("SERVICE_CATALOG_UNAVAILABLE"),
      );
      consultoresAdapter.obtenerConsultoresPorSolicitud.mockResolvedValue([]);

      const res = await service.obtenerDetalleSolicitudCompletada(
        "REQ-3",
        USER_WITH_ACCESS,
        "0.0.0.0",
      );

      expect(res.cliente).toBe("Cliente Test");
      expect(res.servicio.nombre).toBe("N/A");
      expect(res.metadata.warnings).toContain(
        "Advertencia: Algunos datos del cliente o servicio no pudieron ser recuperados desde el servidor central",
      );
    });

    it("debe paginar los consultores correctamente", async () => {
      const consultoresMock = Array.from({ length: 15 }, (_, i) => ({
        id: `con-${i}`,
        nombre: `Consultor ${i}`,
      }));
      solicitudesAdapter.obtenerSolicitudPorId.mockResolvedValue(
        BASE_SOLICITUD,
      );
      clientesAdapter.obtenerClientePorId.mockResolvedValue({
        nombre: "Cliente",
      });
      serviciosAdapter.obtenerServicioPorId.mockResolvedValue({
        nombre: "Srv",
        tipo: "X",
      });
      consultoresAdapter.obtenerConsultoresPorSolicitud.mockResolvedValue(
        consultoresMock,
      );

      const res = await service.obtenerDetalleSolicitudCompletada(
        "REQ-3",
        USER_WITH_ACCESS,
        "0.0.0.0",
        1,
        5,
      );

      expect(res.consultoresIntervinientes).toHaveLength(5);
      expect(res.metadata.pagination.total).toBe(15);
      expect(res.metadata.pagination.totalPages).toBe(3);
    });
  });

  // ─── obtenerAtencionesAnidadas ───────────────────────────────────────────────

  describe("obtenerAtencionesAnidadas", () => {
    it("debe propagar NotFoundException si la solicitud no existe", async () => {
      solicitudesAdapter.obtenerSolicitudPorId.mockResolvedValue(null);

      await expect(
        service.obtenerAtencionesAnidadas("REQ-X", USER_WITH_ACCESS, "0.0.0.0"),
      ).rejects.toThrow(NotFoundException);
    });

    it("debe propagar BadRequestException si la solicitud no está completada", async () => {
      solicitudesAdapter.obtenerSolicitudPorId.mockResolvedValue({
        estado: "pendiente",
        unidadId: "U1",
      } as any);

      await expect(
        service.obtenerAtencionesAnidadas("REQ-X", USER_WITH_ACCESS, "0.0.0.0"),
      ).rejects.toThrow(BadRequestException);
    });

    it("debe propagar ForbiddenException si el usuario no tiene acceso", async () => {
      solicitudesAdapter.obtenerSolicitudPorId.mockResolvedValue({
        estado: "completada",
        unidadId: "U1",
      } as any);

      await expect(
        service.obtenerAtencionesAnidadas("REQ-X", USER_NO_ACCESS, "0.0.0.0"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("debe retornar atenciones normalizadas exitosamente", async () => {
      solicitudesAdapter.obtenerSolicitudPorId.mockResolvedValue({
        ...BASE_SOLICITUD,
      });
      atencionesAdapter.obtenerAtencionesPorSolicitud.mockResolvedValue([
        {
          id: "at-1",
          solicitudId: "REQ-3",
          descripcion: "Descripcion de prueba",
          lugar: "Oficina",
          fechaHora: "2024-03-01T10:00:00Z",
          consultorId: "con-1",
          nombreConsultor: "Juan Perez",
        },
      ]);

      const res = await service.obtenerAtencionesAnidadas(
        "REQ-3",
        USER_WITH_ACCESS,
        "0.0.0.0",
      );

      expect(res.solicitudId).toBe("REQ-3");
      expect(res.atenciones).toHaveLength(1);
      expect(res.atenciones[0].id).toBe("at-1");
    });

    it("debe agregar warning cuando falla la carga de atenciones", async () => {
      solicitudesAdapter.obtenerSolicitudPorId.mockResolvedValue({
        ...BASE_SOLICITUD,
      });
      atencionesAdapter.obtenerAtencionesPorSolicitud.mockRejectedValue(
        new Error("connection error"),
      );

      const res = await service.obtenerAtencionesAnidadas(
        "REQ-3",
        USER_WITH_ACCESS,
        "0.0.0.0",
      );

      expect(res.atenciones).toHaveLength(0);
      expect(res.warnings.length).toBeGreaterThan(0);
    });

    it("debe agregar warning cuando la solicitud no tiene atenciones", async () => {
      solicitudesAdapter.obtenerSolicitudPorId.mockResolvedValue({
        ...BASE_SOLICITUD,
      });
      atencionesAdapter.obtenerAtencionesPorSolicitud.mockResolvedValue([]);

      const res = await service.obtenerAtencionesAnidadas(
        "REQ-3",
        USER_WITH_ACCESS,
        "0.0.0.0",
      );

      expect(res.warnings).toContain(
        "No existen atenciones asociadas a esta solicitud",
      );
    });
  });

  // ─── exportarAtenciones ──────────────────────────────────────────────────────

  describe("exportarAtenciones", () => {
    it("debe exportar como excel correctamente", async () => {
      solicitudesAdapter.obtenerSolicitudPorId.mockResolvedValue({
        ...BASE_SOLICITUD,
      });
      atencionesAdapter.obtenerAtencionesPorSolicitud.mockResolvedValue([
        {
          id: "at-1",
          solicitudId: "REQ-3",
          descripcion: "Descripcion",
          lugar: "Oficina",
          fechaHora: "2024-03-01T10:00:00Z",
          consultorId: "con-1",
          nombreConsultor: "Juan Perez",
        },
      ]);

      const buffer = await service.exportarAtenciones(
        "REQ-3",
        "excel",
        USER_WITH_ACCESS,
        "0.0.0.0",
      );

      expect(buffer).toBeDefined();
      expect(repository.saveAccessLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "EXPORT_ATENCIONES_EXCEL",
          allowed: true,
        }),
      );
    });

    it("debe exportar como pdf correctamente", async () => {
      solicitudesAdapter.obtenerSolicitudPorId.mockResolvedValue({
        ...BASE_SOLICITUD,
      });
      atencionesAdapter.obtenerAtencionesPorSolicitud.mockResolvedValue([
        {
          id: "at-1",
          solicitudId: "REQ-3",
          descripcion: "Descripcion",
          lugar: "Oficina",
          fechaHora: "2024-03-01T10:00:00Z",
          consultorId: "con-1",
          nombreConsultor: "Juan Perez",
        },
      ]);

      const buffer = await service.exportarAtenciones(
        "REQ-3",
        "pdf",
        USER_WITH_ACCESS,
        "0.0.0.0",
      );

      expect(buffer).toBeDefined();
      expect(repository.saveAccessLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "EXPORT_ATENCIONES_PDF",
          allowed: true,
        }),
      );
    });

    it("debe propagar BadRequestException si se exportan mas de 500 registros en pdf", async () => {
      solicitudesAdapter.obtenerSolicitudPorId.mockResolvedValue({
        ...BASE_SOLICITUD,
      });
      const atencionesMax = Array.from({ length: 501 }, (_, i) => ({
        id: `at-${i}`,
        solicitudId: "REQ-3",
        descripcion: "Descripcion",
        lugar: "Oficina",
        fechaHora: "2024-03-01T10:00:00Z",
        consultorId: "con-1",
        nombreConsultor: "Juan Perez",
      }));
      atencionesAdapter.obtenerAtencionesPorSolicitud.mockResolvedValue(
        atencionesMax,
      );

      await expect(
        service.exportarAtenciones("REQ-3", "pdf", USER_WITH_ACCESS, "0.0.0.0"),
      ).rejects.toThrow(BadRequestException);
    });

    it("debe propagar InternalServerErrorException si getAtencionesPorSolicitud falla", async () => {
      solicitudesAdapter.obtenerSolicitudPorId.mockResolvedValue({
        ...BASE_SOLICITUD,
      });
      atencionesAdapter.obtenerAtencionesPorSolicitud.mockRejectedValue(
        new Error("Network Error"),
      );

      await expect(
        service.exportarAtenciones("REQ-3", "pdf", USER_WITH_ACCESS, "0.0.0.0"),
      ).rejects.toThrow("Error al recuperar las atenciones para exportar");
    });
  });

  // ─── obtenerSolicitudesEnEjecucion ──────────────────────────────────────────

  describe("obtenerSolicitudesEnEjecucion", () => {
    it("debe retornar correctamente las solicitudes y guardar log", async () => {
      solicitudesAdapter.obtenerSolicitudesEnEjecucion.mockResolvedValue([
        {
          id: "1",
          estado: "En Proceso",
          clienteNombre: "C1",
          servicioNombre: "S1",
          prioridad: "Alta",
          tecnicoId: "T1",
          tecnicoNombre: "N1",
          fechaInicioEjecucion: new Date().toISOString(),
          porcentajeAvance: 50,
        },
      ]);

      const res = await service.obtenerSolicitudesEnEjecucion(
        {},
        USER_WITH_ACCESS,
        "127.0.0.1",
      );

      expect(res.solicitudes).toHaveLength(1);
      expect(res.total).toBe(1);
      expect(repository.saveAccessLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: "VIEW_SOLICITUDES_EJECUCION" }),
      );
    });

    it("debe filtrar por tecnicoId", async () => {
      solicitudesAdapter.obtenerSolicitudesEnEjecucion.mockResolvedValue([
        {
          id: "1",
          estado: "En Proceso",
          prioridad: "Alta",
          tecnicoId: "T1",
          fechaInicioEjecucion: new Date().toISOString(),
          porcentajeAvance: 50,
          clienteNombre: null,
          servicioNombre: null,
          tecnicoNombre: null,
        },
        {
          id: "2",
          estado: "En Ejecución",
          prioridad: "Baja",
          tecnicoId: "T2",
          fechaInicioEjecucion: new Date().toISOString(),
          porcentajeAvance: 10,
          clienteNombre: null,
          servicioNombre: null,
          tecnicoNombre: null,
        },
      ]);

      const res = await service.obtenerSolicitudesEnEjecucion(
        { tecnicoId: "T2" },
        USER_WITH_ACCESS,
        "127.0.0.1",
      );

      expect(res.solicitudes).toHaveLength(1);
      expect(res.solicitudes[0].id).toBe("2");
    });

    it("debe ordenar por prioridad", async () => {
      solicitudesAdapter.obtenerSolicitudesEnEjecucion.mockResolvedValue([
        {
          id: "1",
          estado: "En Proceso",
          prioridad: "Baja",
          tecnicoId: "T1",
          fechaInicioEjecucion: new Date().toISOString(),
          porcentajeAvance: 50,
          clienteNombre: null,
          servicioNombre: null,
          tecnicoNombre: null,
        },
        {
          id: "2",
          estado: "En Ejecución",
          prioridad: "Alta",
          tecnicoId: "T2",
          fechaInicioEjecucion: new Date().toISOString(),
          porcentajeAvance: 10,
          clienteNombre: null,
          servicioNombre: null,
          tecnicoNombre: null,
        },
        {
          id: "3",
          estado: "En Ejecución",
          prioridad: "Desconocida" as any,
          tecnicoId: "T2",
          fechaInicioEjecucion: new Date().toISOString(),
          porcentajeAvance: 10,
          clienteNombre: null,
          servicioNombre: null,
          tecnicoNombre: null,
        },
      ]);

      const res = await service.obtenerSolicitudesEnEjecucion(
        { ordenarPor: "prioridad" },
        USER_WITH_ACCESS,
        "127.0.0.1",
      );

      expect(res.solicitudes[0].id).toBe("2"); // Alta
      expect(res.solicitudes[1].id).toBe("1"); // Baja
      expect(res.solicitudes[2].id).toBe("3"); // Desconocida (4)
    });

    it("debe ordenar por fechaInicio", async () => {
      solicitudesAdapter.obtenerSolicitudesEnEjecucion.mockResolvedValue([
        {
          id: "1",
          estado: "En Proceso",
          prioridad: "Baja",
          tecnicoId: "T1",
          fechaInicioEjecucion: "2024-05-01T10:00:00Z",
          porcentajeAvance: 50,
          clienteNombre: null,
          servicioNombre: null,
          tecnicoNombre: null,
        },
        {
          id: "2",
          estado: "En Ejecución",
          prioridad: "Alta",
          tecnicoId: "T2",
          fechaInicioEjecucion: "2024-05-10T10:00:00Z",
          porcentajeAvance: 10,
          clienteNombre: null,
          servicioNombre: null,
          tecnicoNombre: null,
        },
      ]);

      const res = await service.obtenerSolicitudesEnEjecucion(
        { ordenarPor: "fechaInicio" },
        USER_WITH_ACCESS,
        "127.0.0.1",
      );

      // Descending usually (newest first). Our logic: b - a
      expect(res.solicitudes[0].id).toBe("2");
      expect(res.solicitudes[1].id).toBe("1");
    });

    it("debe usar fallback N/A cuando clienteNombre, servicioNombre y tecnicoNombre son null", async () => {
      solicitudesAdapter.obtenerSolicitudesEnEjecucion.mockResolvedValue([
        {
          id: "X",
          estado: "En Proceso",
          prioridad: "Media",
          tecnicoId: "T1",
          fechaInicioEjecucion: new Date().toISOString(),
          porcentajeAvance: 0,
          clienteNombre: null,
          servicioNombre: null,
          tecnicoNombre: null,
        },
      ]);

      const res = await service.obtenerSolicitudesEnEjecucion(
        {},
        USER_WITH_ACCESS,
        "127.0.0.1",
      );

      expect(res.solicitudes[0].cliente).toBe("N/A");
      expect(res.solicitudes[0].servicio).toBe("N/A");
      expect(res.solicitudes[0].tecnicoAsignado).toBe("N/A");
    });

    it("debe usar los valores reales cuando clienteNombre y tecnicoNombre no son null", async () => {
      solicitudesAdapter.obtenerSolicitudesEnEjecucion.mockResolvedValue([
        {
          id: "Y",
          estado: "En Ejecución",
          prioridad: "Alta",
          tecnicoId: "T3",
          fechaInicioEjecucion: new Date().toISOString(),
          porcentajeAvance: 75,
          clienteNombre: "Empresa XYZ",
          servicioNombre: "Servicio ABC",
          tecnicoNombre: "Carlos López",
        },
      ]);

      const res = await service.obtenerSolicitudesEnEjecucion(
        {},
        USER_WITH_ACCESS,
        "127.0.0.1",
      );

      expect(res.solicitudes[0].cliente).toBe("Empresa XYZ");
      expect(res.solicitudes[0].servicio).toBe("Servicio ABC");
      expect(res.solicitudes[0].tecnicoAsignado).toBe("Carlos López");
    });
  });
});
