import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDirectory = path.resolve(
    process.cwd(),
    "uploads",
    "bulk-imports"
);

fs.mkdirSync(uploadDirectory, {
    recursive: true
});

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDirectory);
    },

    filename: (_req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();

        const safeName = `bulk-import-${Date.now()}-${Math.round(
            Math.random() * 1000000
        )}${extension}`;

        cb(null, safeName);
    }
});

const fileFilter = (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();

    if (extension !== ".csv") {
        return cb(new Error("Only CSV files are allowed"));
    }

    cb(null, true);
};

export const bulkImportUpload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 1024 * 1024 * 1024
    }
});