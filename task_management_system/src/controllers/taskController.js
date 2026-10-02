import pool from "../config/db.js";

// GET TASKS (ONLY USER TASKS)
export const getTasks = async (req, res) => {
  const [data] = await pool.query(
    "SELECT * FROM tasks WHERE user_id=?",
    [req.user.id]
  );

  res.json(data);
};

// CREATE TASK
export const createTask = async (req, res) => {
  const { title, status, project_id } = req.body;

  await pool.query(
    "INSERT INTO tasks (title,status,project_id,user_id) VALUES (?,?,?,?)",
    [title, status, project_id, req.user.id]
  );

  res.json({ message: "Task created successfully" });
};

// GET SINGLE TASK
export const getTaskById = async (req, res) => {
  const [data] = await pool.query(
    "SELECT * FROM tasks WHERE id=? AND user_id=?",
    [req.params.id, req.user.id]
  );

  if (data.length === 0) {
    return res.status(404).json({ message: "Task not found" });
  }

  res.json(data[0]);
};

// UPDATE TASK
export const updateTask = async (req, res) => {
  await pool.query(
    "UPDATE tasks SET title=?, status=? WHERE id=? AND user_id=?",
    [req.body.title, req.body.status, req.params.id, req.user.id]
  );

  res.json({ message: "Task updated" });
};

// DELETE TASK
export const deleteTask = async (req, res) => {
  await pool.query(
    "DELETE FROM tasks WHERE id=? AND user_id=?",
    [req.params.id, req.user.id]
  );

  res.json({ message: "Task deleted" });
};

// UPDATE STATUS
export const updateTaskStatus = async (req, res) => {
  await pool.query(
    "UPDATE tasks SET status=? WHERE id=? AND user_id=?",
    [req.body.status, req.params.id, req.user.id]
  );

  res.json({ message: "Status updated" });
};

// ADD COMMENT
export const addComment = async (req, res) => {
  await pool.query(
    "INSERT INTO comments (task_id, comment) VALUES (?,?)",
    [req.params.id, req.body.comment]
  );

  res.json({ message: "Comment added" });
};