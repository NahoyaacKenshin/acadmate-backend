-- CreateTable
CREATE TABLE "ExamWeek" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ExamWeek_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExamWeek_userId_idx" ON "ExamWeek"("userId");

-- AddForeignKey
ALTER TABLE "ExamWeek" ADD CONSTRAINT "ExamWeek_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
