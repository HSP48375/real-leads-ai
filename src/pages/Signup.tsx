import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { z } from 'zod';
import { CheckCircle2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import Header from '@/components/Header';
import GlowingCard from '@/components/GlowingCard';

const signupSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const Signup = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const { signUp, signInWithOAuth } = useAuth();

  const handleOAuthSignIn = async (provider: 'google' | 'apple') => {
    setOauthLoading(true);
    try {
      const { error } = await signInWithOAuth(provider);
      if (error) {
        toast.error(`Failed to sign in with ${provider}`);
      }
    } catch (err) {
      toast.error('An error occurred during sign in');
    } finally {
      setOauthLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validated = signupSchema.parse({ fullName, email, password });
      const { error } = await signUp(validated.email, validated.password, validated.fullName);
      
      if (error) {
        if (error.message.includes('already registered')) {
          toast.error('This email is already registered. Please sign in instead.');
        } else {
          toast.error(error.message);
        }
      } else {
        setSignupEmail(validated.email);
        setShowSuccess(true);
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setLoading(true);
    try {
      const { error } = await signUp(signupEmail, password, fullName);
      if (!error) {
        toast.success('Confirmation email resent!');
      } else {
        toast.error('Failed to resend email. Please try again.');
      }
    } catch (err) {
      toast.error('Failed to resend email');
    } finally {
      setLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <>
      <Header />
      <div className="min-h-screen bg-background flex items-center justify-center px-4 pt-20">
        <div className="w-full max-w-md">
          <GlowingCard>
            <div className="bg-card border border-border rounded-lg p-8 text-center space-y-6">
              {/* Success Icon */}
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="w-12 h-12 text-primary" />
                </div>
              </div>

              {/* Heading */}
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-foreground">Account Created! 🎉</h1>
                <p className="text-xl text-muted-foreground">Check your email to verify your account</p>
              </div>

              {/* Body Text */}
              <div className="space-y-4 py-4">
                <p className="text-base text-foreground">
                  We sent a confirmation link to{' '}
                  <span className="font-semibold text-primary">{signupEmail}</span>
                </p>
                <p className="text-base text-muted-foreground">
                  Click the link in that email to activate your account and start ordering leads.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-4">
                <Button 
                  onClick={handleResendEmail} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Sending...' : "Didn't receive the email? Resend"}
                </Button>
                <Link to="/" className="block">
                  <Button variant="outline" className="w-full">
                    Back to Home
                  </Button>
                </Link>
              </div>

              {/* Help Text */}
              <p className="text-xs text-muted-foreground pt-4">
                Check your spam folder if you don't see it within 5 minutes.
              </p>
            </div>
          </GlowingCard>
        </div>
      </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-background flex items-center justify-center px-4 pt-20">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary mb-2">Create Account</h1>
          <p className="text-muted-foreground">Start getting verified FSBO leads today</p>
        </div>

        <GlowingCard>
          <form onSubmit={handleSubmit} className="space-y-6 bg-card border border-border rounded-lg p-8">
          {/* OAuth Buttons */}
          <div className="space-y-4">
            <Button
              type="button"
              variant="outline"
              className="w-full bg-white hover:bg-gray-50 text-gray-900 border-gray-300"
              onClick={() => handleOAuthSignIn('google')}
              disabled={oauthLoading || loading}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>

            <Button
              type="button"
              className="w-full bg-black hover:bg-gray-900 text-white"
              onClick={() => handleOAuthSignIn('apple')}
              disabled={oauthLoading || loading}
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Continue with Apple
            </Button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or continue with email</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            <p className="text-xs text-muted-foreground">Must be at least 8 characters</p>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
          </form>
        </GlowingCard>

        <p className="text-center text-xs text-muted-foreground">
          By signing up, you agree to our{' '}
          <Link to="/terms-of-service" className="text-primary hover:underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link to="/privacy-policy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
      </div>
    </>
  );
};

export default Signup;
