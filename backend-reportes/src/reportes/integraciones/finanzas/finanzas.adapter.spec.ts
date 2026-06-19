import { Test, TestingModule } from "@nestjs/testing";
import { FinanzasAdapter } from "./finanzas.adapter";

describe("FinanzasAdapter", () => {
  let adapter: FinanzasAdapter;
  const fetchMock = jest.fn();

  beforeEach(async () => {
    global.fetch = fetchMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [FinanzasAdapter],
    }).compile();

    adapter = module.get<FinanzasAdapter>(FinanzasAdapter);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.EXTERNAL_FINANZAS_URL;
  });

  it("should be defined", () => {
    expect(adapter).toBeDefined();
  });

  it("should return data from axios when URL is provided", async () => {
    process.env.EXTERNAL_FINANZAS_URL = "http://external-api.com";
    const mockData = [{ id: "1", monto: 100, tipo: "ingreso" }];
    fetchMock.mockResolvedValue({
      json: jest.fn().mockResolvedValue(mockData),
    });

    const result = await adapter.fetchIngresosPorPeriodo("2026-05");

    expect(result).toBe(mockData);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://external-api.com?periodo=2026-05",
      { signal: expect.any(AbortSignal) },
    );
  });

  it("should return fallback data if axios fails", async () => {
    process.env.EXTERNAL_FINANZAS_URL = "http://external-api.com";
    fetchMock.mockRejectedValue(new Error("Network Error"));

    const result = await adapter.fetchIngresosPorPeriodo("2026-05");

    expect(result).toHaveLength(5);
    expect(result[0]).toHaveProperty("descripcion");
  });

  it("should return fallback data if URL is empty", async () => {
    process.env.EXTERNAL_FINANZAS_URL = "";

    const result = await adapter.fetchIngresosPorPeriodo("2026-05");

    expect(result).toHaveLength(5);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
