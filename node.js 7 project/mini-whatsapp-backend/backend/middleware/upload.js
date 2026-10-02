import multer from "multer";
import path from "path";
import fs from "fs";

// ==========================================
// UPLOAD DIRECTORY
// ==========================================

const uploadDir = path.join(process.cwd(), "uploads");

// Create uploads folder if it doesn't exist
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, {
        recursive: true,
    });
}

// ==========================================
// MULTER STORAGE
// ==========================================

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },

    filename: (req, file, cb) => {
        const extension = path.extname(
            file.originalname
        );

        const uniqueName =
            Date.now() +
            "-" +
            Math.round(Math.random() * 1e9) +
            extension;

        cb(null, uniqueName);
    },
});

// ==========================================
// MULTER CONFIGURATION
// ==========================================

const upload = multer({
    storage,

    limits: {
        fileSize: 100 * 1024 * 1024, // 100 MB
    },

    fileFilter: (req, file, cb) => {
        console.log(
            "========== MULTER FILE =========="
        );

        console.log(
            "Original Name:",
            file.originalname
        );

        console.log(
            "MIME Type:",
            file.mimetype
        );

        console.log(
            "Field Name:",
            file.fieldname
        );

        console.log(
            "=================================="
        );

        cb(null, true);
    },
});

export default upload;