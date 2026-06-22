import { Workbook } from "exceljs";
import {
  generarDesempenoTecnicosExcel,
  generarDesempenoTecnicosPDF,
} from "./desempeno-tecnicos-export.util";
import { DesempenoTecnicosResponseDto } from "../dto/desempeno-tecnicos.dto";

describe("desempeno-tecnicos-export.util", () => {
  const reporteBase: DesempenoTecnicosResponseDto = {
    fechaInicio: "2026-05-01",
    fechaFin: "2026-05-31",
    especialidad: "Soporte",
    totalTecnicos: 2,
    totalServiciosCompletados: 7,
    resultados: [
      {
        nombreTecnico: "Andrea Salazar",
        especialidad: "Soporte",
        cantidadServiciosCompletados: 4,
        calificacionPromedio: 4.75,
      },
      {
        nombreTecnico: "Jhon Cuero",
        especialidad: "Soporte",
        cantidadServiciosCompletados: 3,
        calificacionPromedio: null,
      },
    ],
  };

  describe("generarDesempenoTecnicosPDF", () => {
    it("should generate a valid PDF buffer", async () => {
      const buffer = await generarDesempenoTecnicosPDF(reporteBase);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      expect(buffer.toString("ascii", 0, 4)).toBe("%PDF");
    });

    it("should generate a valid PDF when there are multiple pages", async () => {
      const reporte = {
        ...reporteBase,
        totalTecnicos: 40,
        totalServiciosCompletados: 40,
        resultados: Array.from({ length: 40 }, (_, index) => ({
          nombreTecnico: `Tecnico ${index + 1}`,
          especialidad: "Soporte" as const,
          cantidadServiciosCompletados: 1,
          calificacionPromedio: index % 2 === 0 ? 4.5 : null,
        })),
      };

      const buffer = await generarDesempenoTecnicosPDF(reporte);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      expect(buffer.toString("ascii", 0, 4)).toBe("%PDF");
    });
  });

  describe("generarDesempenoTecnicosExcel", () => {
    it("should generate a valid Excel buffer", async () => {
      const buffer = await generarDesempenoTecnicosExcel(reporteBase);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("should generate an Excel file with the expected structure and values", async () => {
      const buffer = await generarDesempenoTecnicosExcel(reporteBase);
      const workbook = new Workbook();

      await workbook.xlsx.load(buffer as any);

      const hoja = workbook.getWorksheet("Consolidado");
      const filas = hoja?.getSheetValues() as Array<
        | undefined
        | null
        | string
        | number
        | Array<string | number | null | undefined>
      >;
      const filasTexto = JSON.stringify(filas);

      expect(hoja).toBeDefined();
      expect(hoja?.getCell("A1").value).toBe(
        "Consolidado de servicios completados por técnico",
      );
      expect(hoja?.getCell("A2").value).toBe(
        "Periodo: 2026-05-01 a 2026-05-31",
      );
      expect(hoja?.getCell("A3").value).toBe(
        "Especialidad: Soporte | Total tecnicos: 2 | Total servicios: 7",
      );
      expect(hoja?.getCell("A4").value).toBe("Nombre del tecnico");
      expect(filasTexto).toContain("Andrea Salazar");
      expect(filasTexto).toContain("Jhon Cuero");
      expect(filasTexto).toContain("Soporte");
      expect(filasTexto).toContain("4.75");
      expect(filasTexto).toContain("N/A");
    });

    it("should handle reports without specialty filter", async () => {
      const buffer = await generarDesempenoTecnicosExcel({
        ...reporteBase,
        especialidad: null,
      });
      const workbook = new Workbook();

      await workbook.xlsx.load(buffer as any);

      const hoja = workbook.getWorksheet("Consolidado");

      expect(hoja?.getCell("A3").value).toBe(
        "Especialidad: Todas | Total tecnicos: 2 | Total servicios: 7",
      );
    });
  });
});
