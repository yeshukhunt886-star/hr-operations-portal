import pool from "../config/db.js";

export const getSummary = async (req, res) => {
  const [[tasks]] = await pool.query(
    "SELECT COUNT(*) as total FROM tasks WHERE user_id=?",
    [req.user.id]
  );

  const [[projects]] = await pool.query(
    "SELECT COUNT(*) as total FROM projects WHERE user_id=?",
    [req.user.id]
  );

  const [[completed]] = await pool.query(
    "SELECT COUNT(*) as total FROM tasks WHERE status='completed' AND user_id=?",
    [req.user.id]
  );

  res.json({
    totalTasks: tasks.total,
    totalProjects: projects.total,
    completedTasks: completed.total
  });
};