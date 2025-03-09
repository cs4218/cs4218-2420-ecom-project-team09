import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import axios from "axios";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import CategoryProduct from "./CategoryProduct";
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

describe("Category Product Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches and displays products of the chosen category", async () => {
    const mockData = {
        category: {
          _id: "12345",
          name: "Electronics",
          slug: "electronics",
          createdAt: "2022-01-01T00:00:00Z",
          updatedAt: "2022-01-01T00:00:00Z"
        },
        products: [
          {
            _id: "54321",
            name: "Laptop",
            slug: "laptop",
            price: 1000,
            description: "A powerful laptop with 16GB RAM and 512GB SSD.",
            category: { _id: "1", name: "Electronics" },
            createdAt: "2022-01-01T00:00:00Z",
            updatedAt: "2022-01-01T00:00:00Z"
          },
          {
            _id: "54322",
            name: "Smartphone",
            slug: "smartphone",
            price: 500,
            description: "A smartphone with a 6.5-inch screen and 128GB storage.",
            category: { _id: "2", name: "Electronics" },
            createdAt: "2022-01-01T00:00:00Z",
            updatedAt: "2022-01-01T00:00:00Z"
          },
          {
            _id: "54323",
            name: "Tablet",
            slug: "tablet",
            price: 300,
            description: "A tablet with a 10-inch screen and 64GB storage.",
            category: { _id: "3", name: "Electronics" },
            createdAt: "2022-01-01T00:00:00Z",
            updatedAt: "2022-01-01T00:00:00Z"
          }
        ],
        total: 3
      }
      
    // Mock axios GET requests
    axios.get
      .mockResolvedValueOnce({ data: mockData }) // For getProductsByCat()

    render(
      <MemoryRouter initialEntries={["/category/electronics"]}>
        <Routes>
          <Route path="/category/:slug" element={<CategoryProduct />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for Category Product details to load
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText("Category - Electronics")).toBeInTheDocument();
  });
  
  it("handles navigation to another product after clicking on 'More Details' button of a product", async () => {
    const mockData = {
      category: {
        _id: "12345",
        name: "Electronics",
        slug: "electronics",
        createdAt: "2022-01-01T00:00:00Z",
        updatedAt: "2022-01-01T00:00:00Z"
      },
      products: [
        {
          _id: "54321",
          name: "Test Product 2",
          slug: "laptop",
          price: 129.99,
          description: "This is test product 2.",
          category: { _id: "1", name: "Electronics" },
          createdAt: "2022-01-01T00:00:00Z",
          updatedAt: "2022-01-01T00:00:00Z"
        },
      ],
      total: 1
    }

    // Mock axios GET requests
    axios.get
      .mockResolvedValueOnce({ data: mockData }) // For getProductsByCat()
      .mockResolvedValueOnce({ data: { product: mockData.products[0] }}) // For new product details
      .mockResolvedValueOnce({ data: { products: [] }}); // For new similar products

    render(
      <MemoryRouter initialEntries={["/category/electronics"]}>
        <Routes>
          <Route path="/category/:slug" element={<CategoryProduct />} />
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for Category Product details to load
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(1);
    });

    // Click on the "More Details" button for the second product
    fireEvent.click(await screen.findByText("More Details"));

    // Wait for second product details to load
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(3);
    });

    // Assertions for new product details
    expect(await screen.findByText("Product Details")).toBeInTheDocument();
    expect(await screen.findByText("Name : Test Product 2")).toBeInTheDocument();
    expect(await screen.findByText("Description : This is test product 2.")).toBeInTheDocument();
    expect(await screen.findByText("Price :$129.99")).toBeInTheDocument();
    expect(await screen.findByText("Category : Electronics")).toBeInTheDocument();
  });

  it("adds the product to cart when 'ADD TO CART' button of a product is clicked", async () => {
    const mockData = {
      category: {
        _id: "12345",
        name: "Electronics",
        slug: "electronics",
        createdAt: "2022-01-01T00:00:00Z",
        updatedAt: "2022-01-01T00:00:00Z"
      },
      products: [
        {
          _id: "54321",
          name: "Laptop",
          slug: "laptop",
          price: 1000,
          description: "A powerful laptop with 16GB RAM and 512GB SSD.",
          category: { _id: "1", name: "Electronics" },
          createdAt: "2022-01-01T00:00:00Z",
          updatedAt: "2022-01-01T00:00:00Z"
        },
      ],
      total: 1
    }

    // Mock axios GET requests
    axios.get
      .mockResolvedValueOnce({ data: mockData }) // For getProductsByCat()

    render(
      <MemoryRouter initialEntries={["/category/electronics"]}>
        <Routes>
          <Route path="/category/:slug" element={<CategoryProduct />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for Category Product details to load
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(1);
    });

    // Simulate "Add to Cart" button click for similar product
    fireEvent.click(await screen.findByText("ADD TO CART"));

    // Ensure setCart is called with the correct product
    expect(mockSetCart).toHaveBeenCalledWith([mockData.products[0]]);
  });

});
