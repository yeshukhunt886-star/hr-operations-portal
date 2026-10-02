import { Product } from "../models/index.js";

// Create Product
export const createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get All Products
export const getProducts = async (req, res) => {
  try {
    const products = await Product.findAll();

    res.json(products);

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }
};

// Get Product By ID
export const getProductById = async (req, res) => {

  try {

    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Product Not Found"
      });
    }

    res.json(product);

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }

};

// Update Product
export const updateProduct = async (req, res) => {

  try {

    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Product Not Found"
      });
    }

    await product.update(req.body);

    res.json(product);

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }

};

// Delete Product
export const deleteProduct = async (req, res) => {

  try {

    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Product Not Found"
      });
    }

    await product.destroy();

    res.json({
      message: "Product Deleted Successfully"
    });

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }

};