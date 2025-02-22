import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import axios from "axios";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import CreateProduct from "./CreateProduct";
import AdminRoute from "../../components/Routes/AdminRoute";
import toast from "react-hot-toast";

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

describe("Create Product Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockAuth = {
    ok: true
  }

  const mockData = {
    success: true,
    category: [
      {_id: "1", name: "Electronics"},
      {_id: "2", name: "Clothing"},
      {_id: "3", name: "Book"},
    ]
  }

  it("renders Create Product page", async () => {
    // Mock axios GET requests
    axios.get
			.mockResolvedValueOnce({ data: mockAuth }) // For authCheck()
      .mockResolvedValueOnce({ data: mockData }) // For getAllCategory()

    render(
      <MemoryRouter initialEntries={["/dashboard/admin/create-product"]}>
        <Routes>
					<Route path="/dashboard" element={<AdminRoute />}>
						<Route path="admin/create-product" element={<CreateProduct />} />
       	 	</Route>	
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(2);
    });

    expect(await screen.findByTestId("create-product-title")).toBeInTheDocument();
    expect(await screen.findByText("Select a category")).toBeInTheDocument();
    expect(await screen.findByPlaceholderText("write a name")).toBeInTheDocument();
    expect(await screen.findByPlaceholderText("write a description")).toBeInTheDocument();
    expect(await screen.findByPlaceholderText("write a Price")).toBeInTheDocument();
    expect(await screen.findByPlaceholderText("write a quantity")).toBeInTheDocument();
    expect(await screen.findByText("Select Shipping")).toBeInTheDocument();
    expect(await screen.findByText("CREATE PRODUCT")).toBeInTheDocument();
  });

  it("shows error toast with error message on unsuccessful product creation", async () => {
    // Mock axios GET requests
    axios.get
      .mockResolvedValueOnce({ data: mockAuth }) // For authCheck()
      .mockResolvedValueOnce({ data: mockData }) // For getAllCategory()

    // Mock axios POST request
    axios.post.mockRejectedValueOnce({ response: { data: { error: "Category is required" } } });

    render(
      <MemoryRouter initialEntries={["/dashboard/admin/create-product"]}>
        <Routes>
          <Route path="/dashboard" element={<AdminRoute />}>
            <Route path="admin/create-product" element={<CreateProduct />} />
          </Route>	
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(2);
    });

    fireEvent.click(screen.getByText("CREATE PRODUCT"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Category is required");
    });
  });

  it("shows success toast on successful product creation", async () => {
    // Mock axios GET requests
    axios.get
      .mockResolvedValueOnce({ data: mockAuth }) // For authCheck()
      .mockResolvedValueOnce({ data: mockData }) // For getAllCategory()

    // Mock axios POST request
    axios.post.mockResolvedValueOnce({ data: { success: true } });

    render(
      <MemoryRouter initialEntries={["/dashboard/admin/create-product"]}>
        <Routes>
          <Route path="/dashboard" element={<AdminRoute />}>
            <Route path="admin/create-product" element={<CreateProduct />} />
          </Route>	
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(2);
    });

    fireEvent.click(screen.getByText("CREATE PRODUCT"));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Product Created Successfully");
    });
  });
});
