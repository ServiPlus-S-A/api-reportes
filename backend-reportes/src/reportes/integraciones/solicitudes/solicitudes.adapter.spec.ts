import { Test, TestingModule } from "@nestjs/testing";
import { SolicitudesAdapter } from "./solicitudes.adapter";

describe("SolicitudesAdapter", () => {
  let adapter: SolicitudesAdapter;
  const fetchMock = jest.fn();

  beforeEach(async () => {
    global.fetch = fetchMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [SolicitudesAdapter],
    }).compile();

    adapter = module.get<SolicitudesAdapter>(SolicitudesAdapter);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.EXTERNAL_SOLICITUDES_URL;
  });

  it("should be defined", () => {
    expect(adapter).toBeDefined();
  });

  it("should return data from axios when URL is provided", async () => {
    process.env.EXTERNAL_SOLICITUDES_URL = "http://external-solicitudes.com";
    const mockData = [{ id: "sol-1", estado: "Completada" }];
    fetchMock.mockResolvedValue({
      json: jest.fn().mockResolvedValue(mockData),
    });

    const result = await adapter.fetchSolicitudesParaPromedio();

    expect(result).toBe(mockData);
    expect(fetchMock).toHaveBeenCalledWith("http://external-solicitudes.com", {
      signal: expect.any(AbortSignal),
    });
  });

  it("should return fallback demo data if axios fails", async () => {
    process.env.EXTERNAL_SOLICITUDES_URL = "http://external-solicitudes.com";
    fetchMock.mockRejectedValue(new Error("Network Error"));

    const result = await adapter.fetchSolicitudesParaPromedio();

    expect(result).toHaveLength(6);
    expect(result[0]).toHaveProperty("id");
  });

  it("should return fallback demo data if URL is empty", async () => {
    process.env.EXTERNAL_SOLICITUDES_URL = "";

    const result = await adapter.fetchSolicitudesParaPromedio();

    expect(result).toHaveLength(6);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a mocked completed solicitud", async () => {
    const result = await adapter.obtenerSolicitudPorId("REQ-12345");
    expect(result?.estado).toBe("completada");
  });

  it("returns null for unknown solicitud", async () => {
    await expect(
      adapter.obtenerSolicitudPorId("REQ-00000"),
    ).resolves.toBeNull();
  });
});
