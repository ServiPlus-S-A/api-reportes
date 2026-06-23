import { Test, TestingModule } from "@nestjs/testing";
import { ConsultoresAdapter } from "../../../integraciones/parametrizacion/consultores.adapter";
import { SolicitudesAdapter } from "../../../integraciones/solicitudes/solicitudes.adapter";
import { DesempenoTecnicosService } from "../desempeno-tecnicos.service";

describe("DesempenoTecnicosService", () => {
  let service: DesempenoTecnicosService;
  let solicitudesAdapter: jest.Mocked<SolicitudesAdapter>;
  let consultoresAdapter: jest.Mocked<ConsultoresAdapter>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DesempenoTecnicosService,
        {
          provide: SolicitudesAdapter,
          useValue: {
            fetchSolicitudesParaDesempeno: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: ConsultoresAdapter,
          useValue: {
            obtenerTecnicosParaDesempeno: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    service = module.get<DesempenoTecnicosService>(DesempenoTecnicosService);
    solicitudesAdapter = module.get(SolicitudesAdapter);
    consultoresAdapter = module.get(ConsultoresAdapter);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("debe fallar si la fecha inicial es mayor que la final", async () => {
    await expect(
      service.obtenerConsolidado({
        fechaInicio: "2026-06-10",
        fechaFin: "2026-06-01",
      }),
    ).rejects.toThrow(
      "Error de consulta: Verifique el rango de fechas ingresado.",
    );
  });

  it("debe contar solo solicitudes completadas dentro del rango", async () => {
    consultoresAdapter.obtenerTecnicosParaDesempeno.mockResolvedValue([
      { id: "tec-1", nombre: "Andrea", especialidad: "Soporte" },
      { id: "tec-2", nombre: "Julian", especialidad: "Mantenimiento" },
    ]);
    solicitudesAdapter.fetchSolicitudesParaDesempeno.mockResolvedValue([
      {
        id: "sol-1",
        estado: "Completada",
        fechaFinalizacion: "2026-05-02T12:00:00Z",
        tecnicoId: "tec-1",
        especialidad: "Soporte",
        calificacion: 4.5,
      },
      {
        id: "sol-2",
        estado: "Pendiente",
        fechaFinalizacion: "2026-05-03T12:00:00Z",
        tecnicoId: "tec-1",
        especialidad: "Soporte",
        calificacion: 5,
      },
      {
        id: "sol-3",
        estado: "Completada",
        fechaFinalizacion: "2026-05-04T12:00:00Z",
        tecnicoId: "tec-2",
        especialidad: "Mantenimiento",
        calificacion: 4,
      },
    ]);

    const result = await service.obtenerConsolidado({
      fechaInicio: "2026-05-01",
      fechaFin: "2026-05-31",
    });

    expect(result.totalServiciosCompletados).toBe(2);
    expect(result.resultados[0]).toMatchObject({
      nombreTecnico: "Andrea",
      cantidadServiciosCompletados: 1,
      calificacionPromedio: 4.5,
    });
    expect(result.resultados[1]).toMatchObject({
      nombreTecnico: "Julian",
      cantidadServiciosCompletados: 1,
      calificacionPromedio: 4,
    });
  });

  it("debe incluir tecnicos con cero servicios en el periodo", async () => {
    consultoresAdapter.obtenerTecnicosParaDesempeno.mockResolvedValue([
      { id: "tec-1", nombre: "Andrea", especialidad: "Soporte" },
      { id: "tec-2", nombre: "Camilo", especialidad: "Soporte" },
    ]);
    solicitudesAdapter.fetchSolicitudesParaDesempeno.mockResolvedValue([
      {
        id: "sol-1",
        estado: "Completada",
        fechaFinalizacion: "2026-05-02T12:00:00Z",
        tecnicoId: "tec-1",
        especialidad: "Soporte",
        calificacion: null,
      },
    ]);

    const result = await service.obtenerConsolidado({
      fechaInicio: "2026-05-01",
      fechaFin: "2026-05-31",
      especialidad: "Soporte",
    });

    expect(result.totalTecnicos).toBe(2);
    expect(result.resultados).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nombreTecnico: "Camilo",
          cantidadServiciosCompletados: 0,
          calificacionPromedio: null,
        }),
      ]),
    );
  });

  it("debe filtrar por especialidad cuando aplica", async () => {
    consultoresAdapter.obtenerTecnicosParaDesempeno.mockResolvedValue([
      { id: "tec-1", nombre: "Andrea", especialidad: "Soporte" },
      { id: "tec-2", nombre: "Paula", especialidad: "Consultoria" },
    ]);
    solicitudesAdapter.fetchSolicitudesParaDesempeno.mockResolvedValue([
      {
        id: "sol-1",
        estado: "Completada",
        fechaFinalizacion: "2026-05-02T12:00:00Z",
        tecnicoId: "tec-1",
        especialidad: "Soporte",
        calificacion: 4.2,
      },
      {
        id: "sol-2",
        estado: "Completada",
        fechaFinalizacion: "2026-05-03T12:00:00Z",
        tecnicoId: "tec-2",
        especialidad: "Consultoria",
        calificacion: 4.9,
      },
    ]);

    const result = await service.obtenerConsolidado({
      fechaInicio: "2026-05-01",
      fechaFin: "2026-05-31",
      especialidad: "Consultoria",
    });

    expect(result.totalTecnicos).toBe(1);
    expect(result.resultados[0].nombreTecnico).toBe("Paula");
    expect(result.resultados[0].cantidadServiciosCompletados).toBe(1);
  });

  it("debe excluir solicitudes sin fecha de finalizacion valida", async () => {
    consultoresAdapter.obtenerTecnicosParaDesempeno.mockResolvedValue([
      { id: "tec-1", nombre: "Andrea", especialidad: "Soporte" },
    ]);
    solicitudesAdapter.fetchSolicitudesParaDesempeno.mockResolvedValue([
      {
        id: "sol-1",
        estado: "Completada",
        fechaFinalizacion: "fecha-invalida", // Dispara Number.isNaN(fechaCierre.getTime())
        tecnicoId: "tec-1",
        especialidad: "Soporte",
        calificacion: 5,
      },
      {
        id: "sol-2",
        estado: "Completada",
        fechaFinalizacion: null as any, // Sin fecha (branch ya cubierto por if !solicitud.fechaFinalizacion)
        tecnicoId: "tec-1",
        especialidad: "Soporte",
        calificacion: 5,
      },
    ]);

    const result = await service.obtenerConsolidado({
      fechaInicio: "2026-05-01",
      fechaFin: "2026-05-31",
    });

    expect(result.totalServiciosCompletados).toBe(0);
  });

  it("debe exportar el consolidado en excel", async () => {
    consultoresAdapter.obtenerTecnicosParaDesempeno.mockResolvedValue([
      { id: "tec-1", nombre: "Andrea", especialidad: "Soporte" },
    ]);
    solicitudesAdapter.fetchSolicitudesParaDesempeno.mockResolvedValue([
      {
        id: "sol-1",
        estado: "Completada",
        fechaFinalizacion: "2026-05-02T12:00:00Z",
        tecnicoId: "tec-1",
        especialidad: "Soporte",
        calificacion: 4.2,
      },
    ]);

    const buffer = await service.exportarConsolidado(
      {
        fechaInicio: "2026-05-01",
        fechaFin: "2026-05-31",
      },
      { formato: "excel" },
    );

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("debe exportar el consolidado en pdf", async () => {
    consultoresAdapter.obtenerTecnicosParaDesempeno.mockResolvedValue([
      { id: "tec-1", nombre: "Andrea", especialidad: "Soporte" },
    ]);
    solicitudesAdapter.fetchSolicitudesParaDesempeno.mockResolvedValue([
      {
        id: "sol-1",
        estado: "Completada",
        fechaFinalizacion: "2026-05-02T12:00:00Z",
        tecnicoId: "tec-1",
        especialidad: "Soporte",
        calificacion: 4.2,
      },
    ]);

    const buffer = await service.exportarConsolidado(
      {
        fechaInicio: "2026-05-01",
        fechaFin: "2026-05-31",
      },
      { formato: "pdf" },
    );

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("debe poder parsear boundary de fecha con un formato custom que no requiere sufijo", async () => {
    // Si parseBoundary recibe un Date completo por ej, o un "2026-05-01T15:00:00Z", entra en `new Date(value)`
    // ya que no cumple /^\d{4}-\d{2}-\d{2}$/
    consultoresAdapter.obtenerTecnicosParaDesempeno.mockResolvedValue([]);
    solicitudesAdapter.fetchSolicitudesParaDesempeno.mockResolvedValue([]);

    const result = await service.obtenerConsolidado({
      fechaInicio: "2026-05-01T00:00:00.000Z", // No cumple el regex ^\d{4}-\d{2}-\d{2}$
      fechaFin: "2026-05-31T23:59:59.000Z",
    });

    expect(result.totalServiciosCompletados).toBe(0);
  });
});
