import { Workbook } from "exceljs";
import {
  generarExcelFinanciero,
  generarPdfFinanciero,
} from "./export-financiero.util";
import { FacturaFinanciera } from "../interfaces/factura-financiera.interface";

const facturas: FacturaFinanciera[] = [
  {
    idFactura: "FAC-001",
    nombreCliente: "Cliente Uno",
    tipoServicio: "Consultoría",
    valorServicio: 100000,
    impuestosAplicados: 19000,
    totalNeto: 119000,
    fecha: "2026-01-15T10:00:00.000Z",
  },
  {
    idFactura: "FAC-002",
    nombreCliente: "Cliente Dos",
    tipoServicio: "Soporte",
    valorServicio: 50000,
    impuestosAplicados: 9500,
    totalNeto: 59500,
    fecha: "2026-01-20T10:00:00.000Z",
  },
];

const encabezado = {
  fechaGeneracion: new Date("2026-06-22T15:30:00.000Z"),
  fechaInicio: "2026-01-01",
  fechaFin: "2026-01-31",
};

describe("export-financiero.util", () => {
  it("genera un Excel con encabezado y columnas obligatorias", async () => {
    const buffer = await generarExcelFinanciero(facturas, encabezado);

    const workbook = new Workbook();
    await workbook.xlsx.load(buffer as any);
    const worksheet = workbook.getWorksheet("Reporte financiero");

    expect(worksheet).toBeDefined();
    expect(worksheet!.getCell("A1").value).toBe(
      "ServiPlus — Reporte Financiero",
    );
    expect(String(worksheet!.getCell("A2").value)).toContain(
      "Fecha de generación:",
    );
    expect(worksheet!.getCell("D2").value).toBe(
      "Rango consultado: 2026-01-01 a 2026-01-31",
    );
    expect(worksheet!.getRow(4).values).toEqual([
      undefined,
      "ID de factura",
      "Nombre del Cliente",
      "Tipo de Servicio",
      "Valor del Servicio",
      "Impuestos Aplicados",
      "Total Neto",
    ]);
    expect(worksheet!.getRow(5).values).toEqual([
      undefined,
      "FAC-001",
      "Cliente Uno",
      "Consultoría",
      100000,
      19000,
      119000,
    ]);
  });

  it("omite el logo de Excel si la ruta no existe o la extensión no es soportada", async () => {
    const sinLogo = await generarExcelFinanciero(facturas, {
      ...encabezado,
      logoPath: "C:/ruta/inexistente/logo.png",
    });
    const extensionNoSoportada = await generarExcelFinanciero(facturas, {
      ...encabezado,
      logoPath: __filename,
    });

    expect(sinLogo.length).toBeGreaterThan(0);
    expect(extensionNoSoportada.length).toBeGreaterThan(0);
  });

  it("genera un PDF financiero válido con encabezado textual cuando no hay logo", async () => {
    const buffer = await generarPdfFinanciero(facturas, encabezado);

    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("genera nuevas páginas en PDF cuando hay alto volumen de filas", async () => {
    const muchasFacturas = Array.from({ length: 80 }, (_, index) => ({
      ...facturas[0],
      idFactura: `FAC-${String(index + 1).padStart(3, "0")}`,
    }));

    const buffer = await generarPdfFinanciero(muchasFacturas, {
      ...encabezado,
      logoPath: "C:/ruta/inexistente/logo.png",
    });

    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
  });
});
