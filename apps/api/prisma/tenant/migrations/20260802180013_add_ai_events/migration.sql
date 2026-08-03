-- AlterTable
ALTER TABLE "AIIntegrationSettings" ADD COLUMN     "enabledEvents" TEXT[] DEFAULT ARRAY[]::TEXT[];
