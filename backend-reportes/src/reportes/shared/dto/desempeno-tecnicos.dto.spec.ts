import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import {
  DesempenoTecnicosFiltroDto,
  DesempenoTecnicoResultadoDto,
  DesempenoTecnicosResponseDto,
} from "./desempeno-tecnicos.dto";

describe("DesempenoTecnicos DTOs", () => {
  describe("DesempenoTecnicosFiltroDto", () => {
    it("should validate successfully with valid params", async () => {
      const dto = new DesempenoTecnicosFiltroDto();
      dto.fechaInicio = "2026-05-01";
      dto.fechaFin = "2026-05-31";
      dto.especialidad = "Soporte";

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should transform and normalize especialidad correctly", async () => {
      const plain = {
        fechaInicio: "2026-05-01",
        fechaFin: "2026-05-31",
        especialidad: "  consultoría ",
      };
      const dto = plainToInstance(DesempenoTecnicosFiltroDto, plain);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.especialidad).toBe("Consultoria");
    });
  });

  describe("DesempenoTecnicoResultadoDto", () => {
    it("should instantiate correctly", () => {
      const dto = new DesempenoTecnicoResultadoDto();
      dto.nombreTecnico = "Test Tec";
      dto.especialidad = "Soporte";
      dto.cantidadServiciosCompletados = 5;
      dto.calificacionPromedio = 4.8;
      expect(dto).toBeDefined();
      expect(dto.nombreTecnico).toBe("Test Tec");
    });
  });

  describe("DesempenoTecnicosResponseDto", () => {
    it("should instantiate correctly", () => {
      const dto = new DesempenoTecnicosResponseDto();
      dto.resultados = [];
      dto.totalServiciosCompletados = 0;
      dto.totalTecnicos = 0;
      expect(dto).toBeDefined();
    });
  });
});
