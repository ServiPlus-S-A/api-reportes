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
  };
  let jwtService: { validateToken: jest.Mock };

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
          },
        },
        {
          provide: JwtReportesService,
          useValue: {
            validateToken: jest.fn().mockReturnValue({
              sub: "coord-1",
              role: "coordinador",
              unidadIds: ["reportes-centro"],
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<ReportesController>(ReportesController);
    service = module.get(ReportesService);
    jwtService = module.get(JwtReportesService);
  });

  it("delegates detalle request to service using jwt payload and request ip", async () => {
    await controller.obtenerDetalleSolicitud(
      "REQ-12345",
      { page: 1, pageSize: 10 },
      {
        ip: "127.0.0.1",
        headers: { authorization: "Bearer test-token" },
        socket: { remoteAddress: "127.0.0.1" },
      } as any,
    );

    expect(jwtService.validateToken).toHaveBeenCalledWith("Bearer test-token");
    expect(service.obtenerDetalleSolicitudCompletada).toHaveBeenCalledWith(
      "REQ-12345",
      {
        sub: "coord-1",
        role: "coordinador",
        unidadIds: ["reportes-centro"],
      },
      "127.0.0.1",
      1,
      10,
    );
  });

  it("uses socket remote address when req.ip is unavailable", async () => {
    await controller.obtenerDetalleSolicitud("REQ-12345", {}, {
      headers: { authorization: "Bearer test-token" },
      socket: { remoteAddress: "10.0.0.5" },
    } as any);

    expect(service.obtenerDetalleSolicitudCompletada).toHaveBeenCalledWith(
      "REQ-12345",
      expect.any(Object),
      "10.0.0.5",
      1,
      10,
    );
  });

  describe("obtenerAtenciones", () => {
    it("should delegate atenciones request to service with JWT and IP", async () => {
      await controller.obtenerAtenciones(
        "REQ-12345",
        { page: 2, pageSize: 25 },
        {
          ip: "127.0.0.1",
          headers: { authorization: "Bearer test-token" },
          socket: { remoteAddress: "127.0.0.1" },
        } as any,
      );

      expect(jwtService.validateToken).toHaveBeenCalledWith(
        "Bearer test-token",
      );
      expect(service.obtenerAtencionesAnidadas).toHaveBeenCalledWith(
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
    });

    it("should use default pagination values", async () => {
      await controller.obtenerAtenciones("REQ-12345", {}, {
        ip: "127.0.0.1",
        headers: { authorization: "Bearer test-token" },
        socket: { remoteAddress: "127.0.0.1" },
      } as any);

      expect(service.obtenerAtencionesAnidadas).toHaveBeenCalledWith(
        "REQ-12345",
        expect.any(Object),
        "127.0.0.1",
        1,
        25,
      );
    });
  });

  describe("exportarAtenciones", () => {
    it("should delegate PDF export to service", async () => {
      const mockResponse = {
        set: jest.fn(),
        send: jest.fn(),
      };

      await controller.exportarAtenciones(
        "REQ-12345",
        { formato: "pdf" },
        {
          ip: "127.0.0.1",
          headers: { authorization: "Bearer test-token" },
          socket: { remoteAddress: "127.0.0.1" },
        } as any,
        mockResponse as any,
      );

      expect(service.exportarAtenciones).toHaveBeenCalledWith(
        "REQ-12345",
        "pdf",
        {
          sub: "coord-1",
          role: "coordinador",
          unidadIds: ["reportes-centro"],
        },
        "127.0.0.1",
      );

      expect(mockResponse.set).toHaveBeenCalledWith(
        expect.objectContaining({
          "Content-Type": "application/pdf",
        }),
      );
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it("should delegate Excel export to service", async () => {
      const mockResponse = {
        set: jest.fn(),
        send: jest.fn(),
      };

      await controller.exportarAtenciones(
        "REQ-12345",
        { formato: "excel" },
        {
          ip: "127.0.0.1",
          headers: { authorization: "Bearer test-token" },
          socket: { remoteAddress: "127.0.0.1" },
        } as any,
        mockResponse as any,
      );

      expect(service.exportarAtenciones).toHaveBeenCalledWith(
        "REQ-12345",
        "excel",
        expect.any(Object),
        "127.0.0.1",
      );

      expect(mockResponse.set).toHaveBeenCalledWith(
        expect.objectContaining({
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
      );
    });

    it("should set correct Content-Disposition header for PDF", async () => {
      const mockResponse = {
        set: jest.fn(),
        send: jest.fn(),
      };

      await controller.exportarAtenciones(
        "REQ-12345",
        { formato: "pdf" },
        {
          ip: "127.0.0.1",
          headers: { authorization: "Bearer test-token" },
          socket: { remoteAddress: "127.0.0.1" },
        } as any,
        mockResponse as any,
      );

      const headers = mockResponse.set.mock.calls[0][0];
      expect(headers["Content-Disposition"]).toContain("attachment");
      expect(headers["Content-Disposition"]).toContain(".pdf");
    });

    it("should set correct Content-Disposition header for Excel", async () => {
      const mockResponse = {
        set: jest.fn(),
        send: jest.fn(),
      };

      await controller.exportarAtenciones(
        "REQ-12345",
        { formato: "excel" },
        {
          ip: "127.0.0.1",
          headers: { authorization: "Bearer test-token" },
          socket: { remoteAddress: "127.0.0.1" },
        } as any,
        mockResponse as any,
      );

      const headers = mockResponse.set.mock.calls[0][0];
      expect(headers["Content-Disposition"]).toContain("attachment");
      expect(headers["Content-Disposition"]).toContain(".xlsx");
    });
  });
});
