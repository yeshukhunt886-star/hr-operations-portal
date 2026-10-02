import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
//  USERS
  const adminPassword = await bcrypt.hash(
    "Admin@123",
    12
  );

  const customerPassword = await bcrypt.hash(
    "Customer@123",
    12
  );

  const admin = await prisma.user.upsert({
    where: {
      email: "admin@ecommerce.com",
    },
    update: {
      name: "E-Commerce Admin",
      passwordHash: adminPassword,
      role: "ADMIN",
      status: "ACTIVE",
    },
    create: {
      name: "E-Commerce Admin",
      email: "admin@ecommerce.com",
      passwordHash: adminPassword,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  const customer = await prisma.user.upsert({
    where: {
      email: "customer@ecommerce.com",
    },
    update: {
      name: "Demo Customer",
      passwordHash: customerPassword,
      role: "CUSTOMER",
      status: "ACTIVE",
    },
    create: {
      name: "Demo Customer",
      email: "customer@ecommerce.com",
      passwordHash: customerPassword,
      role: "CUSTOMER",
      status: "ACTIVE",
    },
  });

  // CATEGORIES - 10
  const categoryData = [
    {
      name: "Electronics",
      slug: "electronics",
      description:
        "Electronic devices, gadgets and accessories.",
    },
    {
      name: "Clothing",
      slug: "clothing",
      description:
        "Fashion, clothes and everyday wear.",
    },
    {
      name: "Home & Kitchen",
      slug: "home-kitchen",
      description:
        "Home essentials, kitchen items and appliances.",
    },
    {
      name: "Mobiles",
      slug: "mobiles",
      description:
        "Smartphones, mobile accessories and gadgets.",
    },
    {
      name: "Books",
      slug: "books",
      description:
        "Books, novels, educational and reference materials.",
    },
    {
      name: "Beauty",
      slug: "beauty",
      description:
        "Beauty, skincare and personal care products.",
    },
    {
      name: "Sports",
      slug: "sports",
      description:
        "Sports equipment, fitness and outdoor products.",
    },
    {
      name: "Toys",
      slug: "toys",
      description:
        "Toys, games and entertainment products.",
    },
    {
      name: "Grocery",
      slug: "grocery",
      description:
        "Daily grocery and household essentials.",
    },
    {
      name: "Footwear",
      slug: "footwear",
      description:
        "Shoes, sandals, sneakers and other footwear.",
    },
  ];

  const categories = {};

  for (const category of categoryData) {
    categories[category.slug] =
      await prisma.category.upsert({
        where: {
          slug: category.slug,
        },
        update: {
          name: category.name,
          description: category.description,
        },
        create: category,
      });
  }

  // PRODUCTS
  const products = [
    {
      name: "Wireless Headphones",
      slug: "wireless-headphones",
      description:
        "Demo wireless headphones",
      price: 2499.00,
      stock: 50,
      category: "electronics",
    },
    {
      name: "Smart Watch",
      slug: "smart-watch",
      description:
        "Demo smart watch",
      price: 3999.00,
      stock: 30,
      category: "electronics",
    },
    {
      name: "Classic T-Shirt",
      slug: "classic-t-shirt",
      description:
        "Demo classic cotton T-shirt",
      price: 799.00,
      stock: 100,
      category: "clothing",
    },
    {
      name: "Non Stick Cookware Set",
      slug: "non-stick-cookware-set",
      description:
        "Complete non stick cookware set for modern kitchens.",
      price: 2499.00,
      stock: 40,
      category: "home-kitchen",
    },
    {
      name: "Android Smartphone",
      slug: "android-smartphone",
      description:
        "Modern Android smartphone with powerful performance.",
      price: 18999.00,
      stock: 25,
      category: "mobiles",
    },
    {
      name: "The Complete JavaScript Guide",
      slug: "complete-javascript-guide",
      description:
        "A practical guide to learning JavaScript.",
      price: 699.00,
      stock: 60,
      category: "books",
    },
    {
      name: "Face Care Kit",
      slug: "face-care-kit",
      description:
        "Daily skincare and face care essentials.",
      price: 999.00,
      stock: 45,
      category: "beauty",
    },
    {
      name: "Fitness Yoga Mat",
      slug: "fitness-yoga-mat",
      description:
        "Comfortable yoga mat for fitness and exercise.",
      price: 599.00,
      stock: 75,
      category: "sports",
    },
    {
      name: "Kids Building Blocks",
      slug: "kids-building-blocks",
      description:
        "Creative building block toy for children.",
      price: 899.00,
      stock: 50,
      category: "toys",
    },
    {
      name: "Premium Grocery Pack",
      slug: "premium-grocery-pack",
      description:
        "Everyday grocery essentials for your home.",
      price: 1299.00,
      stock: 35,
      category: "grocery",
    },
    {
      name: "Running Sneakers",
      slug: "running-sneakers",
      description:
        "Comfortable sneakers for running and daily use.",
      price: 1999.00,
      stock: 40,
      category: "footwear",
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: {
        slug: product.slug,
      },
      update: {
        name: product.name,
        description: product.description,
        price: product.price,
        stock: product.stock,
        status: "ACTIVE",
        categoryId:
          categories[product.category].id,
      },
      create: {
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price,
        stock: product.stock,
        status: "ACTIVE",
        categoryId:
          categories[product.category].id,
      },
    });
  }

  // RESULT
  console.log("E-COMMERCE DEMO DATA SEEDED" );
  console.log(`Admin: ${admin.email}`);
  console.log(`Customer: ${customer.email}`);
  console.log(`Categories: ${categoryData.length}`);
  console.log(`Products: ${products.length}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:",error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });