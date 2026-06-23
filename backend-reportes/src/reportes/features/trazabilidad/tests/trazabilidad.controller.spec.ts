import { Test, TestingModule } from "@nestjs/testing";
import { TrazabilidadController } from "../trazabilidad.controller";
import { TrazabilidadService } from "../trazabilidad.service";
import { JwtAuthGuard } from "../../../shared/auth/jwt-auth.guard";
import { RedisCacheInterceptor } from "../../../shared/cache/redis-cache.interceptor";

describe("TrazabilidadController", () => {
  let controller: TrazabilidadController;
  let service: jest.Mocked<TrazabilidadService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrazabilidadController],
      providers: [
        {
          provide: TrazabilidadService,
          useValue: {
            obtenerDetalleSolicitudCompletada: jest.fn(),
            exportarAtenciones: jest.fn(),
            obtenerAtencionesAnidadas: jest.fn(),
            obtenerSolicitudesEnEjecucion: jest.fn(),
            obtenerClientes: jest.fn(),
            obtenerClientePorID: jest.fn(),
            obtenerReporteConsolidadoClientes: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideInterceptor(RedisCacheInterceptor)
      .useValue({ intercept: (context: any, next: any) => next.handle() })
      .compile();

    controller = module.get<TrazabilidadController>(TrazabilidadController);
    service = module.get(TrazabilidadService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("Endpoints core de Trazabilidad", () => {
    it("Llama al servicio para obtener detalles de la solicitud", async () => {
      service.obtenerDetalleSolicitudCompletada.mockResolvedValue({
        id: "1",
      } as any);

      const response = await controller.obtenerDetalleSolicitud(
        "1",
        {} as any,
        {} as any,
        { ip: "127.0.0.1" } as any,
      );

      expect(response).toBeDefined();
      expect(service.obtenerDetalleSolicitudCompletada).toHaveBeenCalled();
    });

    it("Llama al servicio para exportar las atenciones a un pdf buffer", async () => {
      const bufferDePrueba = Buffer.from("test pdf content");
      service.exportarAtenciones.mockResolvedValue(bufferDePrueba);

      const resObj = { set: jest.fn(), send: jest.fn() };

      await controller.exportarAtenciones(
        "1",
        { formato: "pdf" },
        {} as any,
        { ip: "127.0.0.1" } as any,
        resObj as any,
      );

      expect(resObj.set).toHaveBeenCalled();
      expect(resObj.send).toHaveBeenCalledWith(bufferDePrueba);
      expect(service.exportarAtenciones).toHaveBeenCalled();
    });

    it("Llama al servicio para obtener listado de atenciones de una solicitud", async () => {
      service.obtenerAtencionesAnidadas.mockResolvedValue({
        atenciones: [],
      } as any);

      const res = await controller.obtenerAtenciones(
        "1",
        {} as any,
        {} as any,
        { ip: "127.0.0.1" } as any,
      );
      expect(res).toBeDefined();
      expect(service.obtenerAtencionesAnidadas).toHaveBeenCalled();
    });

    it("resuelve la ip desde remoteAddress o 0.0.0.0 en obtenerDetalleSolicitud", async () => {
      service.obtenerDetalleSolicitudCompletada.mockResolvedValue({} as any);

      await controller.obtenerDetalleSolicitud(
        "1",
        { page: 2 } as any,
        {} as any,
        { socket: { remoteAddress: "10.0.0.1" } } as any,
      );
      expect(service.obtenerDetalleSolicitudCompletada).toHaveBeenCalledWith(
        "1",
        {},
        "10.0.0.1",
        2,
        10,
      );

      await controller.obtenerDetalleSolicitud(
        "1",
        { pageSize: 5 } as any,
        {} as any,
        { socket: {} } as any,
      );
      expect(service.obtenerDetalleSolicitudCompletada).toHaveBeenCalledWith(
        "1",
        {},
        "0.0.0.0",
        1,
        5,
      );
    });

    it("Llama al servicio para exportar atenciones a excel", async () => {
      const bufferDePrueba = Buffer.from("excel data");
      service.exportarAtenciones.mockResolvedValue(bufferDePrueba);

      const resObj = { set: jest.fn(), send: jest.fn() };

      await controller.exportarAtenciones(
        "1",
        { formato: "excel" },
        {} as any,
        { socket: {} } as any, // cubre fallback 0.0.0.0
        resObj as any,
      );

      expect(resObj.set).toHaveBeenCalled();
      expect(resObj.send).toHaveBeenCalledWith(bufferDePrueba);
      expect(service.exportarAtenciones).toHaveBeenCalledWith(
        "1",
        "excel",
        {},
        "0.0.0.0",
      );
    });

    it("resuelve ip fallback en obtenerAtenciones", async () => {
      service.obtenerAtencionesAnidadas.mockResolvedValue({} as any);

      await controller.obtenerAtenciones(
        "1",
        { page: 2, pageSize: 20 } as any,
        {} as any,
        { socket: {} } as any,
      );
      expect(service.obtenerAtencionesAnidadas).toHaveBeenCalledWith(
        "1",
        {},
        "0.0.0.0",
        2,
        20,
      );
    });

    it("Llama al servicio para obtener solicitudes en ejecución", async () => {
      service.obtenerSolicitudesEnEjecucion.mockResolvedValue({
        solicitudes: [],
        total: 0,
        capacidadOperativa: 5,
      } as any);

      const res = await controller.obtenerSolicitudesEnEjecucion(
        {} as any,
        {} as any,
        { ip: "127.0.0.1" } as any,
      );
      expect(res).toBeDefined();
      expect(service.obtenerSolicitudesEnEjecucion).toHaveBeenCalledWith(
        {},
        {},
        "127.0.0.1",
      );
    });

    it("resuelve la ip fallback en obtenerSolicitudesEnEjecucion", async () => {
      service.obtenerSolicitudesEnEjecucion.mockResolvedValue({
        solicitudes: [],
        total: 0,
        capacidadOperativa: 5,
      } as any);

      const res = await controller.obtenerSolicitudesEnEjecucion(
        {} as any,
        {} as any,
        { socket: {} } as any,
      );
      expect(res).toBeDefined();
      expect(service.obtenerSolicitudesEnEjecucion).toHaveBeenCalledWith(
        {},
        {},
        "0.0.0.0",
      );
    });

    it("llama al servicio para obtener clientes con filtro opcional de departamento", async () => {
      service.obtenerClientes.mockResolvedValue([{ id: "cli-1" }] as any);

      const res = await controller.obtenerClientes("Antioquia");

      expect(res).toEqual([{ id: "cli-1" }]);
      expect(service.obtenerClientes).toHaveBeenCalledWith("Antioquia");
    });

    it("llama al servicio para obtener un cliente por id", async () => {
      service.obtenerClientePorID.mockResolvedValue({ id: "cli-1" } as any);

      const res = await controller.obtenerClientePorID("cli-1");

      expect(res).toEqual({ id: "cli-1" });
      expect(service.obtenerClientePorID).toHaveBeenCalledWith("cli-1");
    });

    it("llama al servicio para distribución consolidada de clientes", async () => {
      service.obtenerReporteConsolidadoClientes.mockResolvedValue({
        tabla: [],
      } as any);

      const res = await controller.obtenerDistribucionClientes({
        tipo: "empresarial",
        estado: "activo",
      } as any);

      expect(res).toEqual({ tabla: [] });
      expect(service.obtenerReporteConsolidadoClientes).toHaveBeenCalledWith(
        "empresarial",
        "activo",
      );
    });

    it("mantiene compatibilidad con distribución por departamento", async () => {
      service.obtenerReporteConsolidadoClientes.mockResolvedValue({
        grafico: [],
      } as any);

      const res =
        await controller.obtenerDistribucionClientesPorDepartamentoResumen({
          tipo: "persona_natural",
          estado: "inactivo",
        } as any);

      expect(res).toEqual({ grafico: [] });
      expect(service.obtenerReporteConsolidadoClientes).toHaveBeenCalledWith(
        "persona_natural",
        "inactivo",
      );
    });
  });
});
