-- AlterTable
ALTER TABLE "AIIntegrationSettings" ADD COLUMN     "chatEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "eventPrompts" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "systemPrompt" TEXT;
