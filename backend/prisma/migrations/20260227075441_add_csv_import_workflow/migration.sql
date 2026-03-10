/*
  Warnings:

  - Added the required column `direction` to the `trades` table without a default value. This is not possible if the table is not empty.
  - Added the required column `profit` to the `trades` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "balance" DECIMAL(15,2),
ADD COLUMN     "equity" DECIMAL(15,2),
ADD COLUMN     "last_updated" TIMESTAMP(3),
ALTER COLUMN "broker_name" SET DATA TYPE VARCHAR(100);

-- AlterTable
ALTER TABLE "trades" ADD COLUMN     "broker_symbol" VARCHAR(20),
ADD COLUMN     "close_price" DECIMAL(12,5),
ADD COLUMN     "close_time" TIMESTAMP(3),
ADD COLUMN     "commission" DECIMAL(12,5),
ADD COLUMN     "csv_import_id" INTEGER,
ADD COLUMN     "direction" VARCHAR(10) NOT NULL,
ADD COLUMN     "lot_size" DECIMAL(12,5),
ADD COLUMN     "open_time" TIMESTAMP(3),
ADD COLUMN     "profit" DECIMAL(12,5) NOT NULL,
ADD COLUMN     "ticket" VARCHAR(50),
ALTER COLUMN "strategy" DROP NOT NULL,
ALTER COLUMN "setup_type" DROP NOT NULL,
ALTER COLUMN "sl" DROP NOT NULL,
ALTER COLUMN "tp" DROP NOT NULL,
ALTER COLUMN "rr" DROP NOT NULL,
ALTER COLUMN "outcome" SET DATA TYPE VARCHAR(20);

-- CreateTable
CREATE TABLE "csv_imports" (
    "id" SERIAL NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "broker_name" VARCHAR(100) NOT NULL,
    "account_number" VARCHAR(50),
    "total_trades" INTEGER NOT NULL,
    "success_count" INTEGER NOT NULL,
    "failure_count" INTEGER NOT NULL,
    "total_profit" DECIMAL(15,2) NOT NULL,
    "win_rate" DECIMAL(5,2) NOT NULL,
    "profit_factor" DECIMAL(8,2),
    "status" VARCHAR(20) NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "csv_imports_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_csv_import_id_fkey" FOREIGN KEY ("csv_import_id") REFERENCES "csv_imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
