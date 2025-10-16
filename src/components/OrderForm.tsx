import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import GlowingCard from "@/components/GlowingCard";
import { supabase } from "@/integrations/supabase/client";

const OrderForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    primary_city: "",
    search_radius: "50",
    additional_cities: "",
    tier: "",
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Parse additional cities (comma-separated, limit to 5)
      const additionalCitiesArray = formData.additional_cities
        .split(",")
        .map(c => c.trim())
        .filter(c => c.length > 0)
        .slice(0, 5);

      // Create Stripe checkout session
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          tier: formData.tier,
          primary_city: formData.primary_city,
          search_radius: parseInt(formData.search_radius),
          additional_cities: additionalCitiesArray,
          name: formData.name,
          email: formData.email,
        },
      });

      if (error) throw error;

      // Redirect to Stripe checkout
      if (data.sessionUrl) {
        window.open(data.sessionUrl, '_blank');
        
        toast({
          title: "Redirecting to Checkout",
          description: "Complete your payment to start lead generation.",
        });
        
        // Reset form
        setFormData({
          name: "",
          email: "",
          primary_city: "",
          search_radius: "50",
          additional_cities: "",
          tier: "",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="order-form" className="py-20 relative">
      <div className="container px-4">
        <div className="max-w-2xl mx-auto">
          <GlowingCard>
            <Card className="backdrop-blur-glass bg-card/60 border-transparent shadow-none animate-fade-in">
            <CardHeader>
              <CardTitle className="text-3xl text-center">
                Get Your <span className="text-primary font-bold">Verified Leads</span>
              </CardTitle>
              <CardDescription className="text-center text-base">
                Fill out the form below and we'll deliver fresh, geo-verified leads in under 1 hour
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="bg-background/50 border-border/50 focus:border-primary transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="bg-background/50 border-border/50 focus:border-primary transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="primary_city">Primary City or Home Base</Label>
                  <Input
                    id="primary_city"
                    placeholder="e.g., Royal Oak, Birmingham, Farmington Hills"
                    value={formData.primary_city}
                    onChange={(e) => setFormData({ ...formData, primary_city: e.target.value })}
                    required
                    className="bg-background/50 border-border/50 focus:border-primary transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="search_radius">Search Radius</Label>
                  <Select value={formData.search_radius} onValueChange={(value) => setFormData({ ...formData, search_radius: value })} required>
                    <SelectTrigger className="bg-background/50 border-border/50 focus:border-primary transition-colors">
                      <SelectValue placeholder="Select radius" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25 miles</SelectItem>
                      <SelectItem value="50">50 miles (recommended)</SelectItem>
                      <SelectItem value="75">75 miles</SelectItem>
                      <SelectItem value="100">100 miles</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    We'll find FSBO leads in your city plus all surrounding areas
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="additional_cities">Additional Cities (Optional)</Label>
                  <Input
                    id="additional_cities"
                    placeholder="e.g., Ann Arbor, Ypsilanti"
                    value={formData.additional_cities}
                    onChange={(e) => setFormData({ ...formData, additional_cities: e.target.value })}
                    className="bg-background/50 border-border/50 focus:border-primary transition-colors"
                  />
                  <p className="text-xs text-muted-foreground">
                    Add up to 5 cities that fall outside your radius (comma-separated)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tier">Select Pricing Tier</Label>
                  <Select value={formData.tier} onValueChange={(value) => setFormData({ ...formData, tier: value })} required>
                    <SelectTrigger className="bg-background/50 border-border/50 focus:border-primary transition-colors">
                      <SelectValue placeholder="Choose your plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">Starter - $97 (20-25 verified FSBO leads)</SelectItem>
                      <SelectItem value="growth">Growth - $197 (40-60 verified FSBO leads)</SelectItem>
                      <SelectItem value="pro">Pro - $397 (80-100 verified FSBO leads)</SelectItem>
                      <SelectItem value="enterprise">Enterprise - $597/month (120-150 verified FSBO leads per month)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-gold hover:opacity-90 hover:shadow-gold-glow text-primary-foreground font-semibold shadow-gold transition-all duration-300 group relative overflow-hidden"
                  size="lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <span className="relative z-10">Proceed to Payment</span>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center mt-4">
                  You'll be redirected to secure Stripe checkout. Your leads will be generated after payment confirmation.
                </p>
              </form>
            </CardContent>
          </Card>
          </GlowingCard>
        </div>
      </div>
    </section>
  );
};

export default OrderForm;
