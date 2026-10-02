import { prisma } from "../prisma.js";

export async function writeAudit(tx, { actorUserId, action, entityType, entityId, metadata }) {
  const client = tx || prisma;
  await client.auditLog.create({
    data: { actorUserId: actorUserId || null, action, entityType, entityId, metadata: metadata || undefined }
  });
}
