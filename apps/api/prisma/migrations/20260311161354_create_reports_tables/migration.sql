-- CreateTable
CREATE TABLE "reportes" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reportes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reportes_descargas" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "reporteId" INTEGER NOT NULL,

    CONSTRAINT "reportes_descargas_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "reportes_descargas" ADD CONSTRAINT "reportes_descargas_reporteId_fkey" FOREIGN KEY ("reporteId") REFERENCES "reportes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
