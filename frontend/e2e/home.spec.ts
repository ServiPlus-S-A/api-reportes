import { test, expect } from "@playwright/test";

const mockReporte = {
  id: "rep-e2e-001",
  periodo: "2026-05",
  tipo: "finanzas",
  totalIngresos: 15000,
  totalEgresos: 5000,
  balance: 10000,
  generadoPor: "Samuel",
  fechaCreacion: "2026-05-01T12:00:00.000Z",
  detalles: [
    {
      descripcion: "Venta servicio",
      tipo: "ingreso",
      fecha: "2026-05-10",
      monto: 15000,
    },
    {
      descripcion: "Gasto operativo",
      tipo: "egreso",
      fecha: "2026-05-15",
      monto: 5000,
    },
  ],
};

test.beforeEach(async ({ page }) => {
  await page.route("**/auth/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ token: "mock-jwt-token-e2e" }),
    });
  });

  await page.route("**/reportes/generar", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockReporte),
    });
  });
});

test("muestra la página principal y el estado vacío", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "ServiPlus Reportes Operativos" }),
  ).toBeVisible();
  await expect(
    page.getByText("Ningún reporte generado para este periodo"),
  ).toBeVisible();
});

test("valida el formato del periodo antes de llamar al API", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Obtener Token JWT" }).click();
  await expect(page.getByText(/^JWT:/)).toBeVisible();

  await page.getByPlaceholder("Ej: 2026-05").fill("2026-5");
  await page.getByRole("button", { name: "Generar Reporte" }).click();

  await expect(
    page.getByText("Formato de periodo inválido. Debe ser YYYY-MM."),
  ).toBeVisible();
});

test("flujo login y generación de reporte con API simulada", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Obtener Token JWT" }).click();
  await expect(page.getByText(/^JWT:/)).toBeVisible();

  await page.getByRole("button", { name: "Generar Reporte" }).click();

  await expect(
    page.getByText("Reporte generado exitosamente y cargado desde el microservicio."),
  ).toBeVisible();
  await expect(page.getByText("Total Ingresos")).toBeVisible();
  await expect(page.getByText("Venta servicio")).toBeVisible();
  await expect(page.getByText(/\$15[.,]000/)).toHaveCount(2);
});
