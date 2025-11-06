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
import { Loader2, Check, RotateCcw } from "lucide-react";
import { useState, useEffect } from "react";
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
  onTierChange?: (tierValue: string, price: number, leads: string) => void;
}

const US_STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" }
];

const OrderForm = ({ orderParams, onTierChange }: OrderFormProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastOrderData, setLastOrderData] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    city: "",
    state: "",
    search_radius: "25",
    additional_cities: "",
    tier: orderParams.tier,
    billing: orderParams.billing,
    price: orderParams.price
  });


  // Fetch user profile and last order on mount for logged-in users
  useEffect(() => {
    if (user) {
      fetchUserDataAndLastOrder();
    }
  }, [user]);

  const fetchUserDataAndLastOrder = async () => {
    try {
      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user!.id)
        .maybeSingle();

      // Fetch last order
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .or(`user_id.eq.${user!.id},customer_email.eq.${user!.email}`)
        .order('created_at', { ascending: false })
        .limit(1);

      const lastOrder = orders?.[0];
      
      if (lastOrder) {
        setLastOrderData(lastOrder);
        // Auto-fill form with last order data
        setFormData(prev => ({
          ...prev,
          name: lastOrder.customer_name || profile?.full_name || "",
          email: user!.email || lastOrder.customer_email || "",
          city: lastOrder.primary_city || "",
          state: lastOrder.primary_state || "",
          search_radius: lastOrder.search_radius?.toString() || "25",
          additional_cities: lastOrder.additional_cities?.join(", ") || "",
        }));
      } else {
        // Just pre-fill name and email for new customers
        setFormData(prev => ({
          ...prev,
          name: profile?.full_name || "",
          email: user!.email || "",
        }));
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const handleUsePreviousSettings = () => {
    if (lastOrderData) {
      setFormData(prev => ({
        ...prev,
        city: lastOrderData.primary_city || "",
        state: lastOrderData.primary_state || "",
        search_radius: lastOrderData.search_radius?.toString() || "25",
        additional_cities: lastOrderData.additional_cities?.join(", ") || "",
      }));
      toast({
        title: "Settings applied",
        description: "Previous order settings have been loaded.",
      });
    }
  };
  
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

      // Validate required fields
      if (!formData.city || !formData.state) {
        toast({
          title: "Missing Required Fields",
          description: "Please fill in both city and state.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Check if email exists for guest checkout
      if (!user) {
        const { data: emailCheck, error: emailCheckError } = await supabase.functions.invoke('check-email-exists', {
          body: { email: formData.email }
        });
        
        if (!emailCheckError && emailCheck?.exists && emailCheck?.hasPassword) {
          toast({
            title: "Account Already Exists",
            description: "This email already has an account. Please log in to continue.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          
          // Redirect to login with return URL
          setTimeout(() => {
            navigate(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
          }, 2000);
          
          return;
        }
      }

      // Parse additional cities
      const additionalCitiesArray = formData.additional_cities
        ? formData.additional_cities.split(",").map(city => city.trim()).filter(Boolean)
        : [];

      // Call the create-checkout-session edge function
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          tier: orderParams.tier,
          billing: orderParams.billing,
          price: orderParams.price,
          leads: orderParams.leads,
          city: formData.city,
          state: formData.state,
          search_radius: parseInt(formData.search_radius),
          additional_cities: additionalCitiesArray,
          name: formData.name,
          email: formData.email,
          // Security: Never send user_id from client - server derives it from email
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
  
  return (
    <div className="space-y-6">
      {/* What You Get Section - Shows selected tier benefits */}
      <GlowingCard>
        <Card className="border-0">
          <CardHeader>
            <CardTitle className="text-xl font-bold">
              What You Get - <span className="capitalize text-primary">{orderParams.tier}</span>
            </CardTitle>
            <CardDescription>
              {orderParams.billing === 'monthly' ? 'Monthly Subscription' : 'One-Time Purchase'} - ${orderParams.price}{orderParams.billing === 'monthly' && '/month'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
              {features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
              {orderParams.billing === 'monthly' && (
                <>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">New leads every month</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Cancel anytime</span>
                  </li>
                </>
              )}
            </ul>
          </CardContent>
        </Card>
      </GlowingCard>

      {/* Order Form */}
      <GlowingCard>
        <Card className="border-0">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">
                Your Details
              </CardTitle>
              {!user && (
                <CardDescription>
                  We'll create your account automatically
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {lastOrderData && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleUsePreviousSettings}
                    className="w-full mb-2 border-primary/50 hover:border-primary hover:bg-primary/10"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Use Previous Order Settings
                  </Button>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    placeholder="john@example.com"
                    disabled={!!user}
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
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                    placeholder="Detroit"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Select
                    value={formData.state}
                    onValueChange={(value) => setFormData({ ...formData, state: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((state) => (
                        <SelectItem key={state.code} value={state.code}>
                          {state.name} ({state.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="search_radius">Search Radius *</Label>
                  <Select
                    value={formData.search_radius}
                    onValueChange={(value) => setFormData({ ...formData, search_radius: value })}
                    required
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

                {!user && (
                  <p className="text-center text-sm text-muted-foreground">
                    Already have an account? <a href="/login" className="text-primary underline">Login</a>
                  </p>
                )}
              </form>
            </CardContent>
        </Card>
      </GlowingCard>
    </div>
  );
};

export default OrderForm;