import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Delete existing data in dependency-safe order.
  await prisma.finalizedPayrollKey.deleteMany();
  await prisma.payrollItem.deleteMany();
  await prisma.payrollRun.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.attendanceOpenLock.deleteMany();
  await prisma.attendanceSession.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.leaveBalance.deleteMany();
  await prisma.salaryProfile.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.user.deleteMany();
  await prisma.leaveType.deleteMany();
  await prisma.designation.deleteMany();
  await prisma.department.deleteMany();

  // Create departments.
  const engineering = await prisma.department.create({
    data: {code: "ENG",name: "Engineering"}
  });

  const people = await prisma.department.create({
    data: {code: "PEO",name: "People Operations"}
  });

  const finance = await prisma.department.create({
    data: {code: "FIN",name: "Finance"}
  });

  // Create designations.
  const engineer = await prisma.designation.create({
    data: {name: "Software Engineer"}
  });

  const engManager = await prisma.designation.create({
    data: {name: "Engineering Manager"}
  });

  const hrbp = await prisma.designation.create({
    data: {name: "HR Business Partner"}
  });

  const analyst = await prisma.designation.create({
    data: {name: "Payroll Analyst"}
  });

  const annual = await prisma.leaveType.create({
    data: {code: "AL",name: "Annual Leave",paid: true}
  });

  const sick = await prisma.leaveType.create({
    data: {code: "SL",name: "Sick Leave",paid: true}
  });

  const unpaid = await prisma.leaveType.create({
    data: {code: "UL",name: "Unpaid Leave",paid: false}
  });

 // Create the common demo password hash used by the login screen.
  const passwordHash = await argon2.hash("Password123!");

  // Set demo employee join date.
  const join = new Date("2024-01-15T00:00:00.000Z");

  // Create a user and employee with salary and leave balances.
  async function person({email,role,code,first,last,dept,desig,managerId = null,salary}) {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
        isActive: true
      }
    });

    const employee = await prisma.employee.create({
      data: {
        employeeCode: code,
        firstName: first,
        lastName: last,
        email,
        status: "ACTIVE",
        joinDate: join,
        workStart: "09:00",
        departmentId: dept,
        designationId: desig,
        managerId,
        userId: user.id
      }
    });

    await prisma.salaryProfile.create({
      data: {
        employeeId: employee.id,
        baseSalary: salary,
        effectiveFrom: join
      }
    });

    for (const leaveType of [annual, sick]) {
      await prisma.leaveBalance.create({
        data: {
          employeeId: employee.id,
          leaveTypeId: leaveType.id,
          year: 2026,
          entitled: leaveType.code === "AL" ? 18 : 8,
          used: 0
        }
      });
    }
    return employee;
  }

  // Create admin account.
  const admin = await person({
    email: "admin@gmail.com",
    role: "ADMIN",
    code: "EMP001",
    first: "Asha",
    last: "Rao",
    dept: people.id,
    desig: hrbp.id,
    salary: 180000
  });

  // Create HR account.
  const hr = await person({
    email: "hr@gmail.com",
    role: "HR",
    code: "EMP002",
    first: "Farhan",
    last: "Mehta",
    dept: people.id,
    desig: hrbp.id,
    managerId: admin.id,
    salary: 120000
  });

  // Create manager account.
  const manager = await person({
    email: "manager@gmail.com",
    role: "MANAGER",
    code: "EMP010",
    first: "Leela",
    last: "Iyer",
    dept: engineering.id,
    desig: engManager.id,
    managerId: admin.id,
    salary: 160000
  });

  // Create employee account.
  await person({
    email: "employee@gmail.com",
    role: "EMPLOYEE",
    code: "EMP101",
    first: "Rohit",
    last: "Sen",
    dept: engineering.id,
    desig: engineer.id,
    managerId: manager.id,
    salary: 90000
  });

  // Create second employee account.
  await person({
    email: "employee2@gmail.com",
    role: "EMPLOYEE",
    code: "EMP102",
    first: "Maya",
    last: "Kapoor",
    dept: engineering.id,
    desig: engineer.id,
    managerId: manager.id,
    salary: 88000
  });

  // Create second Admin account.
  await person({
    email: "admin2@gmail.com",
    role: "ADMIN",
    code: "EMP301",
    first: "Rahul",
    last: "Shah",
    dept: people.id,
    desig: hrbp.id,
    managerId: admin.id,
    salary: 175000
  });

// Create second HR account.
  await person({
    email: "hr2@gmail.com",
    role: "HR",
    code: "EMP302",
    first: "Priya",
    last: "Patel",
    dept: people.id,
    desig: hrbp.id,
    managerId: admin.id,
    salary: 115000
  });

// Create second Manager account.
  await person({
    email: "manager2@gmail.com",
    role: "MANAGER",
    code: "EMP303",
    first: "Amit",
    last: "Joshi",
    dept: engineering.id,
    desig: engManager.id,
    managerId: admin.id,
    salary: 155000
  });

// Create third Employee account.
  await person({
    email: "employee3@gmail.com",
    role: "EMPLOYEE",
    code: "EMP304",
    first: "Neha",
    last: "Desai",
    dept: engineering.id,
    desig: engineer.id,
    managerId: manager.id,
    salary: 85000
  });

  // Create finance employee account.
  await person({
    email: "finance@gmail.com",
    role: "EMPLOYEE",
    code: "EMP201",
    first: "Irfan",
    last: "Qureshi",
    dept: finance.id,
    desig: analyst.id,
    managerId: hr.id,
    salary: 95000
  });

  // Create company holidays.
  await prisma.holiday.createMany({
    data: [
      {date: new Date("2026-01-26T00:00:00.000Z"),name: "Republic Day"},
      {date: new Date("2026-08-15T00:00:00.000Z"),name: "Independence Day"},
      {date: new Date("2026-10-02T00:00:00.000Z"),name: "Gandhi Jayanti"}
    ]
  });

  // Display created login accounts.
  console.log("");
  console.log("HR OPERATIONS DEMO DATA SEEDED SUCCESSFULLY");
  console.log("");
  console.log("Password for all accounts: Password123!");
  console.log("");
  console.log("ADMIN");
  console.log("Email: admin@gmail.com");
  console.log("");
  console.log("HR");
  console.log("Email: hr@gmail.com");
  console.log("");
  console.log("MANAGER");
  console.log("Email: manager@gmail.com");
  console.log("");
  console.log("EMPLOYEE");
  console.log("Email: employee@gmail.com");
  console.log("");
  console.log("EMPLOYEE 2");
  console.log("Email: employee2@gmail.com");
  console.log("");
  console.log("FINANCE EMPLOYEE");
  console.log("Email: finance@gmail.com");
  console.log("");
  console.log("ADMIN 2");
  console.log("Email: admin2@gmail.com");
  console.log("");
  console.log("HR 2");
  console.log("Email: hr2@gmail.com");
  console.log("");
  console.log("MANAGER 2");
  console.log("Email: manager2@gmail.com");
  console.log("");
  console.log("EMPLOYEE 3");
  console.log("Email: employee3@gmail.com");
  console.log("");
  console.log("Email: finance@gmail.com");
  console.log("");
}

main()
  .then(async () => {await prisma.$disconnect();})
  .catch(async (error) => {
    console.error("SEED ERROR:");
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

