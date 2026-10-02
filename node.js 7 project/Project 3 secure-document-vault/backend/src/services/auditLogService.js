import db from "../config/db.js";

/**
 * Create an audit log entry
 */
export const createAuditLog = async ({
  userId = null,
  action,
  entityType,
  entityId = null,
  details = null,
  ipAddress = null,
  userAgent = null,
}) => {
  const sql = `
    INSERT INTO audit_logs (
      user_id,
      action,
      entity_type,
      entity_id,
      details,
      ip_address,
      user_agent
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    userId,
    action,
    entityType,
    entityId,
    details ? JSON.stringify(details) : null,
    ipAddress,
    userAgent,
  ];

  const [result] = await db.execute(sql, values);

  return {
    id: result.insertId,
    userId,
    action,
    entityType,
    entityId,
  };
};

/**
 * Get audit logs
 */
export const getAuditLogs = async ({
  userId = null,
  action = null,
  entityType = null,
  entityId = null,
  limit = 100,
  offset = 0,
} = {}) => {
  let sql = `
    SELECT
      al.id,
      al.user_id,
      al.action,
      al.entity_type,
      al.entity_id,
      al.details,
      al.ip_address,
      al.user_agent,
      al.created_at,
      u.email AS user_email
    FROM audit_logs al
    LEFT JOIN users u ON u.id = al.user_id
    WHERE 1 = 1
  `;

  const params = [];

  if (userId !== null) {
    sql += ` AND al.user_id = ?`;
    params.push(userId);
  }

  if (action !== null) {
    sql += ` AND al.action = ?`;
    params.push(action);
  }

  if (entityType !== null) {
    sql += ` AND al.entity_type = ?`;
    params.push(entityType);
  }

  if (entityId !== null) {
    sql += ` AND al.entity_id = ?`;
    params.push(entityId);
  }

  sql += `
    ORDER BY al.created_at DESC
    LIMIT ? OFFSET ?
  `;

  params.push(Number(limit), Number(offset));

  const [rows] = await db.execute(sql, params);

  return rows.map((row) => ({
    ...row,
    details:
      typeof row.details === "string"
        ? (() => {
            try {
              return JSON.parse(row.details);
            } catch {
              return row.details;
            }
          })()
        : row.details,
  }));
};