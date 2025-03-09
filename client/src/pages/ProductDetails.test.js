import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import axios from "axios";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import ProductDetails from "./ProductDetails";

jest.mock("axios");
jest.mock("react-hot-toast");

jest.mock("../context/auth", () => ({
  useAuth: jest.fn(() => [null, jest.fn()]), 
}));

const mockSetCart = jest.fn();
jest.mock("../context/cart", () => ({
  useCart: jest.fn(() => [[], mockSetCart]), 
}));

jest.mock("../context/search", () => ({
  useSearch: jest.fn(() => [{ keyword: "" }, jest.fn()]), 
}));

jest.mock("../hooks/useCategory", () => jest.fn(() => []));

describe("Product Details Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches and displays product details and similar products", async () => {
    const mockProduct = {
      product: {
        _id: "123",
        name: "Test Product",
        slug: "test-product",
        description: "This is a test product",
        price: 99.99,
        category: { _id: "cat1", name: "Test Category" },
      },
    };

    const mockSimilarProducts = {
      products: [
        { _id: "456", name: "Similar Product 1", price: 59.99, description: "Similar item 1", slug: "similar-product-1" },
        { _id: "789", name: "Similar Product 2", price: 79.99, description: "Similar item 2", slug: "similar-product-2" },
      ],
    };

    // Mock axios GET requests
    axios.get
      .mockResolvedValueOnce({ data: mockProduct }) // For getProduct()
      .mockResolvedValueOnce({ data: mockSimilarProducts }); // For getSimilarProduct()

    render(
      <MemoryRouter initialEntries={["/product/test-product"]}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for product details to load
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(2);
    });

    // Assertions for product details
    expect(await screen.findByText("Product Details")).toBeInTheDocument();
    expect(await screen.findByText("Name : Test Product")).toBeInTheDocument();
    expect(await screen.findByText("Description : This is a test product")).toBeInTheDocument();
    expect(await screen.findByText("Price :$99.99")).toBeInTheDocument();
    expect(await screen.findByText("Category : Test Category")).toBeInTheDocument();

    // Assertions for similar products
    expect(await screen.findByText("Similar Product 1")).toBeInTheDocument();
    expect(await screen.findByText("$59.99")).toBeInTheDocument();
    expect(await screen.findByText("Similar Product 2")).toBeInTheDocument();
    expect(await screen.findByText("$79.99")).toBeInTheDocument();
  });

  it("displays No Similar Products found when there is no similar products", async () => {
    const mockProduct = {
      product: {
        _id: "123",
        name: "Test Product",
        slug: "test-product",
        description: "This is a test product",
        price: 99.99,
        category: { _id: "cat1", name: "Test Category" },
      },
    };

    const mockSimilarProducts = {
      products: [],
    };

    // Mock axios GET requests
    axios.get
      .mockResolvedValueOnce({ data: mockProduct }) // For getProduct()
      .mockResolvedValueOnce({ data: mockSimilarProducts }); // For getSimilarProduct()

    render(
      <MemoryRouter initialEntries={["/product/test-product"]}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for product details to load
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(2);
    });

    // Assertions for similar products
    expect(await screen.findByText("No Similar Products found")).toBeInTheDocument();
  });

  it("handles navigation to another product after clicking on 'More Details' button under Similar Products", async () => {
    const mockProduct1 = {
      product: {
        _id: "123",
        name: "Test Product 1",
        slug: "test-product-1",
        description: "This is test product 1",
        price: 99.99,
        category: { _id: "cat1", name: "Test Category" },
      },
    };

    const mockSimilarProducts = {
      products: [
        {
          _id: "456",
          name: "Test Product 2",
          slug: "test-product-2",
          description: "This is test product 2",
          price: 129.99,
          category: { _id: "cat2", name: "New Category" },
        },
      ],
    };

    // Mock axios GET requests
    axios.get
      .mockResolvedValueOnce({ data: mockProduct1 }) // For getProduct()
      .mockResolvedValueOnce({ data: mockSimilarProducts }) // For getSimilarProduct()
      .mockResolvedValueOnce({ data: { product: mockSimilarProducts.products[0] }}) // For new product details
      .mockResolvedValueOnce({ data: { products: [] }}); // For new similar products

    render(
      <MemoryRouter initialEntries={["/product/test-product-1"]}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for first product details to load
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(2);
    });

    // Click on the "More Details" button for the second product
    fireEvent.click(await screen.findByText("More Details"));

    // Wait for second product details to load
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(4);
    });

    // Assertions for new product details
    expect(await screen.findByText("Product Details")).toBeInTheDocument();
    expect(await screen.findByText("Name : Test Product 2")).toBeInTheDocument();
    expect(await screen.findByText("Description : This is test product 2")).toBeInTheDocument();
    expect(await screen.findByText("Price :$129.99")).toBeInTheDocument();
    expect(await screen.findByText("Category : New Category")).toBeInTheDocument();
  });

  it("adds the product to cart when 'ADD TO CART' button of current product is clicked", async () => {
    const mockProduct = {
      product: {
        _id: "123",
        name: "Test Product",
        slug: "test-product",
        description: "This is a test product",
        price: 99.99,
        category: { _id: "cat1", name: "Test Category" },
      },
    };

    const mockSimilarProducts = {
      products: [],
    };

    // Mock axios GET requests
    axios.get
      .mockResolvedValueOnce({ data: mockProduct }) // For getProduct()
      .mockResolvedValueOnce({ data: mockSimilarProducts }); // For getSimilarProduct()

    render(
      <MemoryRouter initialEntries={["/product/test-product"]}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for product details to load
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(2);
    });

    // Simulate "Add to Cart" button click
    fireEvent.click(await screen.findByText("ADD TO CART"));

    // Ensure setCart is called with the correct product
    expect(mockSetCart).toHaveBeenCalledWith([mockProduct.product]);
  });

  it("adds the product to cart when 'ADD TO CART' button of similar product is clicked", async () => {
    const mockProduct = {
      product: {
        _id: "123",
        name: "Test Product 1",
        slug: "test-product-1",
        description: "This is test product 1",
        price: 99.99,
        category: { _id: "cat1", name: "Test Category" },
      },
    };

    const mockSimilarProducts = {
      products: [
        {
          _id: "456",
          name: "Test Product 2",
          slug: "test-product-2",
          description: "This is test product 2",
          price: 129.99,
          category: { _id: "cat2", name: "New Category" },
        },
      ],
    };

    // Mock axios GET requests
    axios.get
      .mockResolvedValueOnce({ data: mockProduct }) // For getProduct()
      .mockResolvedValueOnce({ data: mockSimilarProducts }); // For getSimilarProduct()

    render(
      <MemoryRouter initialEntries={["/product/test-product"]}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for product details to load
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(2);
    });

    // Simulate "Add to Cart" button click for similar product
    fireEvent.click(await screen.findByTestId("similar-product-add-to-cart"));

    // Ensure setCart is called with the correct product
    expect(mockSetCart).toHaveBeenCalledWith([mockSimilarProducts.products[0]]);
  });

});
