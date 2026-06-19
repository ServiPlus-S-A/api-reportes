import { Test, TestingModule } from "@nestjs/testing";
import { JwtReportesService } from "./auth/jwt-reportes.service";
import { ReportesController } from "./reportes.controller";
import { ReportesService } from "./reportes.service";

describe("ReportesController", () => {
  let controller: ReportesController;
  let service: {
    obtenerDetalleSolicitudCompletada: jest.Mock;
    obtenerAtencionesAnidadas: jest.Mock;
    exportarAtenciones: jest.Mock;
    obtenerTiempoPromedioSolicitudes: jest.Mock;
    generarReporte: jest.Mock;
  };

  const user = {
    sub: "coord-1",
    role: "coordinador",
    unidadIds: ["reportes-centro"],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportesController],
      providers: [
        {
          provide: ReportesService,
          useValue: {
            obtenerDetalleSolicitudCompletada: jest.fn().mockResolvedValue({
              id: "REQ-12345",
            }),
            obtenerAtencionesAnidadas: jest.fn().mockResolvedValue({
              solicitudId: "REQ-12345",
              atenciones: [],
              pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 },
              warnings: [],
            }),
            exportarAtenciones: jest.fn().mockResolvedValue(Buffer.from("PDF")),
            generarReporte: jest.fn().mockResolvedValue({
              periodo: "2026-05",
              tipo: "financiero",
              totalIngresos: 0,
              totalEgresos: 0,
              balance: 0,
              generadoPor: "coord-1",
              fechaCreacion: "2026-05-01T00:00:00.000Z",
              detalles: [],
            }),
            obtenerTiempoPromedioSolicitudes: jest.fn().mockResolvedValue({
              promedio: 9,
              unidad: "horas",
              promedioTexto: "0 dia(s), 9 hora(s)",
              solicitudesProcesadas: 1,
              historicoUltimos6Meses: [],
            }),
          },
        },
        {
          provide: JwtReportesService,
          useValue: {
            validateToken: jest.fn().mockReturnValue(user),
          },
        },
      ],
    }).compile();

    controller = module.get<ReportesController>(ReportesController);
    service = module.get(ReportesService);
  });

  it("delegates KPI request to service", async () => {
    const dto = {
      fechaInicio: "2026-01-01T00:00:00.000Z",
      fechaFin: "2026-01-31T23:59:59.000Z",
      tipoServicio: "Finanzas",
    };

    await controller.obtenerTiempoPromedioSolicitudes(dto);

    expect(service.obtenerTiempoPromedioSolicitudes).toHaveBeenCalledWith(dto);
  });

  it("wraps report generation failures in bad request response", async () => {
    service.generarReporte = jest.fn().mockRejectedValue(new Error("boom"));

    await expect(
      controller.generarReporte(
        { periodo: "2026-05", tipo: "financiero" },
        undefined as any,
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        statusCode: 400,
        message: "No se pudo generar el reporte solicitado.",
        error: "boom",
      }),
    });
  });

  it("passes explicit user id when generating reports", async () => {
    await controller.generarReporte(
      { periodo: "2026-05", tipo: "financiero" },
      "coord-1",
    );

    expect(service.generarReporte).toHaveBeenCalledWith(
      { periodo: "2026-05", tipo: "financiero" },
      "coord-1",
    );
  });

  it("wraps non-error report generation failures", async () => {
    service.generarReporte = jest.fn().mockRejectedValue("plain failure");

    await expect(
      controller.generarReporte(
        { periodo: "2026-05", tipo: "financiero" },
        "coord-1",
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        error: "plain failure",
      }),
    });
  });

  it("delegates detalle request to service using guard payload and request ip", async () => {
    await controller.obtenerDetalleSolicitud(
      "REQ-12345",
      { page: 1, pageSize: 10 },
      user,
      {
        ip: "127.0.0.1",
        socket: { remoteAddress: "127.0.0.1" },
      } as any,
    );

    expect(service.obtenerDetalleSolicitudCompletada).toHaveBeenCalledWith(
      "REQ-12345",
      user,
      "127.0.0.1",
      1,
      10,
    );
  });

  it("uses socket remote address when req.ip is unavailable", async () => {
    await controller.obtenerDetalleSolicitud("REQ-12345", {}, user, {
      socket: { remoteAddress: "10.0.0.5" },
    } as any);

    expect(service.obtenerDetalleSolicitudCompletada).toHaveBeenCalledWith(
      "REQ-12345",
      user,
      "10.0.0.5",
      1,
      10,
    );
  });

  it("uses fallback IP for detalle when request has no address", async () => {
    await controller.obtenerDetalleSolicitud("REQ-12345", {}, user, {
      socket: {},
    } as any);

    expect(service.obtenerDetalleSolicitudCompletada).toHaveBeenCalledWith(
      "REQ-12345",
      user,
      "0.0.0.0",
      1,
      10,
    );
  });

  it("delegates atenciones request to service with guard payload and IP", async () => {
    await controller.obtenerAtenciones(
      "REQ-12345",
      { page: 2, pageSize: 25 },
      user,
      {
        ip: "127.0.0.1",
        socket: { remoteAddress: "127.0.0.1" },
      } as any,
    );

    expect(service.obtenerAtencionesAnidadas).toHaveBeenCalledWith(
      "REQ-12345",
      user,
      "127.0.0.1",
      2,
      25,
    );
  });

  it("uses default atenciones pagination values", async () => {
    await controller.obtenerAtenciones("REQ-12345", {}, user, {
      ip: "127.0.0.1",
      socket: { remoteAddress: "127.0.0.1" },
    } as any);

    expect(service.obtenerAtencionesAnidadas).toHaveBeenCalledWith(
      "REQ-12345",
      user,
      "127.0.0.1",
      1,
      25,
    );
  });

  it("uses fallback IP for atenciones when request has no address", async () => {
    await controller.obtenerAtenciones("REQ-12345", {}, user, {
      socket: {},
    } as any);

    expect(service.obtenerAtencionesAnidadas).toHaveBeenCalledWith(
      "REQ-12345",
      user,
      "0.0.0.0",
      1,
      25,
    );
  });

  it("delegates PDF export to service", async () => {
    const mockResponse = {
      set: jest.fn(),
      send: jest.fn(),
    };

    await controller.exportarAtenciones(
      "REQ-12345",
      { formato: "pdf" },
      user,
      {
        ip: "127.0.0.1",
        socket: { remoteAddress: "127.0.0.1" },
      } as any,
      mockResponse as any,
    );

    expect(service.exportarAtenciones).toHaveBeenCalledWith(
      "REQ-12345",
      "pdf",
      user,
      "127.0.0.1",
    );
    expect(mockResponse.set).toHaveBeenCalledWith(
      expect.objectContaining({
        "Content-Type": "application/pdf",
      }),
    );
    expect(mockResponse.send).toHaveBeenCalled();
  });

  it("sets Excel response headers", async () => {
    const mockResponse = {
      set: jest.fn(),
      send: jest.fn(),
    };

    await controller.exportarAtenciones(
      "REQ-12345",
      { formato: "excel" },
      user,
      {
        ip: "127.0.0.1",
        socket: { remoteAddress: "127.0.0.1" },
      } as any,
      mockResponse as any,
    );

    expect(mockResponse.set).toHaveBeenCalledWith(
      expect.objectContaining({
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": expect.stringContaining(".xlsx"),
      }),
    );
  });

  it("uses fallback IP for export when request has no address", async () => {
    const mockResponse = {
      set: jest.fn(),
      send: jest.fn(),
    };

    await controller.exportarAtenciones(
      "REQ-12345",
      { formato: "pdf" },
      user,
      {
        socket: {},
      } as any,
      mockResponse as any,
    );

    expect(service.exportarAtenciones).toHaveBeenCalledWith(
      "REQ-12345",
      "pdf",
      user,
      "0.0.0.0",
    );
  });
});
