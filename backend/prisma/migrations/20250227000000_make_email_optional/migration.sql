-- AlterTable: 将email字段改为可选
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
