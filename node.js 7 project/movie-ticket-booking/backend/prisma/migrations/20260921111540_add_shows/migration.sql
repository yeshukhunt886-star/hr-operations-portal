/*
  Warnings:

  - You are about to drop the column `location` on the `theatre` table. All the data in the column will be lost.
  - Added the required column `address` to the `Theatre` table without a default value. This is not possible if the table is not empty.
  - Added the required column `city` to the `Theatre` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `screen` DROP FOREIGN KEY `Screen_theatreId_fkey`;

-- DropIndex
DROP INDEX `Screen_theatreId_fkey` ON `screen`;

-- AlterTable
ALTER TABLE `screen` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `theatre` DROP COLUMN `location`,
    ADD COLUMN `address` VARCHAR(191) NOT NULL,
    ADD COLUMN `city` VARCHAR(191) NOT NULL,
    ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE `Show` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `movieId` INTEGER NOT NULL,
    `theatreId` INTEGER NOT NULL,
    `screenId` INTEGER NOT NULL,
    `showDate` DATETIME(3) NOT NULL,
    `startTime` DATETIME(3) NOT NULL,
    `ticketPrice` DECIMAL(10, 2) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Show_movieId_idx`(`movieId`),
    INDEX `Show_theatreId_idx`(`theatreId`),
    INDEX `Show_screenId_idx`(`screenId`),
    INDEX `Show_showDate_idx`(`showDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Screen` ADD CONSTRAINT `Screen_theatreId_fkey` FOREIGN KEY (`theatreId`) REFERENCES `Theatre`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Show` ADD CONSTRAINT `Show_movieId_fkey` FOREIGN KEY (`movieId`) REFERENCES `Movie`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Show` ADD CONSTRAINT `Show_theatreId_fkey` FOREIGN KEY (`theatreId`) REFERENCES `Theatre`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Show` ADD CONSTRAINT `Show_screenId_fkey` FOREIGN KEY (`screenId`) REFERENCES `Screen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
