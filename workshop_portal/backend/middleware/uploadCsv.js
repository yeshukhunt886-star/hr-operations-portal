import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// backend/uploads/csv
const uploadPath = path.join(
    __dirname,
    "../uploads/csv"
);


if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, {
        recursive: true
    });
}


const storage = multer.diskStorage({

    destination: (req, file, cb) => {

        cb(null, uploadPath);

    },


    filename: (req, file, cb) => {

        const filename =
            `${Date.now()}-${file.originalname}`;

        console.log("Saving filename:", filename);

        cb(null, filename);

    }

});


const fileFilter = (req, file, cb) => {

    console.log("Uploaded CSV File:", file);


    if (
        file.originalname
            .toLowerCase()
            .endsWith(".csv")
    ) {

        cb(null, true);

    } else {

        cb(
            new Error("Only CSV files allowed"),
            false
        );

    }

};


const uploadCSV = multer({

    storage,

    limits: {
        fileSize: 10 * 1024 * 1024
    },

    fileFilter

});


export default uploadCSV;