import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { DetalleSolicitudQueryDto } from "./detalle-solicitud-query.dto";

describe("DetalleSolicitudQueryDto", () => {
  it("accepts valid pagination parameters", async () => {
    const dto = plainToInstance(DetalleSolicitudQueryDto, {
      page: "2",
      pageSize: "10",
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.pageSize).toBe(10);
  });

  it("rejects invalid pagination parameters", async () => {
    const dto = plainToInstance(DetalleSolicitudQueryDto, {
      page: "0",
      pageSize: "100",
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
