const multer = require("multer");
const path = require("path");
const fs = require("fs");


const imagePath = path.join(
    __dirname,
    "../uploads/images"
);

const videoPath = path.join(
    __dirname,
    "../uploads/videos"
);

const documentPath = path.join(
    __dirname,
    "../uploads/documents"
);


// Create folders

fs.mkdirSync(
    imagePath,
    {
        recursive: true
    }
);

fs.mkdirSync(
    videoPath,
    {
        recursive: true
    }
);

fs.mkdirSync(
    documentPath,
    {
        recursive: true
    }
);


const storage = multer.diskStorage({

    destination: function (
        req,
        file,
        cb
    ) {

        // IMAGE

        if (
            file.mimetype.startsWith("image/")
        ) {

            cb(
                null,
                imagePath
            );

            return;
        }


        // VIDEO

        if (
            file.mimetype.startsWith("video/")
        ) {

            cb(
                null,
                videoPath
            );

            return;
        }


        // DOCUMENT

        cb(
            null,
            documentPath
        );

    },


    filename: function (
        req,
        file,
        cb
    ) {

        const uniqueName =
            Date.now() +
            "-" +
            Math.round(
                Math.random() * 1E9
            ) +
            path.extname(
                file.originalname
            );


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


    // IMAGE

    if (
        file.mimetype.startsWith("image/")
    ) {

        return cb(
            null,
            true
        );

    }


    // VIDEO

    if (
        file.mimetype.startsWith("video/")
    ) {

        return cb(
            null,
            true
        );

    }


    // DOCUMENT

    const allowedDocuments = [

        "application/pdf",

        "application/msword",

        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

        "text/plain",

        "application/vnd.ms-excel",

        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    ];


    if (
        allowedDocuments.includes(
            file.mimetype
        )
    ) {

        return cb(
            null,
            true
        );

    }


    return cb(
        new Error(
            "File type not supported"
        )
    );

};


const upload = multer({

    storage: storage,

    fileFilter: fileFilter,

    limits: {

        fileSize:
            50 * 1024 * 1024

    }

});


module.exports = upload;