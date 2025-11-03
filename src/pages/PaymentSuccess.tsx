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
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const { user } = useAuth();

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

  useEffect(() => {
    // Wait for auth to initialize
    const timer = setTimeout(() => {
      setIsAuthLoading(false);
      console.log('PaymentSuccess - User state:', user ? { id: user.id, email: user.email } : 'No user');
    }, 1000);

    return () => clearTimeout(timer);
  }, [user]);

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
              {isAuthLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : user ? (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-primary shrink-0 mt-1" />
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg">Welcome Back!</h3>
                      <p className="text-sm text-muted-foreground">
                        Your leads are being prepared now. You'll receive an email when they're ready (under 60 minutes).
                      </p>
                    </div>
                  </div>
                  <div className="pt-4">
                    <Button 
                      onClick={() => window.location.href = '/dashboard'}
                      className="w-full"
                    >
                      View Dashboard
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <Mail className="w-6 h-6 text-primary shrink-0 mt-1" />
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg">Check Your Email</h3>
                      {email && (
                        <p className="text-sm text-muted-foreground">
                          We sent an email to <span className="font-medium text-foreground">{email}</span>
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        Click the <strong>"Set Password"</strong> button in the email to:
                      </p>
                      <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                        <li>Create your account password</li>
                        <li>Access your dashboard</li>
                        <li>View your order status</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {!isAuthLoading && (
                <div className="space-y-3">
                  <h4 className="font-semibold">What happens next?</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span>Your leads are being prepared now</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span>You'll receive an email when ready (under 60 min)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span>
                        {user ? (
                          "Check your dashboard to download leads"
                        ) : (
                          "Set your password to access your dashboard and download leads"
                        )}
                      </span>
                    </li>
                  </ul>
                </div>
              )}

              {!user && (
                <div className="pt-4 border-t space-y-3">
                  <Button
                    onClick={handleResendEmail}
                    variant="outline"
                    className="w-full"
                    disabled={isResending || !email}
                  >
                    {isResending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Resend Email
                  </Button>
                  
                  <p className="text-xs text-center text-muted-foreground">
                    Didn't receive the email? Check your spam folder or click Resend.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Format Upsell Section */}
          <Card className="border-primary/20 shadow-lg mt-6">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                📊 Want Different Formats?
              </CardTitle>
              <CardDescription>
                Your leads will arrive as a beautiful PDF report. Need them in another format too?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:border-primary/50 transition-colors">
                  <div className="flex-1">
                    <h4 className="font-semibold">Excel Spreadsheet (.xlsx)</h4>
                    <p className="text-sm text-muted-foreground">Full editing capabilities in Excel</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">$25</p>
                    <Button size="sm" variant="outline">Upgrade</Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:border-primary/50 transition-colors">
                  <div className="flex-1">
                    <h4 className="font-semibold">Google Sheets Ready</h4>
                    <p className="text-sm text-muted-foreground">Pre-formatted for Google import</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">$25</p>
                    <Button size="sm" variant="outline">Upgrade</Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:border-primary/50 transition-colors">
                  <div className="flex-1">
                    <h4 className="font-semibold">CRM-Optimized CSV</h4>
                    <p className="text-sm text-muted-foreground">Clean format for any CRM</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">$25</p>
                    <Button size="sm" variant="outline">Upgrade</Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border-2 border-primary rounded-lg bg-primary/5">
                  <div className="flex-1">
                    <h4 className="font-semibold">All 3 Formats</h4>
                    <p className="text-sm text-muted-foreground">Get every format instantly</p>
                    <p className="text-xs text-primary font-semibold mt-1">Save $28!</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">$47</p>
                    <Button size="sm">Get All Formats</Button>
                  </div>
                </div>
              </div>

              <Button variant="ghost" className="w-full">
                Continue Without Upgrade →
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PaymentSuccess;
