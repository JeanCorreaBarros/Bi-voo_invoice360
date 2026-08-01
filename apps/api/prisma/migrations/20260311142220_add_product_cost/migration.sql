-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "cost" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CreditNoteDetail" (
    "id" SERIAL NOT NULL,
    "creditNoteId" INTEGER NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CreditNoteDetail_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CreditNoteDetail" ADD CONSTRAINT "CreditNoteDetail_creditNoteId_fkey" FOREIGN KEY ("creditNoteId") REFERENCES "CreditNote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
