const uploadFile = async (
    req,
    res
) => {

    try {

        // Check file

        if (!req.file) {

            return res.status(400).json({

                success: false,
                message:"No file uploaded"
            });
        }


        const file =req.file;
        let messageType ="document";
        let folder ="documents";


        if (
            file.mimetype.startsWith("image/")
        ) {
            messageType ="image";
            folder ="images";
        }

        else if (
            file.mimetype.startsWith("video/")
        ) {
            messageType ="video";
            folder ="videos";
        }


        const fileUrl =`/uploads/${folder}/${file.filename}`;

        console.log("File uploaded:",fileUrl);


        return res.status(200).json({

            success: true,
            message:"File uploaded successfully",

            file: {

                originalName:file.originalname,

                fileName:file.filename,

                fileType:file.mimetype,

                fileSize:file.size,

                messageType:messageType,

                fileUrl:fileUrl
            }
        });
    }

    catch (error) {

        console.error(
            "File Upload Error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "File upload failed",

            error:
                error.message

        });

    }

};


module.exports = {uploadFile};