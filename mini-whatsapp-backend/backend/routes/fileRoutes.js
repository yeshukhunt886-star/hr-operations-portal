const express = require("express");

const router = express.Router();


// IMPORTANT:
// This must return the multer instance

const upload = require(
    "../middleware/uploadMiddleware"
);


const {
    uploadFile
} = require(
    "../controllers/fileController"
);


router.post(
    "/upload",

    upload.single("file"),

    uploadFile
);


module.exports = router;