import { body } from "express-validator";

export const participantValidation = [

    body("full_name")
        .notEmpty(),

    body("email")
        .isEmail(),

    body("phone")
        .isLength({
            min: 10,
            max: 10
        })

];