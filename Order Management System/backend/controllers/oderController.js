import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";

export const createOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId, products } = req.body;

    let totalAmount = 0;

    for (let item of products) {
      const product = await Product.findById(item.productId).session(session);

      if (!product || product.stock < item.quantity) {
        throw new Error("Product not available");
      }

      product.stock -= item.quantity;
      await product.save({ session });

      totalAmount += product.price * item.quantity;
    }

    const order = await Order.create(
      [
        {
          userId,
          products,
          totalAmount,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.json(order);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    res.status(500).json({ error: err.message });
  }
};