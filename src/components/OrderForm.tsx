import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const OrderForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    city: "",
    tier: "",
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // TODO: Replace with actual API call when backend is ready
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Order Received!",
        description: "Your leads will be delivered within 24 hours. Check your email for confirmation.",
      });
      
      // Reset form
      setFormData({ name: "", email: "", city: "", tier: "" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="order-form" className="py-20 bg-background">
      <div className="container px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="backdrop-blur-glass bg-card/40 border-primary/30 shadow-gold-glow animate-fade-in">
            <CardHeader>
              <CardTitle className="text-3xl text-center">
                Get Your <span className="bg-gradient-gold bg-clip-text text-transparent">Verified Leads</span>
              </CardTitle>
              <CardDescription className="text-center text-base">
                Fill out the form below and we'll deliver fresh, geo-verified leads within 24 hours
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
                  <Label htmlFor="city">City or Zip Code</Label>
                  <Input
                    id="city"
                    placeholder="Los Angeles, CA or 90001"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                    className="bg-background/50 border-border/50 focus:border-primary transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tier">Select Pricing Tier</Label>
                  <Select value={formData.tier} onValueChange={(value) => setFormData({ ...formData, tier: value })} required>
                    <SelectTrigger className="bg-background/50 border-border/50 focus:border-primary transition-colors">
                      <SelectValue placeholder="Choose your plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">Starter - $97 (15-25 leads)</SelectItem>
                      <SelectItem value="growth">Growth - $197 (40-60 leads)</SelectItem>
                      <SelectItem value="pro">Pro - $397 (100-150 leads)</SelectItem>
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
                      <span className="relative z-10">Place Order</span>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center mt-4">
                  By submitting this form, you agree to receive your leads and order confirmation via email.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default OrderForm;
