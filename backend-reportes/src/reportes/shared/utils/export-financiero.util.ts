import { existsSync } from "fs";
import { extname } from "path";
import PDFDocument from "pdfkit";
import { Workbook } from "exceljs";
import { FacturaFinanciera } from "../interfaces/factura-financiera.interface";

interface EncabezadoFinanciero {
  fechaGeneracion: Date;
  fechaInicio: string;
  fechaFin: string;
  logoPath?: string;
}

const columnas = [
  "ID de factura",
  "Nombre del Cliente",
  "Tipo de Servicio",
  "Valor del Servicio",
  "Impuestos Aplicados",
  "Total Neto",
];

export async function generarExcelFinanciero(
  facturas: FacturaFinanciera[],
  encabezado: EncabezadoFinanciero,
): Promise<Buffer> {
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet("Reporte financiero", {
    views: [{ state: "frozen", ySplit: 5 }],
  });

  worksheet.mergeCells("A1:F1");
  const titulo = worksheet.getCell("A1");
  titulo.value = "ServiPlus — Reporte Financiero";
  titulo.font = { bold: true, size: 18, color: { argb: "FFFFFFFF" } };
  titulo.alignment = { horizontal: "center", vertical: "middle" };
  titulo.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF174A7E" },
  };
  worksheet.getRow(1).height = 36;

  agregarLogoExcel(workbook, worksheet, encabezado.logoPath);
  worksheet.mergeCells("A2:C2");
  worksheet.getCell("A2").value = `Fecha de generación: ${formatearFecha(
    encabezado.fechaGeneracion,
  )}`;
  worksheet.mergeCells("D2:F2");
  worksheet.getCell("D2").value = `Rango consultado: ${encabezado.fechaInicio} a ${encabezado.fechaFin}`;

  const filaEncabezados = worksheet.getRow(4);
  filaEncabezados.values = columnas;
  filaEncabezados.font = { bold: true, color: { argb: "FFFFFFFF" } };
  filaEncabezados.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2878B5" },
  };

  facturas.forEach((factura) => {
    worksheet.addRow([
      factura.idFactura,
      factura.nombreCliente,
      factura.tipoServicio,
      factura.valorServicio,
      factura.impuestosAplicados,
      factura.totalNeto,
    ]);
  });
  worksheet.columns = [
    { width: 18 },
    { width: 30 },
    { width: 26 },
    { width: 22 },
    { width: 22 },
    { width: 20 },
  ];
  [4, 5, 6].forEach((columna) => {
    worksheet.getColumn(columna).numFmt = '"$"#,##0.00';
  });
  worksheet.autoFilter = "A4:F4";

  return workbook.xlsx.writeBuffer() as unknown as Buffer;
}

export async function generarPdfFinanciero(
  facturas: FacturaFinanciera[],
  encabezado: EncabezadoFinanciero,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 28 });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      dibujarEncabezadoPdf(doc, encabezado);
      dibujarEncabezadosTablaPdf(doc);
      facturas.forEach((factura) => {
        if (doc.y > 540) {
          doc.addPage();
          dibujarEncabezadoPdf(doc, encabezado, true);
          dibujarEncabezadosTablaPdf(doc);
        }
        dibujarFilaPdf(doc, factura);
      });
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function agregarLogoExcel(workbook: Workbook, worksheet: any, logoPath?: string) {
  if (!logoPath || !existsSync(logoPath)) return;
  const extension = extname(logoPath).toLowerCase();
  if (extension !== ".png" && extension !== ".jpg" && extension !== ".jpeg") {
    return;
  }
  const imageId = workbook.addImage({
    filename: logoPath,
    extension: extension === ".png" ? "png" : "jpeg",
  });
  worksheet.addImage(imageId, { tl: { col: 0.1, row: 0.1 }, ext: { width: 95, height: 28 } });
}

function dibujarEncabezadoPdf(
  doc: any,
  encabezado: EncabezadoFinanciero,
  compacto = false,
) {
  const logoValido = encabezado.logoPath && existsSync(encabezado.logoPath);
  if (logoValido) {
    doc.image(encabezado.logoPath!, 30, 24, { fit: [100, 38] });
  } else {
    doc.font("Helvetica-Bold").fontSize(20).fillColor("#174A7E").text("ServiPlus", 30, 28);
  }
  doc
    .font("Helvetica-Bold")
    .fontSize(compacto ? 12 : 16)
    .fillColor("#111111")
    .text("Reporte Financiero", 150, 28, { align: "center", width: 500 });
  doc
    .font("Helvetica")
    .fontSize(9)
    .text(`Generado: ${formatearFecha(encabezado.fechaGeneracion)}`, 150, 50)
    .text(`Rango: ${encabezado.fechaInicio} a ${encabezado.fechaFin}`, 430, 50);
  doc.y = 78;
}

const posiciones = [30, 125, 280, 420, 525, 635];
const anchos = [90, 150, 135, 100, 105, 100];

function dibujarEncabezadosTablaPdf(doc: any) {
  const y = doc.y;
  doc.rect(28, y - 3, 757, 23).fill("#2878B5");
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(8);
  columnas.forEach((columna, index) =>
    doc.text(columna, posiciones[index], y + 3, { width: anchos[index] }),
  );
  doc.fillColor("#111111");
  doc.y = y + 24;
}

function dibujarFilaPdf(doc: any, factura: FacturaFinanciera) {
  const y = doc.y;
  const valores = [
    factura.idFactura,
    factura.nombreCliente,
    factura.tipoServicio,
    formatearMoneda(factura.valorServicio),
    formatearMoneda(factura.impuestosAplicados),
    formatearMoneda(factura.totalNeto),
  ];
  doc.font("Helvetica").fontSize(8);
  valores.forEach((valor, index) =>
    doc.text(String(valor), posiciones[index], y, {
      width: anchos[index],
      ellipsis: true,
      lineBreak: false,
    }),
  );
  doc.moveTo(28, y + 15).lineTo(785, y + 15).strokeColor("#DDDDDD").stroke();
  doc.y = y + 19;
}

function formatearFecha(fecha: Date): string {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(fecha);
}

function formatearMoneda(valor: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
  }).format(valor);
}
