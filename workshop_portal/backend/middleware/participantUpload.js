import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = "uploads/csv";

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({

    destination(req, file, cb) {
        cb(null, uploadDir);
    },

    filename(req, file, cb) {

        cb(
            null,
            Date.now() + path.extname(file.originalname)
        );

    }

});

const fileFilter = (req, file, cb) => {

    if (
        file.mimetype === "text/csv" ||
        file.originalname.endsWith(".csv")
    ) {

        cb(null, true);

    } else {

        cb(new Error("Only CSV allowed"));

    }

};

export default multer({

    storage,
    fileFilter

});