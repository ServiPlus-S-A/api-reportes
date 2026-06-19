import { Test, TestingModule } from "@nestjs/testing";
import { TrazabilidadService } from "../trazabilidad.service";
import { SolicitudesAdapter } from "../../../integraciones/solicitudes/solicitudes.adapter";
import { ClientesAdapter } from "../../../integraciones/parametrizacion/clientes.adapter";
import { ServiciosAdapter } from "../../../integraciones/parametrizacion/servicios.adapter";
import { ConsultoresAdapter } from "../../../integraciones/parametrizacion/consultores.adapter";
import { AtencionesAdapter } from "../../../integraciones/atenciones/atenciones.adapter";
import { FirebaseReporteRepository } from "../../../shared/repositories/firebase-reporte.repository";
import { NotFoundException, BadRequestException } from "@nestjs/common";

describe("TrazabilidadService", () => {
  let service: TrazabilidadService;
  let solicitudesAdapter: jest.Mocked<SolicitudesAdapter>;
  let repository: jest.Mocked<FirebaseReporteRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrazabilidadService,
        {
          provide: SolicitudesAdapter,
          useValue: { obtenerSolicitudPorId: jest.fn() },
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
          useValue: { saveAccessLog: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<TrazabilidadService>(TrazabilidadService);
    solicitudesAdapter = module.get(SolicitudesAdapter);
    repository = module.get(FirebaseReporteRepository);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("obtenerDetalleSolicitudCompletada", () => {
    it("debe propagar NotFoundException si la solicitud no existe", async () => {
      solicitudesAdapter.obtenerSolicitudPorId.mockResolvedValue(null);
      await expect(
        service.obtenerDetalleSolicitudCompletada(
          "REQ-1",
          { sub: "usr1", unidadIds: [] } as any,
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
          { sub: "usr1", unidadIds: [] } as any,
          "0.0.0.0",
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("debe retornar correctamente los detalles si cumple las condiciones", async () => {
      solicitudesAdapter.obtenerSolicitudPorId.mockResolvedValue({
        id: "REQ-3",
        estado: "completada",
        unidadId: "U1",
        gananciaGenerada: 500,
        fechaInicio: "2024-01-01",
      } as any);

      const res = await service.obtenerDetalleSolicitudCompletada(
        "REQ-3",
        { sub: "usr1", unidadIds: ["U1"] } as any,
        "0.0.0.0",
      );

      expect(res.id).toBe("REQ-3");
      expect(res.gananciaGenerada).toBe("$500.00");
      expect(repository.saveAccessLog).toHaveBeenCalledWith(
        expect.objectContaining({ allowed: true }),
      );
    });
  });
});
