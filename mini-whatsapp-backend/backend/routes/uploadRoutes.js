const express = require("express");

const multer = require("multer");

const path = require("path");

const fs = require("fs");

const router = express.Router();


// CREATE UPLOAD FOLDERS
const imageDir =path.join( __dirname,"../uploads/images");
const videoDir = path.join(__dirname,"../uploads/videos");
const fileDir =path.join(__dirname,"../uploads/files");


if (!fs.existsSync(imageDir)) {
    fs.mkdirSync(
        imageDir,
        {recursive: true}
    );
}

if (!fs.existsSync(videoDir)) {
    fs.mkdirSync(
        videoDir,
        {recursive: true}
    );
}

if (!fs.existsSync(fileDir)) {
    fs.mkdirSync(
        fileDir,
        {recursive: true}
    );
}

// IMAGE STORAGE
const imageStorage =multer.diskStorage({
        destination:
            function (req,file,cb) {
                cb(null,imageDir);
            },
        filename:
            function (req,file,cb) {
                const ext =path.extname(file.originalname);
                const filename = Date.now() +ext;
                cb(null,filename);
            }
});

const uploadImage =multer({storage:imageStorage});

// VIDEO STORAGE
const videoStorage =multer.diskStorage({
        destination:function (req,file,cb) {
                cb(null, videoDir);
        },

        filename:function (req,file,cb) {
                const ext =path.extname(file.originalname);
                const filename =Date.now() +ext;
                cb(null,filename);

        }
});
const uploadVideo = multer({storage:videoStorage});

// FILE STORAGE
const fileStorage = multer.diskStorage({
        destination:function (req,file,cb) {
                cb(null,fileDir);
        },

        filename:function (req,file,cb) {
                const ext = path.extname(file.originalname);
                const filename = Date.now() +ext;
                cb(null,filename);
        }
});
const uploadFile =multer({storage:fileStorage});

// IMAGE API
// POST /api/upload/image
router.post("/image",uploadImage.single("file"),(req, res) => {
        console.log("Image:",req.file);
        if (!req.file) {
            return res.status(400).json({ message: "No image uploaded" });
        }
        res.json({success:true,
            file: {
                originalname:req.file.originalname,
                filename:req.file.filename,
                mimetype:req.file.mimetype,
                url:"/uploads/images/" +req.file.filename
            }
        });
    }
);

// VIDEO API
// POST /api/upload/video
router.post("/video",uploadVideo.single("file"),(req, res) => {

        console.log("Video:",req.file );

        if (!req.file) {
            return res.status(400).json({message:"No video uploaded" });
        }

        res.json({success:true,
            file: {
                originalname:req.file.originalname,
                filename:req.file.filename,
                mimetype: req.file.mimetype,
                url:"/uploads/videos/" +req.file.filename
            }
        });
    }
);

// GENERAL FILE API
// POST /api/upload/file

router.post("/file",uploadFile.single("file"),(req, res) => {
        console.log("File:",req.file);

        if (!req.file) {
            return res
                .status(400)
                .json({ message:"No file uploaded" });
        }

        res.json({success:true,
            file: {
                originalname:req.file.originalname,
                filename:req.file.filename,
                mimetype:req.file.mimetype,
                url:"/uploads/files/" +req.file.filename
            }
        });
    }
);

module.exports =router;