import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Mitchell",
    role: "Independent Realtor",
    location: "Austin, TX",
    content: "Finally, a lead service that actually delivers what they promise. Got 23 FSBO leads, closed 2 deals in the first month. The ROI is unbelievable.",
    rating: 5
  },
  {
    name: "Mike Davidson",
    role: "Real Estate Investor",
    location: "Phoenix, AZ",
    content: "I've tried every lead service out there. RealtyLeadsAI is the only one that gives me fresh data I can actually use. No more cold calling dead leads.",
    rating: 5
  },
  {
    name: "Kathleen B.",
    role: "Team Leader",
    location: "Birmingham, MI",
    content: "My team was wasting hours searching for leads. Now we get them delivered, verified, and ready to call. Game changer for our business.",
    rating: 5
  }
];

const Testimonials = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Trusted by
            <span className="bg-gradient-gold bg-clip-text text-transparent"> Real Professionals</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Join thousands of realtors who've ditched cold lists for verified leads.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.name} className="border-border">
              <CardContent className="pt-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-foreground mb-6 italic">"{testimonial.content}"</p>
                <div>
                  <p className="font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.location}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
