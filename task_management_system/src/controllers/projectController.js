import pool from "../config/db.js";

export const getProjects = async (req, res) => {
  const [data] = await pool.query(
    "SELECT * FROM projects WHERE user_id=?",
    [req.user.id]
  );
  res.json(data);
};

export const createProject = async (req, res) => {
  const { title } = req.body;

  await pool.query(
    "INSERT INTO projects (title, user_id) VALUES (?,?)",
    [title, req.user.id]
  );

  res.json({ message: "Project created" });
};

export const getProjectById = async (req, res) => {
  const [data] = await pool.query(
    "SELECT * FROM projects WHERE id=? AND user_id=?",
    [req.params.id, req.user.id]
  );

  res.json(data[0]);
};

export const updateProject = async (req, res) => {
  await pool.query(
    "UPDATE projects SET title=? WHERE id=? AND user_id=?",
    [req.body.title, req.params.id, req.user.id]
  );

  res.json({ message: "Updated" });
};

export const deleteProject = async (req, res) => {
  await pool.query(
    "DELETE FROM projects WHERE id=? AND user_id=?",
    [req.params.id, req.user.id]
  );

  res.json({ message: "Deleted" });
};