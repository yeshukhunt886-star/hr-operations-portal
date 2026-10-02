import multer from "multer";
import path from "path";
import fs from "fs";

/* =========================================================
   UPLOAD DIRECTORY
========================================================= */

const uploadDir = path.join(
    process.cwd(),
    "uploads",
    "workshops"
);

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, {
        recursive: true
    });
}


/* =========================================================
   STORAGE
========================================================= */

const storage = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },

    filename: (req, file, cb) => {

        const ext = path.extname(file.originalname);

        const fileName =
            `workshop-${Date.now()}-${Math.round(
                Math.random() * 1e9
            )}${ext}`;

        cb(null, fileName);
    }

});


/* =========================================================
   FILE VALIDATION
========================================================= */

const fileFilter = (req, file, cb) => {

    const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp"
    ];

    if (!allowedTypes.includes(file.mimetype)) {

        return cb(
            new Error(
                "Only JPG, JPEG, PNG and WEBP images are allowed"
            ),
            false
        );
    }

    cb(null, true);
};


/* =========================================================
   MULTER
========================================================= */

const workshopUpload = multer({

    storage,

    fileFilter,

    limits: {
        fileSize: 5 * 1024 * 1024
    }

});


export default workshopUpload;