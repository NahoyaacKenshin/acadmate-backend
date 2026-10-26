-- DropForeignKey
ALTER TABLE IF EXISTS "SemesterRule" DROP CONSTRAINT IF EXISTS "SemesterRule_userId_fkey";

-- DropTable
DROP TABLE IF EXISTS "SemesterRule";

-- DropTable
DROP TABLE IF EXISTS "ProgramMapping";

-- DropEnum
DROP TYPE IF EXISTS "SemesterRuleType";

-- DropEnum
DROP TYPE IF EXISTS "StudentSet";
