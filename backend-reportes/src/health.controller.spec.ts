import { Test, TestingModule } from "@nestjs/testing";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("check", () => {
    it('should return status "UP"', () => {
      const result = controller.check();
      expect(result).toHaveProperty("status", "UP");
      expect(result).toHaveProperty("timestamp");
      expect(new Date(result.timestamp).getTime()).not.toBeNaN();
    });
  });
});
