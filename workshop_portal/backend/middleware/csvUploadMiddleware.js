import multer from "multer";
import path from "path";
import fs from "fs";


const uploadPath = "uploads/csv";


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

        const uniqueName =
            Date.now() +
            "-" +
            Math.round(Math.random() * 1E9) +
            path.extname(file.originalname);

        cb(null, uniqueName);
    }

});


const fileFilter = (req, file, cb) => {

    console.log("Uploaded File:", file);


    if (
        file.originalname
            .toLowerCase()
            .endsWith(".csv")
    ) {

        cb(null, true);

    } else {

        cb(
            new Error("Only CSV files are allowed."),
            false
        );

    }

};


const uploadCSV = multer({

    storage,

    limits: {
        fileSize: 10 * 1024 * 1024 // 10 MB
    },

    fileFilter

});


export default uploadCSV;