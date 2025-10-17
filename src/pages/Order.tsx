import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import OrderForm from "@/components/OrderForm";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Order = () => {
  const [searchParams] = useSearchParams();
  
  // Extract all order params from URL
  const orderParams = {
    tier: searchParams.get("tier") || "growth",
    billing: searchParams.get("billing") as 'onetime' | 'monthly' || "onetime",
    price: parseInt(searchParams.get("price") || "197"),
    leads: searchParams.get("leads") || "40-50"
  };

  return (
    <div className="min-h-screen relative bg-background">
      <Header />
      <div className="pt-20">
        <OrderForm orderParams={orderParams} />
      </div>
      <Footer />
    </div>
  );
};

export default Order;
