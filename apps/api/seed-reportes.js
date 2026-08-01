// seed-reportes.js - Run with: node seed-reportes.js
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding reportes...");

  // Clear existing
  await prisma.descarga.deleteMany();
  await prisma.reporte.deleteMany();

  const reportes = [
    {
      nombre: "Registro de Ventas",
      descripcion: "Reporte detallado de todas las ventas realizadas en el período seleccionado",
      icon: "BarChart3",
      descargas: {
        create: [
          { tipo: "PDF", label: "Descargar PDF", endpoint: "/reports-sales/pdf" },
          { tipo: "Excel", label: "Descargar Excel", endpoint: "/reports-sales/excel" },
        ],
      },
    },
    {
      nombre: "Resumen Financiero",
      descripcion: "Resumen de ingresos, gastos y flujo de caja del período",
      icon: "TrendingUp",
      descargas: {
        create: [
          { tipo: "PDF", label: "Descargar PDF", endpoint: "/reports-sales/resumen-pdf" },
          { tipo: "Excel", label: "Descargar Excel", endpoint: "/reports-sales/resumen-excel" },
        ],
      },
    },
    {
      nombre: "Cuentas por Cobrar",
      descripcion: "Listado de facturas pendientes y estado de cartera de clientes",
      icon: "FileText",
      descargas: {
        create: [
          { tipo: "PDF", label: "Descargar PDF", endpoint: "/reports-sales/cartera-pdf" },
          { tipo: "Excel", label: "Descargar Excel", endpoint: "/reports-sales/cartera-excel" },
        ],
      },
    },
    {
      nombre: "Inventario de Productos",
      descripcion: "Estado actual del inventario con cantidades disponibles y valorización",
      icon: "PieChart",
      descargas: {
        create: [
          { tipo: "Excel", label: "Descargar Excel", endpoint: "/reports-sales/inventario-excel" },
        ],
      },
    },
  ];

  for (const reporte of reportes) {
    const created = await prisma.reporte.create({ data: reporte, include: { descargas: true } });
    console.log(`✅ Creado: ${created.nombre} (${created.descargas.length} descargas)`);
  }

  console.log("✅ Seed completado exitosamente.");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
