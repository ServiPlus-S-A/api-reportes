import { validate } from "class-validator";
import { SolicitudesEjecucionQueryDto } from "./solicitudes-ejecucion.dto";

describe("SolicitudesEjecucionQueryDto", () => {
  it("should validate successfully with valid params", async () => {
    const dto = new SolicitudesEjecucionQueryDto();
    dto.ordenarPor = "prioridad";
    dto.tecnicoId = "tec-123";

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it("should validate successfully with empty params", async () => {
    const dto = new SolicitudesEjecucionQueryDto();

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it("should fail validation if ordenarPor is invalid", async () => {
    const dto = new SolicitudesEjecucionQueryDto();
    (dto as any).ordenarPor = "invalid_enum_value";

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
