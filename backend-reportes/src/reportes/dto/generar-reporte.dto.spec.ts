import { validate } from "class-validator";
import { GenerarReporteDto } from "./generar-reporte.dto";

describe("GenerarReporteDto", () => {
  it("should validate a correct DTO", async () => {
    const dto = new GenerarReporteDto();
    dto.periodo = "2026-05";
    dto.tipo = "finanzas";

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it("should fail validation if periodo format is incorrect", async () => {
    const dto = new GenerarReporteDto();
    dto.periodo = "2026/05";
    dto.tipo = "finanzas";

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty("matches");
  });

  it("should fail validation if fields are empty", async () => {
    const dto = new GenerarReporteDto();

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
