import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import Header from '@/components/Header';

const passwordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [showResend, setShowResend] = useState(false);
  const [emailForResend, setEmailForResend] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Create Password | Real Leads';
    
    // Extract recovery tokens from URL hash or query params
    const hash = window.location.hash ? window.location.hash.substring(1) : '';
    const hashParams = new URLSearchParams(hash);
    const searchParams = new URLSearchParams(window.location.search);

    const type = hashParams.get('type') || searchParams.get('type');
    const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');
    
    // If we have recovery tokens, establish the session
    if (type === 'recovery' && accessToken && refreshToken) {
      setIsRecovery(true);
      
      // Set the session from the recovery tokens
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }).then(({ error }) => {
        if (error) {
          console.error('Error setting session from recovery tokens:', error);
          setTokenError('This link is invalid or has expired.');
          setShowResend(true);
          toast.error('Invalid or expired reset link. Please request a new one.');
        }
      });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTokenError(null);

    try {
      const validated = passwordSchema.parse({ password, confirmPassword });

      const { error } = await supabase.auth.updateUser({
        password: validated.password,
      });

      if (error) {
        toast.error(error.message);
        if (/expired|invalid/i.test(error.message)) {
          setTokenError('This link is invalid or has expired.');
          setShowResend(true);
        }
      } else {
        toast.success('Password updated successfully!');
        navigate('/dashboard');
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    const email = emailForResend.trim();
    try {
      z.string().email().parse(email);
    } catch {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsResending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success('Reset link sent! Check your inbox.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset link.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-background flex items-center justify-center px-4 pt-20">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-primary mb-2">Create Your Password</h1>
            <p className="text-muted-foreground">
              {isRecovery ? 'Enter a new password to secure your account' : 'Enter your new password below'}
            </p>
          </div>

          {tokenError && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-md p-4">
              {tokenError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 bg-card border border-border rounded-lg p-8">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Updating...' : 'Set Password'}
            </Button>
          </form>

          {showResend && (
            <div className="bg-card border border-border rounded-lg p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resendEmail">Email address</Label>
                <Input
                  id="resendEmail"
                  type="email"
                  value={emailForResend}
                  onChange={(e) => setEmailForResend(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <Button onClick={handleResend} variant="outline" className="w-full" disabled={isResending}>
                {isResending ? 'Sending...' : 'Request new link'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ResetPassword;
