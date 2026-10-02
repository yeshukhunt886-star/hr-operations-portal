const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadRoot = path.join(__dirname, "..", "uploads");
const imageDir = path.join(uploadRoot, "images");
const videoDir = path.join(uploadRoot, "videos");
const documentDir = path.join(uploadRoot, "documents");

[imageDir, videoDir, documentDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

const storage = multer.diskStorage({

    destination: (req, file, cb) => {

        if (file.mimetype.startsWith("image")) {
            cb(null, imageDir);
        }
        else if (file.mimetype.startsWith("video")) {
            cb(null, videoDir);
        }
        else {
            cb(null, documentDir);
        }

    },

    filename: (req, file, cb) => {

        cb(
            null,
            Date.now() + path.extname(file.originalname)
        );

    }

});

const upload = multer({
    storage: storage
});

module.exports = upload;