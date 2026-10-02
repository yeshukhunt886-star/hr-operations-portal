import db from "../config/db.js";

export const getDashboard = async (req, res) => {
  try {
    // Total Workshops
    const [workshops] = await db.query(
      "SELECT COUNT(*) AS totalWorkshops FROM workshops"
    );

    // Total Participants
    const [participants] = await db.query(
      "SELECT COUNT(*) AS totalParticipants FROM participants"
    );

    // Checked In
    const [checkedIn] = await db.query(
      "SELECT COUNT(*) AS checkedIn FROM participants WHERE attendance_status = 'checked_in'"
    );

    // Pending
    const [pending] = await db.query(
      "SELECT COUNT(*) AS pending FROM participants WHERE attendance_status = 'registered'"
    );

    res.status(200).json({
      totalWorkshops: workshops[0].totalWorkshops,
      totalParticipants: participants[0].totalParticipants,
      checkedIn: checkedIn[0].checkedIn,
      pending: pending[0].pending,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Dashboard Error",
    });
  }
};