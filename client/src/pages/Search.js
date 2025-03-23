import React from "react";
import { useNavigate } from "react-router-dom";
import Layout from "./../components/Layout";
import { useSearch } from "../context/search";
import toast from "react-hot-toast";
import { useCart } from "../context/cart";

const Search = () => {
  const navigate = useNavigate();
  const [values, setValues] = useSearch();
  const [cart, setCart] = useCart();

  const handleAddToCart = (product) => {
    setCart([...cart, product]);
    localStorage.setItem(
      "cart",
      JSON.stringify([...cart, product])
    );
    toast.success("Item Added to cart");
  }

  const handleGetMoreProductDetails = (product) => {
    navigate(`/product/${product.slug}`)
  }

  return (
    <Layout title={"Search results"}>
      <div className="container">
        <div className="text-center">
          <h1>Search Resuts</h1>
          <h6>
            {!values?.results || values?.results.length < 1
              ? "No Products Found"
              : `Found ${values?.results.length}`}
          </h6>
          <div className="d-flex flex-wrap mt-4">
            {values?.results && values?.results.length > 0 && values?.results.map((p) => (
              <div className="card m-2" style={{ width: "18rem" }}>
                <img
                  src={`/api/v1/product/product-photo/${p._id}`}
                  className="card-img-top"
                  alt={p.name}
                />
                <div className="card-body">
                  <h5 className="card-title">{p.name}</h5>
                  <p className="card-text">
                    {p.description.substring(0, 30)}...
                  </p>
                  <p className="card-text"> $ {p.price}</p>
                  <button class="btn btn-primary ms-1" onClick={() => handleGetMoreProductDetails(p)}>More Details</button>
                  <button class="btn btn-secondary ms-1" onClick={() => handleAddToCart(p)}>ADD TO CART</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Search;