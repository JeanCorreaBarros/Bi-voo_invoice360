-- CreateTable
CREATE TABLE "AccountingSettings" (
    "id" SERIAL NOT NULL,
    "salesAccountId" TEXT,
    "salesTaxAccountId" TEXT,
    "accountsReceivableAccountId" TEXT,
    "inventoryAccountId" TEXT,
    "costOfSalesAccountId" TEXT,
    "accountsPayableAccountId" TEXT,
    "cashAccountId" TEXT,
    "bankAccountId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingSettings_pkey" PRIMARY KEY ("id")
);
