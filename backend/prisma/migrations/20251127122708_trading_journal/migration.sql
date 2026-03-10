-- CreateTable
CREATE TABLE "trades" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "pair" VARCHAR(20) NOT NULL,
    "strategy" VARCHAR(50) NOT NULL,
    "setup_type" VARCHAR(50) NOT NULL,
    "entry" DECIMAL(12,5) NOT NULL,
    "sl" DECIMAL(12,5) NOT NULL,
    "tp" DECIMAL(12,5) NOT NULL,
    "rr" VARCHAR(10) NOT NULL,
    "outcome" VARCHAR(10) NOT NULL,
    "notes" TEXT,
    "image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" SERIAL NOT NULL,
    "broker_name" VARCHAR(50) NOT NULL,
    "account_number" VARCHAR(50) NOT NULL,
    "api_key" TEXT,
    "api_secret" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profit_loss" (
    "id" SERIAL NOT NULL,
    "trade_id" INTEGER NOT NULL,
    "profit" DECIMAL(12,2) NOT NULL,
    "loss" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "profit_loss_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profit_loss_trade_id_key" ON "profit_loss"("trade_id");

-- AddForeignKey
ALTER TABLE "profit_loss" ADD CONSTRAINT "profit_loss_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "trades"("id") ON DELETE CASCADE ON UPDATE CASCADE;
