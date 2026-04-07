import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, ArrowRight, CheckCircle, Users, Zap, MessageSquare, FileText } from "lucide-react";
import AnimatedImageBg from "@/components/AnimatedImageBg";
import AnimatedLogo from "@/components/AnimatedLogo";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const features = [
  { icon: Users, label: "TSC-verified accounts" },
  { icon: Zap, label: "Smart matching" },
  { icon: MessageSquare, label: "Secure messaging" },
  { icon: FileText, label: "Form generation" },
];

const RegisterPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    tscNumber: "",
    nationalId: "",
    email: "",
    phoneNumber: "",
    schoolType: "",
    password: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { register, user, logout } = useAuth();

  useEffect(() => {
    if (user) {
      if (window.confirm(`You are already logged in as ${user.firstName}. Do you want to log out to access a different account?`)) {
        logout();
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, navigate, logout]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation matching backend rules
    const cleanTsc = formData.tscNumber.replace(/\D/g, '');
    if (cleanTsc.length !== 6) {
      toast.error("TSC number must be exactly 6 digits");
      return;
    }
    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (!/^(\+254|0)[17]\d{8}$/.test(formData.phoneNumber)) {
      toast.error("Please provide a valid Kenyan phone number (e.g., 0712345678)");
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        tscNumber: cleanTsc,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        password: formData.password,
        schoolType: formData.schoolType || 'Day'
      };
      await register(payload);
      toast.success("Account created successfully! Please log in.");
      navigate("/login");
    } catch (error: any) {
      // Format backend validation errors if they exist, otherwise show general error
      const errorMsg = error?.errors?.[0]?.msg || error.message || "Failed to create account";
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-8">
      {/* Full-screen animated background */}
      <AnimatedImageBg overlay="bg-gradient-to-br from-primary/80 via-primary/60 to-black/70" />

      {/* Floating card */}
      <div className="relative z-10 w-full max-w-5xl grid lg:grid-cols-[1fr_1.2fr] rounded-2xl overflow-hidden shadow-2xl border border-primary-foreground/10 backdrop-blur-sm bg-background/5">

        {/* Left info panel */}
        <div className="hidden lg:flex flex-col justify-between p-10 bg-primary/30 backdrop-blur-md border-r border-primary-foreground/10">
          <div>
            <div className="flex items-center gap-3 mb-10">
              <AnimatedLogo size="md" />
              <span className="font-heading text-2xl font-bold text-primary-foreground tracking-tight">MwalimuLink</span>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-secondary/20 border border-secondary/20 px-4 py-1.5 mb-6">
              <span className="h-2 w-2 rounded-full bg-secondary animate-pulse" />
              <span className="text-xs font-medium text-primary-foreground/90">Registration Open</span>
            </div>

            <h2 className="font-heading text-4xl font-bold text-primary-foreground mb-4 leading-tight">
              Join <span className="text-secondary">MwalimuLink</span><br />Today
            </h2>
            <p className="text-primary-foreground/60 text-base leading-relaxed max-w-sm">
              Create your verified profile and discover compatible swap partners.
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-2 gap-3 pt-8 border-t border-primary-foreground/10">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-xl bg-primary-foreground/[0.07] border border-primary-foreground/[0.08] px-3 py-2.5">
                <f.icon className="h-4 w-4 text-secondary shrink-0" />
                <span className="text-xs text-primary-foreground/80">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right form panel */}
        <div className="flex flex-col justify-center p-8 sm:p-10 bg-background/95 backdrop-blur-xl overflow-y-auto max-h-[90vh]">
          {/* Mobile branding */}
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <AnimatedLogo size="sm" />
            <span className="font-heading text-xl font-bold">MwalimuLink</span>
          </div>

          <div className="mb-6">
            <h1 className="font-heading text-3xl font-bold text-foreground mb-2">Create Account</h1>
            <p className="text-muted-foreground text-sm">
              Fields marked with <span className="text-destructive">*</span> are required.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleRegister}>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-sm font-medium">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input id="firstName" placeholder="e.g. Vincent" className="h-11 bg-muted/40 border-border/60 focus:bg-background transition-colors" required value={formData.firstName} onChange={handleChange} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-sm font-medium">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input id="lastName" placeholder="e.g. Maina" className="h-11 bg-muted/40 border-border/60 focus:bg-background transition-colors" required value={formData.lastName} onChange={handleChange} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tscNumber" className="text-sm font-medium">
                  TSC Number <span className="text-destructive">*</span>
                </Label>
                <Input id="tscNumber" placeholder="e.g. 123456" className="h-11 bg-muted/40 border-border/60 focus:bg-background transition-colors" required value={formData.tscNumber} onChange={handleChange} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nationalId" className="text-sm font-medium">
                  National ID <span className="text-destructive">*</span>
                </Label>
                <Input id="nationalId" placeholder="e.g. 12345678" className="h-11 bg-muted/40 border-border/60 focus:bg-background transition-colors" required value={formData.nationalId} onChange={handleChange} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address <span className="text-destructive">*</span>
              </Label>
              <Input id="email" type="email" placeholder="you@example.com" className="h-11 bg-muted/40 border-border/60 focus:bg-background transition-colors" required value={formData.email} onChange={handleChange} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-sm font-medium">
                  Phone Number <span className="text-destructive">*</span>
                </Label>
                <Input id="phoneNumber" placeholder="e.g. 0712345678" className="h-11 bg-muted/40 border-border/60 focus:bg-background transition-colors" required value={formData.phoneNumber} onChange={handleChange} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  School Type <span className="text-destructive">*</span>
                </Label>
                <Select onValueChange={(val) => setFormData(p => ({ ...p, schoolType: val }))} value={formData.schoolType}>
                  <SelectTrigger className="h-11 bg-muted/40 border-border/60">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Day">Day School</SelectItem>
                    <SelectItem value="Boarding">Boarding School</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="regPassword" className="text-sm font-medium">
                Password <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  className="h-11 bg-muted/40 border-border/60 focus:bg-background transition-colors pr-12"
                  required
                  value={formData.password}
                  onChange={handleChange}
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
                {isLoading ? "Creating..." : "Create Account"}
                {!isLoading && <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />}
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-border/50">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {["Encrypted", "TSC Verified", "Secure"].map((item) => (
                <div key={item} className="flex items-center gap-1.5">
                  <CheckCircle className="h-3 w-3 text-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-5">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-semibold hover:underline">Log in</Link>
          </p>
          <Link to="/" className="block text-center text-xs text-muted-foreground mt-3 hover:text-foreground transition-colors">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
