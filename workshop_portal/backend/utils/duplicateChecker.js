import db from "../config/db.js";


//   Check if a participant already exists
//   Duplicate is checked by:
//  1. Email + Workshop
//  2. Phone + Workshop
 
export const checkDuplicateParticipant = async (
    workshopId,
    email,
    phone
) => {
    try {
        const [rows] = await db.execute(
            `
            SELECT id
            FROM participants
            WHERE workshop_id = ?
              AND (email = ? OR phone = ?)
            LIMIT 1
            `,
            [workshopId, email, phone]
        );

        return rows.length > 0;
    } catch (error) {
        throw error;
    }
};


//  Remove duplicate records inside the uploaded CSV itself.
//  Keeps only the first occurrence of each email/phone per workshop.
 
export const removeCSVDuplicates = (participants) => {
    const emailSet = new Set();
    const phoneSet = new Set();

    return participants.filter((participant) => {
        const workshopId = participant.workshop_id;

        const emailKey = `${workshopId}-${participant.email
            ?.trim()
            .toLowerCase()}`;

        const phoneKey = `${workshopId}-${participant.phone?.trim()}`;

        if (emailSet.has(emailKey) || phoneSet.has(phoneKey)) {
            return false;
        }

        emailSet.add(emailKey);
        phoneSet.add(phoneKey);

        return true;
    });
};