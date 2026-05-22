-- AlterTable
ALTER TABLE "communities" ADD COLUMN     "image" TEXT;

-- AlterTable
ALTER TABLE "trades" ADD COLUMN     "checklist_passed" BOOLEAN,
ADD COLUMN     "emotion" VARCHAR(50),
ADD COLUMN     "followed_plan" BOOLEAN,
ADD COLUMN     "plan_deviation_reason" TEXT;

-- CreateTable
CREATE TABLE "checklist_templates" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "questions" JSONB NOT NULL,
    "blocking_questions" JSONB NOT NULL,
    "pass_threshold" INTEGER NOT NULL DEFAULT 100,
    "override_allowed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklist_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trading_plans" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "market" VARCHAR(50) NOT NULL,
    "pairs" JSONB NOT NULL,
    "timeframe" VARCHAR(50) NOT NULL,
    "strategy_type" VARCHAR(50) NOT NULL,
    "session" VARCHAR(50) NOT NULL,
    "account_size" DECIMAL(15,2) NOT NULL,
    "risk_per_trade" DECIMAL(5,2) NOT NULL,
    "daily_loss_limit" DECIMAL(5,2) NOT NULL,
    "goal" TEXT NOT NULL,
    "plan_sections" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trading_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "checklist_templates_user_id_key" ON "checklist_templates"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "trading_plans_user_id_key" ON "trading_plans"("user_id");
