export async function lockEmployee(tx, employeeId) {
  const url = process.env.DATABASE_URL || "";
  if (url.startsWith("postgres")) {
    await tx.$queryRaw`SELECT id FROM "Employee" WHERE id = ${employeeId} FOR UPDATE`;
    return;
  }
  await tx.employee.findUnique({ where: { id: employeeId } });
}
