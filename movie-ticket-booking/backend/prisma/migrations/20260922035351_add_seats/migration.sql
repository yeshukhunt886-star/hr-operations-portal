-- CreateTable
CREATE TABLE `Seat` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `screenId` INTEGER NOT NULL,
    `row` VARCHAR(191) NOT NULL,
    `number` INTEGER NOT NULL,
    `seatLabel` VARCHAR(191) NOT NULL,
    `seatType` ENUM('REGULAR', 'PREMIUM', 'RECLINER') NOT NULL DEFAULT 'REGULAR',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Seat_screenId_idx`(`screenId`),
    UNIQUE INDEX `Seat_screenId_seatLabel_key`(`screenId`, `seatLabel`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Seat` ADD CONSTRAINT `Seat_screenId_fkey` FOREIGN KEY (`screenId`) REFERENCES `Screen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
