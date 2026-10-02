import multer from "multer";
import path from "path";
import fs from "fs";

const uploadPath = "uploads/banners";
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, {
        recursive: true
    });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(
            null,
            uploadPath
        );
    },

    filename: (req, file, cb) => {
        const uniqueName =
            Date.now() +
            "-" +
            Math.round(
                Math.random() * 1E9
            ) +
            path.extname(file.originalname);
        cb(
            null,
            uniqueName
        );
    }
});

const fileFilter = (
    req,
    file,
    cb
) => {
    const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png"
    ];

    if (
        allowedTypes.includes(file.mimetype)
    ) {
        cb(null,true);
    } else {
        cb(
            new Error("Only JPG, JPEG and PNG images are allowed."),
            false
       );
    }
};

const upload = multer({
    storage,
    limits: {
        fileSize:
            5 * 1024 * 1024

    },
    fileFilter
});
export default upload;