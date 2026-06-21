-- CreateIndex
CREATE INDEX "trades_date_idx" ON "trades"("date");

-- CreateIndex
CREATE INDEX "trades_pair_idx" ON "trades"("pair");

-- CreateIndex
CREATE INDEX "trades_outcome_idx" ON "trades"("outcome");
