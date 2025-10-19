import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Check, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import GlowingCard from "@/components/GlowingCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

interface OrderParams {
  tier: string;
  billing: 'onetime' | 'monthly';
  price: number;
  leads: string;
}

interface OrderFormProps {
  orderParams: OrderParams;
}

const OrderForm = ({ orderParams }: OrderFormProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    primary_city: "",
    search_radius: "25",
    additional_cities: "",
    tier: orderParams.tier,
    billing: orderParams.billing,
    price: orderParams.price
  });
  
  const tierFeatures: Record<string, string[]> = {
    starter: [
      "20-25 verified FSBO leads",
      "Phone number + property address",
      "Choose your coverage area",
      "Delivered within 1 hour",
      "Email support"
    ],
    growth: [
      "40-50 verified FSBO leads",
      "Phone number + property address",
      "Choose your coverage area",
      "Delivered within 1 hour",
      "Priority support"
    ],
    pro: [
      "110-130 verified FSBO leads",
      "Phone number + property address",
      "Choose your coverage area",
      "Delivered within 1 hour",
      "Priority support"
    ],
    enterprise: [
      "150-200 verified FSBO leads",
      "Phone number + property address",
      "Choose your coverage area",
      "Delivered within 1 hour",
      "Dedicated account manager"
    ]
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      console.log("Submitting order:", formData);

      // Parse additional cities
      const additionalCitiesArray = formData.additional_cities
        ? formData.additional_cities.split(",").map(city => city.trim()).filter(Boolean)
        : [];

      // Call the create-checkout-session edge function
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          tier: formData.tier,
          billing: formData.billing,
          price: formData.price,
          leads: orderParams.leads,
          primary_city: formData.primary_city,
          search_radius: parseInt(formData.search_radius),
          additional_cities: additionalCitiesArray,
          name: formData.name,
          email: formData.email,
          user_id: user?.id || null,
        },
      });

      if (error) {
        console.error("Error creating checkout session:", error);
        throw error;
      }

      console.log("Checkout session created:", data);

      // Redirect to Stripe checkout
      if (data.sessionUrl) {
        window.open(data.sessionUrl, '_blank');
        
        toast({
          title: "Checkout opened!",
          description: "Complete your payment in the new tab.",
        });
      } else {
        throw new Error("No session URL returned");
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const features = tierFeatures[orderParams.tier] || [];
  
  const scrollToPricing = () => {
    const element = document.getElementById('pricing');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/', { state: { scrollTo: 'pricing' } });
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <Button
        variant="ghost"
        onClick={scrollToPricing}
        className="mb-6 text-primary hover:text-primary/90"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Change Plan
      </Button>
      <div className="grid md:grid-cols-2 gap-8">
        {/* Order Summary */}
        <GlowingCard>
          <Card className="border-0 h-full">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">
                Your Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <p className="text-xl font-bold capitalize">{orderParams.tier}</p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="text-lg font-semibold">
                    {orderParams.billing === 'monthly' ? 'Monthly Subscription' : 'One-Time Purchase'}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Price</p>
                  <p className="text-3xl font-bold text-primary">
                    ${orderParams.price}
                    {orderParams.billing === 'monthly' && <span className="text-lg">/month</span>}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="font-semibold mb-3">What You Get:</p>
                <ul className="space-y-2">
                  {features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                  {orderParams.billing === 'monthly' && (
                    <>
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">New leads every month</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">Cancel anytime</span>
                      </li>
                    </>
                  )}
                </ul>
              </div>

            </CardContent>
          </Card>
        </GlowingCard>

        {/* Order Form */}
        <GlowingCard>
          <Card className="border-0 h-full">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">
                Your Details
              </CardTitle>
              <CardDescription>
                We'll create your account automatically
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    placeholder="john@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="John Smith"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="primary_city">Primary City</Label>
                  <Input
                    id="primary_city"
                    type="text"
                    value={formData.primary_city}
                    onChange={(e) => setFormData({ ...formData, primary_city: e.target.value })}
                    required
                    placeholder="Detroit, Ann Arbor, Lansing"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="search_radius">Search Radius</Label>
                  <Select
                    value={formData.search_radius}
                    onValueChange={(value) => setFormData({ ...formData, search_radius: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25 miles</SelectItem>
                      <SelectItem value="50">50 miles</SelectItem>
                      <SelectItem value="75">75 miles</SelectItem>
                      <SelectItem value="100">100 miles</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="additional_cities">Additional Cities (Optional)</Label>
                  <Input
                    id="additional_cities"
                    type="text"
                    value={formData.additional_cities}
                    onChange={(e) => setFormData({ ...formData, additional_cities: e.target.value })}
                    placeholder="Royal Oak, Troy"
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated
                  </p>
                </div>

                <div className="flex items-start gap-2 pt-2">
                  <input type="checkbox" required className="mt-1" />
                  <p className="text-xs text-muted-foreground">
                    I agree to the <a href="/terms-of-service" className="underline">Terms of Service</a> and <a href="/privacy-policy" className="underline">Privacy Policy</a>
                  </p>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-gold hover:opacity-90 text-primary-foreground font-semibold"
                  size="lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? "Processing..." : 
                    orderParams.billing === 'monthly' ? "Start Subscription →" : "Continue to Payment →"
                  }
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Already have an account? <a href="/login" className="text-primary underline">Login</a>
                </p>
              </form>
            </CardContent>
          </Card>
        </GlowingCard>
      </div>
    </div>
  );
};

export default OrderForm;