import { generarPDF, generarExcel } from "./export.util";
import { AtencionDto } from "../../shared/dto/atencion-response.dto";

describe("export.util", () => {
  const mockAtenciones: AtencionDto[] = [
    {
      id: "ate-001",
      descripcion: "Implementación de módulo de gestión de inventario",
      lugar: "Oficina Centro, Bogotá",
      fecha: "16/06/2026 14:30:45",
      nombreConsultor: "Andrea Salazar",
    },
    {
      id: "ate-002",
      descripcion:
        "Soporte técnico y ajustes de configuración del sistema principal para mejorar la performance",
      lugar: "Oficina Norte, Medellín",
      fecha: "17/06/2026 09:15:30",
      nombreConsultor: "Jhon Cuero",
    },
  ];

  describe("generarPDF", () => {
    it("should generate PDF buffer", async () => {
      const buffer = await generarPDF(mockAtenciones);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("should generate PDF with PDF signature", async () => {
      const buffer = await generarPDF(mockAtenciones);
      const pdfSignature = buffer.toString("ascii", 0, 4);
      expect(pdfSignature).toBe("%PDF");
    });

    it("should handle empty attentions list", async () => {
      const buffer = await generarPDF([]);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("should handle long descriptions", async () => {
      const longDesc = "A".repeat(200);
      const atenciones: AtencionDto[] = [
        {
          ...mockAtenciones[0],
          descripcion: longDesc,
        },
      ];
      const buffer = await generarPDF(atenciones);
      expect(buffer).toBeInstanceOf(Buffer);
    });

    it("should generate valid PDF for multiple records", async () => {
      const manyAtenciones = Array(50)
        .fill(null)
        .map((_, i) => ({
          ...mockAtenciones[0],
          id: `ate-${String(i).padStart(4, "0")}`,
        }));

      const buffer = await generarPDF(manyAtenciones);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.toString("ascii", 0, 4)).toBe("%PDF");
    });
  });

  describe("generarExcel", () => {
    it("should generate Excel buffer", async () => {
      const buffer = await generarExcel(mockAtenciones);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("should handle empty attentions list", async () => {
      const buffer = await generarExcel([]);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("should handle long descriptions", async () => {
      const longDesc = "A".repeat(200);
      const atenciones: AtencionDto[] = [
        {
          ...mockAtenciones[0],
          descripcion: longDesc,
        },
      ];
      const buffer = await generarExcel(atenciones);
      expect(buffer).toBeInstanceOf(Buffer);
    });

    it("should generate valid Excel for multiple records", async () => {
      const manyAtenciones = Array(100)
        .fill(null)
        .map((_, i) => ({
          ...mockAtenciones[0],
          id: `ate-${String(i).padStart(4, "0")}`,
        }));

      const buffer = await generarExcel(manyAtenciones);
      expect(buffer).toBeInstanceOf(Buffer);
    });

    it("should generate Excel with proper structure", async () => {
      const buffer = await generarExcel(mockAtenciones);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe("export functions", () => {
    it("PDF and Excel should generate different outputs", async () => {
      const pdf = await generarPDF(mockAtenciones);
      const excel = await generarExcel(mockAtenciones);

      expect(pdf).not.toEqual(excel);
      expect(pdf.length).not.toBe(excel.length);
    });

    it("should handle special characters in descriptions", async () => {
      const specialAtenciones: AtencionDto[] = [
        {
          ...mockAtenciones[0],
          descripcion: "Implementación con caracteres: ñ, á, é, í, ó, ú",
        },
      ];

      const pdf = await generarPDF(specialAtenciones);
      const excel = await generarExcel(specialAtenciones);

      expect(pdf).toBeInstanceOf(Buffer);
      expect(excel).toBeInstanceOf(Buffer);
    });
  });
});
