/*
  Warnings:

  - Added the required column `config` to the `Provider` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Provider" ADD COLUMN     "config" JSONB NOT NULL;
