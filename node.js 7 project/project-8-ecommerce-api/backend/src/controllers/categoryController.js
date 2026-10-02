import { prisma } from "../prisma.js";
import {
  createCategorySchema,
  updateCategorySchema
} from "../validators/categoryValidator.js";

function handleValidationError(error, res) {
  if (error.name === "ZodError") {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: error.issues
    });
    return true;
  }
  return false;
}

export async function createCategory(req, res, next) {
  try {
    const data = createCategorySchema.parse(req.body);
    const existing = await prisma.category.findFirst({
      where: {
        OR: [
          { name: data.name },
          { slug: data.slug }
        ]
      }
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Category name or slug already exists"
      });
    }
    const category = await prisma.category.create({ data});
    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category
    });
  } catch (error) {
    if (handleValidationError(error, res)) {
      return;
    }
    next(error);
  }
}

export async function getCategories(req, res, next) {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc"},
      include: {
        _count: { select: {products: true} }
      }
    });
    return res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
}

export async function getCategoryById(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID"
      });
    }
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        products: {
          orderBy: { name: "asc" }
        }
      }
    });
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }
    return res.json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
}

export async function updateCategory(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID"
      });
    }
    const data = updateCategorySchema.parse(req.body);
    const existing = await prisma.category.findUnique({
      where: { id }
    });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }
    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one field is required"
      });
    }
    if (data.name || data.slug) {
      const duplicate = await prisma.category.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                ...(data.name ? [{ name: data.name }] : []),
                ...(data.slug ? [{ slug: data.slug }] : [])
              ]
            }
          ]
        }
      });
      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Category name or slug already exists"
        });
      }
    }
    const category = await prisma.category.update({
      where: { id },
      data
    });
    return res.json({
      success: true,
      message: "Category updated successfully",
      data: category
    });
  } catch (error) {
    if (handleValidationError(error, res)) {
      return;
    }
    next(error);
  }
}

export async function deleteCategory(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID"
      });
    }

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true
          }
        }
      }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    await prisma.category.delete({
      where: { id }
    });

    return res.json({
      success: true,
      message:
        category._count.products > 0
          ? "Category deleted and products were uncategorized"
          : "Category deleted successfully"
    });
  } catch (error) {
    next(error);
  }
}