/*
  Warnings:

  - Added the required column `user_id` to the `accounts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `csv_imports` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `trades` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "bridge_url" VARCHAR(500),
ADD COLUMN     "user_id" VARCHAR(255) NOT NULL;

-- AlterTable
ALTER TABLE "csv_imports" ADD COLUMN     "user_id" VARCHAR(255) NOT NULL;

-- AlterTable
ALTER TABLE "trades" ADD COLUMN     "user_id" VARCHAR(255) NOT NULL;

-- CreateIndex
CREATE INDEX "accounts_user_id_idx" ON "accounts"("user_id");

-- CreateIndex
CREATE INDEX "csv_imports_user_id_idx" ON "csv_imports"("user_id");

-- CreateIndex
CREATE INDEX "trades_user_id_idx" ON "trades"("user_id");

-- CreateIndex
CREATE INDEX "trades_user_id_date_idx" ON "trades"("user_id", "date");
