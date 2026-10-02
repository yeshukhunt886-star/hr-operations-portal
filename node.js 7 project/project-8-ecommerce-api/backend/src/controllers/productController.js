import { prisma } from "../prisma.js";
import {
  createProductSchema,
  updateProductSchema,
  productQuerySchema
} from "../validators/productValidator.js";

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

function normalizePrice(price) {
  return typeof price === "number"
    ? price.toFixed(2)
    : price;
}

export async function createProduct(req, res, next) {
  try {
    const data = createProductSchema.parse(req.body);
    if (data.categoryId !== undefined && data.categoryId !== null) {
      const category = await prisma.category.findUnique({
        where: {
          id: data.categoryId
        }
      });

      if (!category) {
        return res.status(400).json({
          success: false,
          message: "Category not found"
        });
      }
    }

    const existing = await prisma.product.findFirst({
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
        message: "Product name or slug already exists"
      });
    }

    let status = data.status || "ACTIVE";
    if (data.stock === 0 && !data.status) {
      status = "OUT_OF_STOCK";
    }

    const product = await prisma.product.create({
      data: {
        ...data,
        price: normalizePrice(data.price),
        status
      },
      include: {
        category: true
      }
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product
    });
  } catch (error) {
    if (handleValidationError(error, res)) {
      return;
    }
    next(error);
  }
}

export async function getProducts(req, res, next) {
  try {
    const query = productQuerySchema.parse(req.query);
    if (
      query.minPrice !== undefined &&
      query.maxPrice !== undefined &&
      query.minPrice > query.maxPrice
    ) {
      return res.status(400).json({
        success: false,
        message: "minPrice cannot be greater than maxPrice"
      });
    }
    const where = {};
    if (query.search) {
      where.OR = [
        { name: {contains: query.search } },
        { slug: {contains: query.search }},
        { description: {contains: query.search }}
      ];
    }

    if (query.categoryId !== undefined) {
      where.categoryId = query.categoryId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.minPrice !== undefined ||query.maxPrice !== undefined) {
      where.price = {};

      if (query.minPrice !== undefined) {
        where.price.gte = query.minPrice;
      }

      if (query.maxPrice !== undefined) {
        where.price.lte = query.maxPrice;
      }
    }

    const skip = (query.page - 1) * query.limit;
    const [products, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        include: { category: true  },
        orderBy: { createdAt: "desc"},
        skip,
        take: query.limit
      }),

      prisma.product.count({
        where
      })
    ]);

    const totalPages = Math.ceil(total / query.limit);

    return res.json({
      success: true,
      data: products,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        hasNextPage: query.page < totalPages,
        hasPreviousPage: query.page > 1
      }
    });
  } catch (error) {
    if (handleValidationError(error, res)) {
      return;
    }

    next(error);
  }
}

export async function getProductById(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            createdAt: "desc"
          }
        }
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    return res.json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

    const data = updateProductSchema.parse(req.body);

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one field is required"
      });
    }

    const existing = await prisma.product.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    if (
      data.categoryId !== undefined &&
      data.categoryId !== null
    ) {
      const category = await prisma.category.findUnique({
        where: {
          id: data.categoryId
        }
      });

      if (!category) {
        return res.status(400).json({
          success: false,
          message: "Category not found"
        });
      }
    }

    if (data.name || data.slug) {
      const duplicate = await prisma.product.findFirst({
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
          message: "Product name or slug already exists"
        });
      }
    }

    const updateData = {
      ...data
    };

    if (data.price !== undefined) {
      updateData.price = normalizePrice(data.price);
    }

    if ( data.stock !== undefined && data.stock === 0 && data.status === undefined) {
      updateData.status = "OUT_OF_STOCK";
    }

    if ( data.stock !== undefined && data.stock > 0 && data.status === undefined && existing.status === "OUT_OF_STOCK" ) {
      updateData.status = "ACTIVE";
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: true
      }
    });

    return res.json({
      success: true,
      message: "Product updated successfully",
      data: product
    });
  } catch (error) {
    if (handleValidationError(error, res)) {
      return;
    }

    next(error);
  }
}

export async function deleteProduct(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

    const product = await prisma.product.findUnique({
      where: { id }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    const orderItemCount = await prisma.orderItem.count({
      where: {
        productId: id
      }
    });

    if (orderItemCount > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Product cannot be deleted because it exists in an order"
      });
    }

    await prisma.product.delete({
      where: { id }
    });

    return res.json({
      success: true,
      message: "Product deleted successfully"
    });
  } catch (error) {
    next(error);
  }
}