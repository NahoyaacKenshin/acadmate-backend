-- CreateEnum
CREATE TYPE "StudentSet" AS ENUM ('A', 'B');

-- CreateEnum
CREATE TYPE "SemesterRuleType" AS ENUM ('SATURDAY_SET_A', 'SATURDAY_SET_B');

-- CreateTable
CREATE TABLE "SemesterRule" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "ruleType" "SemesterRuleType" NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SemesterRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramMapping" (
    "id" TEXT NOT NULL,
    "programName" TEXT NOT NULL,
    "studentSet" "StudentSet" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SemesterRule_date_idx" ON "SemesterRule"("date");

-- CreateIndex
CREATE UNIQUE INDEX "SemesterRule_date_ruleType_key" ON "SemesterRule"("date", "ruleType");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramMapping_programName_key" ON "ProgramMapping"("programName");
