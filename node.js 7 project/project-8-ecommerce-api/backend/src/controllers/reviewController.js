import { prisma } from "../prisma.js";

import {
  createReviewSchema,
  updateReviewSchema
} from "../validators/reviewValidator.js";

async function getProductId(req, res) {
  const productId = Number(req.params.productId);
  if (!Number.isInteger(productId) || productId <= 0) {
    res.status(400).json({
      success: false,
      message: "Invalid product ID"
    });
    return null;
  }
  return productId;
}

async function productExists(productId) {
  return prisma.product.findUnique({
    where: {id: productId},
    select: {id: true}
  });
}

async function userPurchasedProduct(userId, productId) {
  const orderItem = await prisma.orderItem.findFirst({
    where: {
      productId,
      order: {
        userId,
        status: {
          not: "CANCELLED"
        }
      }
    },
    select: {id: true}
  });
  return Boolean(orderItem);
}

export async function createReview(req, res, next) {
  try {
    const productId = await getProductId(req, res);
    if (!productId) {
      return;
    }
    const data = createReviewSchema.parse(req.body);
    const product = await productExists(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }
    const purchased = await userPurchasedProduct(req.user.id,productId);
    if (!purchased) {
      return res.status(403).json({
        success: false,
        message: "You can review only products you have purchased"
      });
    }
    const existingReview = await prisma.review.findUnique({
      where: {
        userId_productId: {
          userId: req.user.id,
          productId
        }
      }
    });
    if (existingReview) {
      return res.status(409).json({
        success: false,
        message: "You have already reviewed this product"
      });
    }
    const review = await prisma.review.create({
      data: {
        userId: req.user.id,
        productId,
        rating: data.rating,
        comment: data.comment || null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    return res.status(201).json({
      success: true,
      message: "Review created successfully",
      data: review
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues
      });
    }
    next(error);
  }
}

export async function getProductReviews(req, res, next) {
  try {
    const productId = await getProductId(req, res);
    if (!productId) {
      return;
    }
    const product = await prisma.product.findUnique({
      where: {id: productId},
      select: {id: true,name: true}
    });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }
    const reviews = await prisma.review.findMany({
      where: {productId},
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {createdAt: "desc"}
    });
    const reviewCount = reviews.length;
    const averageRating =
      reviewCount === 0
        ? 0
        : Number(
            (reviews.reduce(
                (sum, review) => sum + review.rating,
                0) / reviewCount
            ).toFixed(2)
          );
    return res.json({
      success: true,
      data: {
        product: {
          id: product.id,
          name: product.name
        },
        averageRating,
        reviewCount,
        reviews
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function updateReview(req, res, next) {
  try {
    const productId = await getProductId(req, res);
    if (!productId) {
      return;
    }
    const data = updateReviewSchema.parse(req.body);
    const review = await prisma.review.findUnique({
      where: {
        userId_productId: {
          userId: req.user.id,
          productId
        }
      }
    });
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Your review was not found"
      });
    }
    const updatedReview = await prisma.review.update({
      where: {id: review.id},
      data: {
        rating: data.rating,
        comment: data.comment || null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    return res.json({
      success: true,
      message: "Review updated successfully",
      data: updatedReview
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues
      });
    }
    next(error);
  }
}

export async function deleteReview(req, res, next) {
  try {
    const productId = await getProductId(req, res);
    if (!productId) {
      return;
    }
    const review = await prisma.review.findUnique({
      where: {
        userId_productId: {
          userId: req.user.id,
          productId
        }
      }
    });
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Your review was not found"
      });
    }
    await prisma.review.delete({
      where: {
        id: review.id
      }
    });
    return res.json({
      success: true,
      message: "Review deleted successfully"
    });
  } catch (error) {
    next(error);
  }
}