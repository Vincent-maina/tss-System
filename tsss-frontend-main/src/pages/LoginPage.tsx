import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ArrowRight, CheckCircle, Shield } from "lucide-react";
import AnimatedImageBg from "@/components/AnimatedImageBg";
import AnimatedLogo from "@/components/AnimatedLogo";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login, user, logout } = useAuth();

  // If already logged in, prompt action safely inside an effect
  useEffect(() => {
    if (user) {
      if (window.confirm(`You are already logged in as ${user.firstName}. Do you want to log out to access a different account?`)) {
        logout();
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, navigate, logout]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await login({ email, password });
      
      if (response && response.success) {
        toast.success("Login successful!");
        
        const userData = response.data?.user || response.user;
        const ADMIN_EMAIL = 'graphitechsoftwares@gmail.com';
        
        if (userData?.role === 'admin' || userData?.email === ADMIN_EMAIL) {
          navigate("/admin");
        } else {
          navigate("/dashboard");
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to log in");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-8">
      {/* Full-screen animated background */}
      <AnimatedImageBg overlay="bg-gradient-to-br from-primary/80 via-primary/60 to-black/70" />

      {/* Floating card */}
      <div className="relative z-10 w-full max-w-5xl grid lg:grid-cols-[1.1fr_1fr] rounded-2xl overflow-hidden shadow-2xl border border-primary-foreground/10 backdrop-blur-sm bg-background/5">

        {/* Left info panel */}
        <div className="hidden lg:flex flex-col justify-between p-10 bg-primary/30 backdrop-blur-md border-r border-primary-foreground/10">
          <div>
            <div className="flex items-center gap-3 mb-12">
              <AnimatedLogo size="md" />
              <span className="font-heading text-2xl font-bold text-primary-foreground tracking-tight">MwalimuLink</span>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 border border-primary-foreground/10 px-4 py-1.5 mb-6">
              <Shield className="h-3.5 w-3.5 text-secondary" />
              <span className="text-xs font-medium text-primary-foreground/90">TSC Verified Platform</span>
            </div>

            <h2 className="font-heading text-4xl font-bold text-primary-foreground mb-4 leading-tight">
              Welcome Back,<br />
              <span className="text-secondary">Teacher</span>
            </h2>
            <p className="text-primary-foreground/60 text-base leading-relaxed max-w-sm">
              Continue finding your perfect swap partner across Kenya's 47 counties.
            </p>
          </div>

          <div className="flex items-center gap-8 pt-8 border-t border-primary-foreground/10">
            {[
              { value: "18K+", label: "Annual Swaps" },
              { value: "85%", label: "Match Rate" },
              { value: "47", label: "Counties" },
            ].map((stat, i) => (
              <div key={i}>
                <p className="text-2xl font-heading font-bold text-primary-foreground">{stat.value}</p>
                <p className="text-[11px] text-primary-foreground/40 uppercase tracking-wider mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right form panel */}
        <div className="flex flex-col justify-center p-8 sm:p-10 bg-background/95 backdrop-blur-xl">
          {/* Mobile branding */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <AnimatedLogo size="sm" />
            <span className="font-heading text-xl font-bold">MwalimuLink</span>
          </div>

          <div className="mb-8">
            <h1 className="font-heading text-3xl font-bold text-foreground mb-2">Log In</h1>
            <p className="text-muted-foreground">Enter your credentials to access your account.</p>
          </div>

          <form className="space-y-5" onSubmit={handleLogin}>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email or TSC Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                placeholder="e.g. TSC/12345 or email@example.com"
                className="h-12 bg-muted/40 border-border/60 focus:bg-background transition-colors"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password <span className="text-destructive">*</span>
                </Label>
                <button type="button" className="text-xs text-primary hover:underline font-medium">Forgot password?</button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="h-12 bg-muted/40 border-border/60 focus:bg-background transition-colors pr-12"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="block pt-1">
              <Button type="submit" disabled={isLoading} className="w-full h-12 text-base font-semibold gap-2 group" size="lg">
                {isLoading ? "Logging in..." : "Log In"}
                {!isLoading && <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />}
              </Button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-border/50">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {["Encrypted", "TSC Verified", "Secure"].map((item) => (
                <div key={item} className="flex items-center gap-1.5">
                  <CheckCircle className="h-3 w-3 text-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary font-semibold hover:underline">Register here</Link>
          </p>
          <Link to="/" className="block text-center text-xs text-muted-foreground mt-4 hover:text-foreground transition-colors">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
