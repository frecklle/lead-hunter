-- CreateTable
CREATE TABLE "searches" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "krs" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nip" TEXT,
    "revenue" DOUBLE PRECISION,
    "employees" INTEGER,
    "pkd" TEXT,
    "city" TEXT,
    "voivodeship" TEXT,
    "score" INTEGER,
    "searchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_krs_key" ON "companies"("krs");

-- CreateIndex
CREATE INDEX "companies_searchId_idx" ON "companies"("searchId");

-- CreateIndex
CREATE INDEX "companies_score_idx" ON "companies"("score");

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "searches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
