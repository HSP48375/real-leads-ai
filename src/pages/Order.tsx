import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import OrderForm from "@/components/OrderForm";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Order = () => {
  const [searchParams] = useSearchParams();
  const tierParam = searchParams.get("tier");
  
  // Default to growth if no tier specified
  const [initialTier, setInitialTier] = useState<string>("growth");

  useEffect(() => {
    if (tierParam && ["starter", "growth", "pro", "enterprise"].includes(tierParam)) {
      setInitialTier(tierParam);
    }
  }, [tierParam]);

  return (
    <div className="min-h-screen relative bg-background">
      <Header />
      <div className="pt-20">
        <OrderForm initialTier={initialTier} />
      </div>
      <Footer />
    </div>
  );
};

export default Order;
