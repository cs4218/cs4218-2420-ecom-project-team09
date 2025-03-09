import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import axios from "axios";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import UpdateProduct from "./UpdateProduct";
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

describe("Update Product Component", () => {
   beforeEach(() => {
      jest.clearAllMocks();
   });

   const mockAuth = {
      ok: true,
   };

   const mockCategories = {
      success: true,
      category: [
         { _id: "1", name: "Electronics" },
         { _id: "2", name: "Clothing" },
         { _id: "3", name: "Book" },
      ],
   };

   const mockProduct = {
      product: {
         name: "Test Product",
         _id: "123",
         description: "Test Description",
         price: 100,
         quantity: 10,
         shipping: true,
         category: { _id: "1", name: "Electronics" },
      },
   };

   it("renders Update Product page", async () => {
      // Mock axios GET requests
      axios.get
         .mockResolvedValueOnce({ data: mockAuth }) // For authCheck()
         .mockResolvedValueOnce({ data: mockProduct }) // For get-product
         .mockResolvedValueOnce({ data: mockCategories }); // For getAllCategory()

      render(
         <MemoryRouter initialEntries={["/dashboard/admin/update-product"]}>
            <Routes>
               <Route path="/dashboard" element={<AdminRoute />}>
                  <Route path="admin/update-product" element={<UpdateProduct />} />
               </Route>
            </Routes>
         </MemoryRouter>
      );

      await waitFor(() => {
         expect(axios.get).toHaveBeenCalledTimes(3);
      });

      expect(await screen.findByTestId("update-product-title")).toBeInTheDocument();
      expect(await screen.findByText("UPDATE PRODUCT")).toBeInTheDocument();
      expect(await screen.findByText("DELETE PRODUCT")).toBeInTheDocument();
   });

   it("shows Product Updated Successfully toast on successful Update", async () => {
      // Mock axios GET requests
      axios.get
         .mockResolvedValueOnce({ data: mockAuth }) // For authCheck()
         .mockResolvedValueOnce({ data: mockProduct }) // For getSingleProduct()
         .mockResolvedValueOnce({ data: mockCategories }); // For getAllCategory()

      axios.put.mockResolvedValueOnce({ data: { success: true } });

      render(
         <MemoryRouter initialEntries={["/dashboard/admin/update-product"]}>
            <Routes>
               <Route path="/dashboard" element={<AdminRoute />}>
                  <Route path="admin/update-product" element={<UpdateProduct />} />
               </Route>
            </Routes>
         </MemoryRouter>
      );

      await waitFor(() => {
         expect(axios.get).toHaveBeenCalledTimes(3);
      });

      fireEvent.click(screen.getByText("UPDATE PRODUCT"));

      await waitFor(() => {
         expect(toast.success).toHaveBeenCalledWith("Product Updated Successfully");
      });
   });

   it("shows error toast with error message on unsuccessful product Update", async () => {
      // Mock axios GET requests
      axios.get
         .mockResolvedValueOnce({ data: mockAuth }) // For authCheck()
         .mockResolvedValueOnce({ data: mockProduct }) // For getSingleProduct()
         .mockResolvedValueOnce({ data: mockCategories }); // For getAllCategory()

      axios.put.mockResolvedValueOnce({ data: { message: "Category is required" } });

      render(
         <MemoryRouter initialEntries={["/dashboard/admin/update-product"]}>
            <Routes>
               <Route path="/dashboard" element={<AdminRoute />}>
                  <Route path="admin/update-product" element={<UpdateProduct />} />
               </Route>
            </Routes>
         </MemoryRouter>
      );

      await waitFor(() => {
         expect(axios.get).toHaveBeenCalledTimes(3);
      });

      fireEvent.click(screen.getByText("UPDATE PRODUCT"));

      await waitFor(() => {
         expect(toast.error).toHaveBeenCalledWith("Category is required");
      });
   });

   it("shows Product Deleted Successfully toast on successful Delete", async () => {
      // Mock axios GET requests
      axios.get
         .mockResolvedValueOnce({ data: mockAuth }) // For authCheck()
         .mockResolvedValueOnce({ data: mockProduct }) // For getSingleProduct()
         .mockResolvedValueOnce({ data: mockCategories }); // For getAllCategory()

      axios.delete.mockResolvedValueOnce({ data: { success: true } });

      render(
         <MemoryRouter initialEntries={["/dashboard/admin/update-product"]}>
            <Routes>
               <Route path="/dashboard" element={<AdminRoute />}>
                  <Route path="admin/update-product" element={<UpdateProduct />} />
               </Route>
            </Routes>
         </MemoryRouter>
      );

      await waitFor(() => {
         expect(axios.get).toHaveBeenCalledTimes(3);
      });

      // Mock window.prompt
      window.prompt = jest.fn().mockReturnValue("Sure");

      fireEvent.click(screen.getByText("DELETE PRODUCT"));

      await waitFor(() => {
         expect(toast.success).toHaveBeenCalledWith("Product Deleted Successfully");
      });
   });

   it("shows error toast with error message on unsuccessful product Delete", async () => {
      // Mock axios GET requests
      axios.get
         .mockResolvedValueOnce({ data: mockAuth }) // For authCheck()
         .mockResolvedValueOnce({ data: mockProduct }) // For getSingleProduct()
         .mockResolvedValueOnce({ data: mockCategories }); // For getAllCategory()

      axios.delete.mockRejectedValueOnce({ response: { data: { error: "Product could not be deleted" } } });

      render(
         <MemoryRouter initialEntries={["/dashboard/admin/update-product"]}>
            <Routes>
               <Route path="/dashboard" element={<AdminRoute />}>
                  <Route path="admin/update-product" element={<UpdateProduct />} />
               </Route>
            </Routes>
         </MemoryRouter>
      );

      await waitFor(() => {
         expect(axios.get).toHaveBeenCalledTimes(3);
      });

      // Mock window.prompt
      window.prompt = jest.fn().mockReturnValue("Sure");

      fireEvent.click(screen.getByText("DELETE PRODUCT"));

      await waitFor(() => {
         expect(toast.error).toHaveBeenCalledWith("Product could not be deleted");
      });
   });
});
