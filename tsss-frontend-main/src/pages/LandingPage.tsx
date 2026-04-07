import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Zap, Users, FileText, MessageSquare, Search } from "lucide-react";
import AnimatedImageBg from "@/components/AnimatedImageBg";
import AnimatedLogo from "@/components/AnimatedLogo";

const Navbar = () => (
  <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
    <div className="container flex h-16 items-center justify-between">
      <Link to="/" className="flex items-center gap-2">
        <AnimatedLogo size="sm" />
        <span className="font-heading text-xl font-bold text-foreground">MwalimuLink</span>
      </Link>
      <div className="hidden md:flex items-center gap-8">
        <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
        <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
        <a href="#about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">About</a>
      </div>
      <div className="flex items-center gap-3">
        <Link to="/login">
          <Button variant="ghost" size="sm">Log In</Button>
        </Link>
        <Link to="/register">
          <Button size="sm">Get Started</Button>
        </Link>
      </div>
    </div>
  </nav>
);

const features = [
  {
    icon: Shield,
    title: "Verified Profiles",
    description: "Every teacher is verified using their TSC number and national ID, eliminating fraud and ensuring trust.",
  },
  {
    icon: Zap,
    title: "Smart Matching",
    description: "Our algorithm matches you based on subjects, job group, county preferences, and school type automatically.",
  },
  {
    icon: MessageSquare,
    title: "Secure Messaging",
    description: "Chat directly with your matched partners through encrypted in-app messaging — no WhatsApp needed.",
  },
  {
    icon: FileText,
    title: "Document Generation",
    description: "Auto-generate the official TSC swap application form pre-filled with both teachers' details.",
  },
  {
    icon: Search,
    title: "Advanced Search",
    description: "Filter potential swap partners by county, sub-county, subject combination, and school category.",
  },
  {
    icon: Users,
    title: "Community Trust",
    description: "Join thousands of verified TSC teachers finding swap partners safely and efficiently.",
  },
];

const steps = [
  { step: "01", title: "Register & Verify", description: "Sign up with your TSC number and verify your identity securely." },
  { step: "02", title: "Create Swap Request", description: "Specify your current station and preferred destinations." },
  { step: "03", title: "Get Matched", description: "Our algorithm finds compatible partners based on mutual preferences." },
  { step: "04", title: "Connect & Apply", description: "Chat with matches, agree on a swap, and download your TSC form." },
];

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-20 min-h-[90vh] flex items-center overflow-hidden">
        <AnimatedImageBg overlay="bg-gradient-to-r from-primary/85 via-primary/70 to-primary/50" />
        <div className="container relative z-10">
          <div className="max-w-2xl">
            <div className="animate-fade-in">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 backdrop-blur px-4 py-1.5 mb-6">
                <span className="h-2 w-2 rounded-full bg-secondary animate-pulse" />
                <span className="text-xs font-medium text-primary-foreground">Now open for TSC teachers across Kenya</span>
              </div>
              <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-primary-foreground leading-[1.1] mb-6">
                Find Your Perfect <span className="text-secondary">School Swap</span> Partner
              </h1>
              <p className="text-lg text-primary-foreground/80 max-w-lg mb-8 leading-relaxed">
                The secure, intelligent platform connecting TSC teachers seeking mutual school exchanges.
                No more WhatsApp groups — discover verified matches in minutes, not months.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/register">
                  <Button size="lg" variant="secondary" className="gap-2 text-base px-8 font-semibold">
                    Start Swapping <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <a href="#how-it-works">
                  <Button variant="outline" size="lg" className="text-base px-8 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                    Learn More
                  </Button>
                </a>
              </div>
              <div className="flex items-center gap-6 mt-10 pt-8 border-t border-primary-foreground/20">
                <div>
                  <p className="text-2xl font-heading font-bold text-primary-foreground">477K+</p>
                  <p className="text-xs text-primary-foreground/60">TSC Teachers</p>
                </div>
                <div className="h-8 w-px bg-primary-foreground/20" />
                <div>
                  <p className="text-2xl font-heading font-bold text-primary-foreground">47</p>
                  <p className="text-xs text-primary-foreground/60">Counties Covered</p>
                </div>
                <div className="h-8 w-px bg-primary-foreground/20" />
                <div>
                  <p className="text-2xl font-heading font-bold text-primary-foreground">71%</p>
                  <p className="text-xs text-primary-foreground/60">Prefer Swaps</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-muted/30">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">Features</p>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Everything You Need for a Smooth Swap
            </h2>
            <p className="text-muted-foreground">
              Built specifically for Kenyan teachers, with features designed around real swap challenges.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="group rounded-xl border border-border bg-card p-6 shadow-card hover-lift"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <feature.icon className="h-5 w-5 text-accent-foreground group-hover:text-primary-foreground" />
                </div>
                <h3 className="font-heading text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">Process</p>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-muted-foreground">
              From registration to your official swap form — in four simple steps.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((s, i) => (
              <div key={s.step} className="relative text-center" style={{ animationDelay: `${i * 0.15}s` }}>
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-full gradient-hero text-primary-foreground font-heading text-xl font-bold mb-4">
                  {s.step}
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-7 left-[60%] w-[80%] h-px bg-border" />
                )}
                <h3 className="font-heading text-lg font-semibold text-foreground mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="container">
          <div className="relative rounded-2xl gradient-hero overflow-hidden px-8 py-16 text-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,_hsl(152_55%_35%_/_0.3),_transparent_60%)]" />
            <div className="relative max-w-2xl mx-auto">
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-primary-foreground mb-4">
                Ready to Find Your Swap Partner?
              </h2>
              <p className="text-primary-foreground/80 text-lg mb-8">
                Join thousands of TSC teachers already using MwalimuLink to find verified, compatible swap matches across Kenya.
              </p>
              <Link to="/register">
                <Button size="lg" variant="secondary" className="gap-2 text-base px-8 font-semibold">
                  Create Free Account <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="about" className="border-t border-border py-12 bg-muted/30">
        <div className="container">
          <div className="grid sm:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <span className="text-sm font-bold text-primary-foreground">M</span>
                </div>
                <span className="font-heading text-lg font-bold">MwalimuLink</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Teachers' School Swapping System — a Chuka University BSc Applied Computer Science project.
              </p>
            </div>
            <div>
              <h4 className="font-heading font-semibold text-foreground mb-3">Quick Links</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a></li>
                <li><Link to="/login" className="hover:text-foreground transition-colors">Login</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-heading font-semibold text-foreground mb-3">Contact</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Vincent Kangethe Maina</li>
                <li>Chuka University</li>
                <li>EB3/61518/22</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            © 2025 MwalimuLink. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
