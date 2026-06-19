import { Test, TestingModule } from "@nestjs/testing";
import { OperacionService } from "../operacion.service";
import { SolicitudesAdapter } from "../../../integraciones/solicitudes/solicitudes.adapter";

describe("OperacionService", () => {
  let service: OperacionService;
  let adapter: jest.Mocked<SolicitudesAdapter>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OperacionService,
        {
          provide: SolicitudesAdapter,
          useValue: {
            fetchSolicitudesParaPromedio: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    service = module.get<OperacionService>(OperacionService);
    adapter = module.get(SolicitudesAdapter);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("obtenerTiempoPromedioSolicitudes", () => {
    it("deberia retornar promedio 0 si no hay solicitudes", async () => {
      const res = await service.obtenerTiempoPromedioSolicitudes({});
      expect(res.promedio).toBe(0);
      expect(res.mensaje).toBe(
        "Sin datos de cierre para el periodo consultado",
      );
    });

    it("deberia calcular promedio de horas exitosamente para solicitudes cerradas dentro del rango", async () => {
      adapter.fetchSolicitudesParaPromedio.mockResolvedValue([
        {
          estado: "Completada",
          fechaCreacion: "2024-01-01T00:00:00Z",
          fechaCompletada: "2024-01-01T02:00:00Z",
          tipoServicio: "A",
        },
        {
          estado: "Completada",
          fechaCreacion: "2024-01-02T00:00:00Z",
          fechaCompletada: "2024-01-02T04:00:00Z",
          tipoServicio: "A",
        },
      ]);

      const res = await service.obtenerTiempoPromedioSolicitudes({
        tipoServicio: "A",
      });
      expect(res.promedio).toBe(3); // (2 h + 4 h) / 2
      expect(res.solicitudesProcesadas).toBe(2);
    });
  });
});
