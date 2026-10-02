require("dotenv").config();

const bcrypt = require("bcryptjs");
const prisma = require("./src/config/prisma");

async function createAdmin() {
  try {
    const email = "admin@hotel.com";
    const password = "admin123";

    const existingAdmin = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingAdmin) {
      console.log("Admin already exists");
      return;
    }

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    const admin = await prisma.user.create({
      data: {
        name: "Hotel Admin",
        email,
        password: hashedPassword,
        role: "ADMIN",
      },
    });

    console.log("Admin created successfully");
    console.log({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    });
  } catch (error) {
    console.error("Create admin error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();