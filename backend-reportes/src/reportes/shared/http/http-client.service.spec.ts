import { Test, TestingModule } from "@nestjs/testing";
import { HttpClientService } from "./http-client.service";
import axios from "axios";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("HttpClientService", () => {
  let service: HttpClientService;

  beforeEach(async () => {
    mockedAxios.create.mockReturnValue(mockedAxios as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [HttpClientService],
    }).compile();

    service = module.get<HttpClientService>(HttpClientService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("get", () => {
    it("should return data on GET success", async () => {
      mockedAxios.get.mockResolvedValue({ data: "ok" });
      const result = await service.get("/test");
      expect(result).toBe("ok");
      expect(mockedAxios.get).toHaveBeenCalledWith("/test", undefined);
    });

    it("should throw and log on GET error", async () => {
      mockedAxios.get.mockRejectedValue(new Error("Network error"));
      await expect(service.get("/fail")).rejects.toThrow("Network error");
    });
  });

  describe("post", () => {
    it("should return data on POST success", async () => {
      mockedAxios.post.mockResolvedValue({ data: { id: 1 } });
      const result = await service.post("/create", { name: "test" });
      expect(result).toEqual({ id: 1 });
      expect(mockedAxios.post).toHaveBeenCalledWith(
        "/create",
        { name: "test" },
        undefined,
      );
    });

    it("should throw and log on POST error", async () => {
      mockedAxios.post.mockRejectedValue(new Error("Server error"));
      await expect(service.post("/fail", {})).rejects.toThrow("Server error");
    });
  });
});
