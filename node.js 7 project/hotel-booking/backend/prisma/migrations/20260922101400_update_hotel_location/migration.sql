/*
  Warnings:

  - You are about to drop the column `location` on the `hotel` table. All the data in the column will be lost.
  - Added the required column `address` to the `Hotel` table without a default value. This is not possible if the table is not empty.
  - Added the required column `city` to the `Hotel` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `hotel` DROP COLUMN `location`,
    ADD COLUMN `address` VARCHAR(191) NOT NULL,
    ADD COLUMN `city` VARCHAR(191) NOT NULL;
