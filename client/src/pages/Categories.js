import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import useCategory from "../hooks/useCategory";
import Layout from "../components/Layout";

const Categories = () => {
  const categories = useCategory();

  return (
    <Layout title={"All Categories"}>
      <div className="container py-4">
        <h2 className="text-center mb-4">Product Categories</h2>
        <div className="row justify-content-center">
          {categories.map((c) => (
            // Fixed button display and alignment bugs
            <div className="col-md-4 col-sm-6 mb-4" key={c._id}>
              <Link 
                to={`/category/${c.slug}`} 
                className="btn btn-primary w-100 py-3 d-flex align-items-center justify-content-center"
              >
                {c.name}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Categories;