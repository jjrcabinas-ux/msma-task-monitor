-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "position" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "email" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "birthDate" TEXT,
ADD COLUMN     "contactNumber" TEXT NOT NULL DEFAULT '';
