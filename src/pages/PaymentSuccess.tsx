import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState<string>("");
  const [isResending, setIsResending] = useState(false);
  const { session, loading } = useAuth();

  useEffect(() => {
    // Try to get email from session storage or URL
    const sessionEmail = sessionStorage.getItem("checkout_email");
    const urlEmail = searchParams.get("email");
    
    if (sessionEmail) {
      setEmail(sessionEmail);
      sessionStorage.removeItem("checkout_email"); // Clean up
    } else if (urlEmail) {
      setEmail(urlEmail);
    }
  }, [searchParams]);


  const handleResendEmail = async () => {
    if (!email) {
      toast.error("Email address not found. Please contact support.");
      return;
    }

    setIsResending(true);
    try {
      // Trigger password reset to resend email
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast.success("Email resent! Check your inbox.");
    } catch (error) {
      console.error("Error resending email:", error);
      toast.error("Failed to resend email. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen relative bg-background">
      <Header />
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-2xl mx-auto">
          <Card className="border-primary/20 shadow-lg">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-primary" />
              </div>
              <CardTitle className="text-3xl font-bold">
                Payment Successful!
              </CardTitle>
              <CardDescription className="text-lg">
                Thank you for your order
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-6 max-w-lg mx-auto">
                <h4 className="font-semibold text-xl text-center">What happens next?</h4>
                <ul className="space-y-4 text-base text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <span className="text-primary font-bold text-xl">•</span>
                    <span>Your leads are being prepared now</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary font-bold text-xl">•</span>
                    <span>You'll receive an email when ready (under 60 min)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary font-bold text-xl">•</span>
                    <span>Check your dashboard to download leads</span>
                  </li>
                </ul>
                
                {session && (
                  <div className="pt-4 text-center">
                    <Button 
                      onClick={() => window.location.href = '/dashboard'}
                      size="lg"
                      className="w-full max-w-xs"
                    >
                      Go to Dashboard
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* CSV Format Info Card */}
          <Card className="border-primary/20 shadow-lg mt-6">
            <CardContent className="pt-6 space-y-4">
              <div className="text-center space-y-3">
                <div className="text-4xl mb-2">📊</div>
                <h4 className="font-semibold text-lg">Your Leads Will Arrive as CSV Format</h4>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-4 text-left space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  CSV is a universally accepted file format that opens in Excel, Google Sheets, Numbers, and most spreadsheet apps.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your confirmation email includes step-by-step instructions for:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1.5 ml-4">
                  <li>• Windows & Mac computers</li>
                  <li>• iPhone & Android devices</li>
                  <li>• Web-based spreadsheet apps</li>
                </ul>
                <p className="text-sm text-muted-foreground leading-relaxed pt-2">
                  This ensures your leads display perfectly regardless of which device you use.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PaymentSuccess;
