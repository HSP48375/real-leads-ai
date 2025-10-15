import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { z } from 'zod';
import { CheckCircle2 } from 'lucide-react';

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
  const [showSuccess, setShowSuccess] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const { signUp } = useAuth();
  const glowCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showSuccess) return;
    
    const glowCard = glowCardRef.current;
    if (!glowCard) return;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = glowCard.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      glowCard.style.setProperty('--pointer-x', `${x}px`);
      glowCard.style.setProperty('--pointer-y', `${y}px`);
    };

    glowCard.addEventListener('pointermove', handlePointerMove);
    return () => glowCard.removeEventListener('pointermove', handlePointerMove);
  }, [showSuccess]);

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
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div ref={glowCardRef} className="glow-card">
            <span className="glow"></span>
            <div className="card-inner bg-card border border-border rounded-lg p-8 text-center space-y-6">
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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary mb-2">Create Account</h1>
          <p className="text-muted-foreground">Start getting verified FSBO leads today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-card border border-border rounded-lg p-8">
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
  );
};

export default Signup;
