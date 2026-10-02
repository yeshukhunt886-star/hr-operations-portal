import { prisma } from "../prisma.js";
import { addCartItemSchema, updateCartItemSchema } from "../validators/cartValidator.js";

async function getOrCreateCart(userId) {
  let cart = await prisma.cart.findUnique({
    where: {
      userId
    }
  });
  if (!cart) {
    cart = await prisma.cart.create({
      data: {
        userId
      }
    });
  }
  return cart;
}

async function getCartData(userId) {
  const cart = await prisma.cart.findUnique({
    where: { userId  },
    include: {
      items: {
        include: {
          product: { include: {category: true } }
        },
        orderBy: { createdAt: "desc" }
      }
    }
  });
  if (!cart) {
    return {
      id: null,
      userId,
      items: [],
      itemCount: 0,
      subtotal: 0
    };
  }
  const items = cart.items.map((item) => ({
    id: item.id,
    productId: item.productId,
    quantity: item.quantity,
    product: item.product,
    lineTotal: Number(item.product.price) * item.quantity
  }));
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal,0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity,0);
  return {
    id: cart.id,
    userId: cart.userId,
    items,
    itemCount,
    subtotal: Number(subtotal.toFixed(2))
  };
}

export async function getCart(req, res, next) {
  try {
    const cart = await getCartData(req.user.id);
    return res.json({
      success: true,
      data: cart
    });
  } catch (error) {
    next(error);
  }
}

export async function addCartItem(req, res, next) {
  try {
    const data = addCartItemSchema.parse(req.body);
    const product = await prisma.product.findUnique({
      where: {
        id: data.productId
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    if (product.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Product is not available"
      });
    }

    if (product.stock <= 0) {
      return res.status(400).json({
        success: false,
        message: "Product is out of stock"
      });
    }
    const cart = await getOrCreateCart(req.user.id);
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: data.productId
        }
      }
    });
    const newQuantity = (existingItem?.quantity || 0) + data.quantity;
    if (newQuantity > product.stock) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} units are available`
      });
    }
    if (existingItem) {
      await prisma.cartItem.update({
        where: {id: existingItem.id},
        data: {quantity: newQuantity}
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: data.productId,
          quantity: data.quantity
        }
      });
    }
    const updatedCart = await getCartData(req.user.id);
    return res.status(201).json({
      success: true,
      message: existingItem
        ? "Cart quantity updated successfully"
        : "Product added to cart successfully",
      data: updatedCart
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

export async function updateCartItem(req, res, next) {
  try {
    const productId = Number(req.params.productId);
    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }
    const data = updateCartItemSchema.parse(req.body);
    const cart = await prisma.cart.findUnique({
      where: {
        userId: req.user.id
      }
    });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found"
      });
    }
    const item = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {cartId: cart.id,productId}
      },
      include: {product: true}
    });
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found"
      });
    }
    if (item.product.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Product is no longer available"
      });
    }
    if (data.quantity > item.product.stock) {
      return res.status(400).json({
        success: false,
        message: `Only ${item.product.stock} units are available`
      });
    }
    await prisma.cartItem.update({
      where: {id: item.id},
      data: {quantity: data.quantity}
    });
    const updatedCart = await getCartData(req.user.id);
    return res.json({
      success: true,
      message: "Cart item updated successfully",
      data: updatedCart
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

export async function removeCartItem(req, res, next) {
  try {
    const productId = Number(req.params.productId);
    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }
    const cart = await prisma.cart.findUnique({
      where: {
        userId: req.user.id
      }
    });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found"
      });
    }
    const item = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId
        }
      }
    });
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found"
      });
    }
    await prisma.cartItem.delete({
      where: {
        id: item.id
      }
    });
    const updatedCart = await getCartData(req.user.id);
    return res.json({
      success: true,
      message: "Product removed from cart",
      data: updatedCart
    });
  } catch (error) {
    next(error);
  }
}

export async function clearCart(req, res, next) {
  try {
    const cart = await prisma.cart.findUnique({
      where: {
        userId: req.user.id
      }
    });
    if (!cart) {
      return res.json({
        success: true,
        message: "Cart is already empty",
        data: {
          items: [],
          itemCount: 0,
          subtotal: 0
        }
      });
    }
    await prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id
      }
    });
    return res.json({
      success: true,
      message: "Cart cleared successfully",
      data: {
        id: cart.id,
        userId: cart.userId,
        items: [],
        itemCount: 0,
        subtotal: 0
      }
    });
  } catch (error) {
    next(error);
  }
}