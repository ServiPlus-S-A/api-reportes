import { Test, TestingModule } from "@nestjs/testing";
import { FinanzasAdapter } from "./finanzas.adapter";
import axios from "axios";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("FinanzasAdapter", () => {
  let adapter: FinanzasAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FinanzasAdapter],
    }).compile();

    adapter = module.get<FinanzasAdapter>(FinanzasAdapter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(adapter).toBeDefined();
  });

  describe("fetchIngresosPorPeriodo", () => {
    const periodo = "2026-05";

    it("should return data from axios when URL is provided", async () => {
      process.env.EXTERNAL_FINANZAS_URL = "http://external-api.com";
      const mockData = [{ id: "1", monto: 100, tipo: "ingreso" }];
      mockedAxios.get.mockResolvedValue({ data: mockData });

      const result = await adapter.fetchIngresosPorPeriodo(periodo);

      expect(result).toBe(mockData);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `http://external-api.com?periodo=${periodo}`,
        { timeout: 3000 },
      );
    });

    it("should return fallback data if axios fails", async () => {
      process.env.EXTERNAL_FINANZAS_URL = "http://external-api.com";
      mockedAxios.get.mockRejectedValue(new Error("Network Error"));

      const result = await adapter.fetchIngresosPorPeriodo(periodo);

      expect(result).toHaveLength(5);
      expect(result[0]).toHaveProperty("descripcion");
    });

    it("should return fallback data if URL is empty", async () => {
      process.env.EXTERNAL_FINANZAS_URL = "";
      const result = await adapter.fetchIngresosPorPeriodo(periodo);

      expect(result).toHaveLength(5);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });
  });
});
