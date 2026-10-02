import { prisma } from "../prisma.js";

function money(value) {
  return Number(Number(value || 0).toFixed(2));
}

function dateRange(query) {
  const from = query.from ? new Date(query.from) : null;
  const to = query.to ? new Date(query.to) : null;

  if (from && Number.isNaN(from.getTime())) {
    const error = new Error("Invalid from date");
    error.statusCode = 400;
    throw error;
  }

  if (to && Number.isNaN(to.getTime())) {
    const error = new Error("Invalid to date");
    error.statusCode = 400;
    throw error;
  }

  if (from && to && from > to) {
    const error = new Error("from date must be before or equal to to date");
    error.statusCode = 400;
    throw error;
  }

  if (to) {
    to.setHours(23, 59, 59, 999);
  }

  return {
    ...(from ? { gte: from } : {}),
    ...(to ? { lte: to } : {})
  };
}

export async function getDashboard(req, res, next) {
  try {
    const [
      totalUsers,
      totalCustomers,
      totalProducts,
      activeProducts,
      outOfStockProducts,
      totalOrders,
      pendingOrders,
      confirmedOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      paidOrders,
      refundedOrders,
      revenueResult,
      reviewResult
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {role: "CUSTOMER"}
      }),
      prisma.product.count(),
      prisma.product.count({
        where: {status: "ACTIVE"}
      }),
      prisma.product.count({
        where: {OR: [{ status: "OUT_OF_STOCK" },{ stock: 0 }]}
      }),
      prisma.order.count(),
      prisma.order.count({
        where: {status: "PENDING"}
      }),
      prisma.order.count({
        where: {status: "CONFIRMED"}
      }),
      prisma.order.count({
        where: {status: "PROCESSING"}
      }),
      prisma.order.count({
        where: {status: "SHIPPED"}
      }),
      prisma.order.count({
        where: {status: "DELIVERED"}
      }),
      prisma.order.count({
        where: {status: "CANCELLED"}
      }),
      prisma.order.count({
        where: {paymentStatus: "PAID"}
      }),
      prisma.order.count({
        where: {paymentStatus: "REFUNDED"}
      }),
      prisma.order.aggregate({
        _sum: {total: true},
        where: {paymentStatus: "PAID"}
      }),
      prisma.review.aggregate({
        _avg: {rating: true},
        _count: {id: true}
      })
    ]);

    return res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          customers: totalCustomers
        },

        products: {
          total: totalProducts,
          active: activeProducts,
          outOfStock: outOfStockProducts
        },

        orders: {
          total: totalOrders,
          pending: pendingOrders,
          confirmed: confirmedOrders,
          processing: processingOrders,
          shipped: shippedOrders,
          delivered: deliveredOrders,
          cancelled: cancelledOrders
        },

        payments: {
          paid: paidOrders,
          refunded: refundedOrders,
          revenue: money(revenueResult._sum.total)
        },

        reviews: {
          total: reviewResult._count.id,
          averageRating: money(reviewResult._avg.rating)
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getSalesReport(req, res, next) {
  try {
    const createdAt = dateRange(req.query);
    const orders = await prisma.order.findMany({
      where: {
        ...(Object.keys(createdAt).length > 0
          ? { createdAt }
          : {}),
        paymentStatus: "PAID"
      },
      select: {
        id: true,
        orderNumber: true,
        subtotal: true,
        shippingFee: true,
        tax: true,
        total: true,
        paymentStatus: true,
        status: true,
        createdAt: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const subtotal = orders.reduce(
      (sum, order) => sum + Number(order.subtotal),0
    );
    const shippingFee = orders.reduce(
      (sum, order) => sum + Number(order.shippingFee),0
    );
    const tax = orders.reduce(
      (sum, order) => sum + Number(order.tax),0
    );
    const revenue = orders.reduce(
      (sum, order) => sum + Number(order.total),0
    );

    return res.json({
      success: true,
      data: {
        summary: {
          orderCount: orders.length,
          subtotal: money(subtotal),
          shippingFee: money(shippingFee),
          tax: money(tax),
          revenue: money(revenue),
          averageOrderValue:
            orders.length > 0
              ? money(revenue / orders.length)
              : 0
        },
        orders
      }
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
}

export async function getProductReport(req, res, next) {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        _count: {
          select: {
            orderItems: true,
            reviews: true,
            cartItems: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });
    const data = products.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: money(product.price),
      stock: product.stock,
      status: product.status,
      category: product.category
        ? {
            id: product.category.id,
            name: product.category.name
          }
        : null,
      statistics: {
        orderItemCount: product._count.orderItems,
        reviewCount: product._count.reviews,
        cartItemCount: product._count.cartItems
      }
    }));
    return res.json({
      success: true,
      data: {
        productCount: data.length,
        products: data
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getCustomerReport(req, res, next) {
  try {
    const customers = await prisma.user.findMany({
      where: {
        role: "CUSTOMER"
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
        _count: {
          select: {orders: true,reviews: true}
        },
        orders: {
          where: {paymentStatus: "PAID"},
          select: {total: true}
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const data = customers.map((customer) => {
      const totalSpent = customer.orders.reduce(
        (sum, order) => sum + Number(order.total),0
      );

      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        status: customer.status,
        createdAt: customer.createdAt,
        statistics: {
          orderCount: customer._count.orders,
          paidOrderCount: customer.orders.length,
          reviewCount: customer._count.reviews,
          totalSpent: money(totalSpent)
        }
      };
    });
    return res.json({
      success: true,
      data: {
        customerCount: data.length,
        customers: data
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getOrderReport(req, res, next) {
  try {
    const orders = await prisma.order.groupBy({
      by: ["status"],
      _count: {id: true},
      _sum: {total: true},
      orderBy: {status: "asc"}
    });
    const paymentOrders = await prisma.order.groupBy({
      by: ["paymentStatus"],
      _count: {id: true},
      _sum: {total: true},
      orderBy: {paymentStatus: "asc"}
    });
    return res.json({
      success: true,
      data: {
        byOrderStatus: orders.map((item) => ({
          status: item.status,
          count: item._count.id,
          total: money(item._sum.total)
        })),
        byPaymentStatus: paymentOrders.map((item) => ({
          paymentStatus: item.paymentStatus,
          count: item._count.id,
          total: money(item._sum.total)
        }))
      }
    });
  } catch (error) {
    next(error);
  }
}