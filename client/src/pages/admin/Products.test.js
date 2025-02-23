import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import Products from "./Products";
import AdminRoute from "../../components/Routes/AdminRoute";

jest.mock("axios");
jest.mock("react-hot-toast");

// Mock the useAuth hook to return valid auth data
jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(() => [
    {
      user: { name: "Test User", email: "test@example.com" },
      token: "fake-token",
    },
    jest.fn(),
  ]),
}));

jest.mock("../../context/cart", () => ({
  useCart: jest.fn(() => [[], jest.fn()]),
}));

jest.mock("../../context/search", () => ({
  useSearch: jest.fn(() => [{ keyword: "" }, jest.fn()]),
}));

jest.mock("../../hooks/useCategory", () => jest.fn(() => []));

describe("Product Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockAuth = {
    ok: true,
  };

  const mockData = {
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

  it("renders products from the products list correctly", async () => {
    // Mock axios GET requests
    axios.get
      .mockResolvedValueOnce({ data: mockAuth }) // For authCheck()
      .mockResolvedValueOnce({ data: mockData }); // For getAllProducts()

    render(
      <MemoryRouter initialEntries={["/dashboard/admin/products"]}>
        <Routes>
          <Route path="/dashboard" element={<AdminRoute />}>
            <Route path="admin/products" element={<Products />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(2);
    });

    expect(await screen.findByText("All Products List")).toBeInTheDocument();
    // Assertions for new product details
    expect(await screen.findByText("Test Product 2")).toBeInTheDocument();
    expect(await screen.findByText("This is test product 2")).toBeInTheDocument();
  });
});
