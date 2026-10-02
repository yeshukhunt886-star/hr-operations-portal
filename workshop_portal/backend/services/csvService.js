import fs from "fs";
import csvParser from "csv-parser";


//   Read CSV file and convert it to JSON
//   @param {string} filePath
//  @returns {Promise<Array>}
 
export const parseCSV = (filePath) => {
    return new Promise((resolve, reject) => {
        const results = [];

        fs.createReadStream(filePath)
            .pipe(csvParser())
            .on("data", (row) => {
                results.push({
                    workshop_id: row.workshop_id || "",
                    full_name: row.full_name || "",
                    email: row.email || "",
                    phone: row.phone || "",
                    organization: row.organization || "",
                    designation: row.designation || "",
                    attendance_status:
                        row.attendance_status || "registered",
                });
            })
            .on("end", () => {
                resolve(results);
            })
            .on("error", (error) => {
                reject(error);
            });
    });
};

// Delete uploaded CSV after processing
//  @param {string} filePath
export const deleteCSV = (filePath) => {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
};