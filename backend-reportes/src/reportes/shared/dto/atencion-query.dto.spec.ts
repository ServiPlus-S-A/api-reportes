import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { AtencionQueryDto } from "./atencion-query.dto";

describe("AtencionQueryDto", () => {
  describe("validation", () => {
    it("should pass with default values", async () => {
      const dto = plainToInstance(AtencionQueryDto, {});
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should pass with valid page and pageSize", async () => {
      const dto = plainToInstance(AtencionQueryDto, {
        page: 2,
        pageSize: 25,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should fail with page = 0", async () => {
      const dto = plainToInstance(AtencionQueryDto, { page: 0 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty("min");
    });

    it("should fail with pageSize > 50", async () => {
      const dto = plainToInstance(AtencionQueryDto, { pageSize: 51 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty("max");
    });

    it("should fail with pageSize = 0", async () => {
      const dto = plainToInstance(AtencionQueryDto, { pageSize: 0 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should fail with non-integer values", async () => {
      const dto = plainToInstance(AtencionQueryDto, {
        page: 1.5,
        pageSize: "25",
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should have default values", () => {
      const dto = new AtencionQueryDto();
      expect(dto.page).toBe(1);
      expect(dto.pageSize).toBe(25);
    });
  });
});
