import DashboardLayout from "@/components/DashboardLayout";
import AnimatedImageBg from "@/components/AnimatedImageBg";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ArrowRight, TrendingUp, Users, Clock, CheckCircle, X, Send, Megaphone, AlertCircle, Check, ChevronsUpDown } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { KENYA_COUNTIES, ALL_COUNTIES, KENYAN_SUBJECT_COMBINATIONS } from "@/lib/kenyaData";

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Redirect admin to admin dashboard if they try to access normal dashboard
  useEffect(() => {
    if (user?.role === 'admin' || user?.email === "graphitechsoftwares@gmail.com") {
      navigate('/admin', { replace: true });
    }
  }, [user, navigate]);

  const prevStatusRef = useRef<Record<string, string>>({});

  const [showSwapModal, setShowSwapModal] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [swapForm, setSwapForm] = useState({
    currentCounty: user?.currentStation?.county || "",
    currentSubCounty: "",
    currentSchool: "",
    subjectCombination: user?.subjects?.join(" / ") || "",
    desiredCounties: [] as string[],
    desiredSubCounties: [] as string[],
    desiredSchool: "",
    reason: "",
    urgency: "Medium",
    schoolType: [] as string[],
  });
  const [selectedCounty, setSelectedCounty] = useState("");
  const [selectedSubCounty, setSelectedSubCounty] = useState("");

  const availableCurrentSubCounties = swapForm.currentCounty ? KENYA_COUNTIES[swapForm.currentCounty] || [] : [];
  const availableDesiredSubCounties = swapForm.desiredCounties.flatMap(c => KENYA_COUNTIES[c] || []);

  const { data: matchesResponse, isLoading } = useQuery({
    queryKey: ["recentMatches"],
    queryFn: () => fetchApi("/matches"),
    refetchInterval: 15000,
  });

  const { data: myRequestResponse } = useQuery({
    queryKey: ["mySwapRequests"],
    queryFn: () => fetchApi("/swap-requests/my/requests"),
    refetchInterval: 15000,
  });

  const { data: announcementsResp } = useQuery({
    queryKey: ["announcements"],
    queryFn: () => fetchApi("/users/announcements"),
    refetchInterval: 30000, // Poll less frequently for announcements
  });

  const dynamicMatches = matchesResponse?.data || [];
  const myRequests = myRequestResponse?.data || [];
  const announcements = announcementsResp?.data || [];
  const hasActiveRequest = myRequests.some((r: any) => ['active', 'pending_approval', 'matched'].includes(r.status));
  const activeRequestDoc = myRequests.find((r: any) => ['active', 'pending_approval'].includes(r.status));

  // Status popups tracker
  useEffect(() => {
    if (myRequests && myRequests.length > 0) {
      myRequests.forEach((req: any) => {
        const prevStatus = prevStatusRef.current[req._id];
        if (prevStatus && prevStatus !== req.status) {
          if (req.status === 'approved' || req.status === 'active') {
            toast.success('Your swap request is APPROVED and now active in the matching pool!');
          } else if (req.status === 'rejected') {
            toast.error('Your swap request has been REJECTED by the admin.');
          } else if (req.status === 'matched') {
            toast.success('You have been MATCHED! You can now view matches and connect.');
          }
        }
        prevStatusRef.current[req._id] = req.status;
      });
    }
  }, [myRequests]);

  const dynamicStats = [
    { label: "Potential Matches", value: dynamicMatches.length.toString(), icon: Users, color: "text-primary" },
    { label: "My Swap Requests", value: myRequests.length.toString(), icon: Clock, color: "text-warning" },
    { label: "Match Score (Avg)", value: dynamicMatches.length ? `${Math.round(dynamicMatches.reduce((acc: any, m: any) => acc + (m.compatibilityScore || 0), 0) / dynamicMatches.length)}%` : "0%", icon: TrendingUp, color: "text-success" },
    { label: "Completed Swaps", value: myRequests.filter((m: any) => m.status === 'approved').length.toString(), icon: CheckCircle, color: "text-info" },
  ];

  const postSwapMutation = useMutation({
    mutationFn: () => fetchApi(activeRequestId ? `/swap-requests/${activeRequestId}` : "/swap-requests", {
      method: activeRequestId ? "PUT" : "POST",
      body: JSON.stringify({
        desiredCounties: swapForm.desiredCounties,
        desiredSubCounties: swapForm.desiredSubCounties,
        desiredSchool: swapForm.desiredSchool,
        currentCounty: swapForm.currentCounty,
        currentSubCounty: swapForm.currentSubCounty,
        currentSchool: swapForm.currentSchool,
        subjectCombination: swapForm.subjectCombination ? swapForm.subjectCombination.split('/').map((s: string) => s.trim()).filter(Boolean) : undefined,
        reason: swapForm.reason,
        preferences: {
          urgency: swapForm.urgency,
          schoolType: swapForm.schoolType.length ? swapForm.schoolType : ["Day", "Boarding", "Day & Boarding"],
        }
      })
    }),
    onSuccess: () => {
      toast.success(activeRequestId ? "Swap request updated successfully!" : "Swap request posted successfully! The admin will review and run matching.");
      setShowSwapModal(false);
      setActiveRequestId(null);
      setSwapForm(prev => ({ ...prev, desiredCounties: [], desiredSubCounties: [], desiredSchool: "", reason: "" }));
      queryClient.invalidateQueries({ queryKey: ["mySwapRequests"] });
    },
    onError: (e: any) => {
      toast.error(e.message || "Failed to post swap request");
    }
  });

  const addCounty = () => {
    if (selectedCounty && !swapForm.desiredCounties.includes(selectedCounty)) {
      setSwapForm(f => ({ ...f, desiredCounties: [...f.desiredCounties, selectedCounty] }));
      setSelectedCounty("");
    }
  };

  const removeCounty = (c: string) => {
    setSwapForm(f => ({
      ...f,
      desiredCounties: f.desiredCounties.filter(x => x !== c),
      desiredSubCounties: f.desiredSubCounties.filter(subC => !KENYA_COUNTIES[c]?.includes(subC))
    }));
  };

  const addSubCounty = () => {
    if (selectedSubCounty && !swapForm.desiredSubCounties.includes(selectedSubCounty)) {
      setSwapForm(f => ({ ...f, desiredSubCounties: [...f.desiredSubCounties, selectedSubCounty] }));
      setSelectedSubCounty("");
    }
  };

  const removeSubCounty = (c: string) => {
    setSwapForm(f => ({ ...f, desiredSubCounties: f.desiredSubCounties.filter(x => x !== c) }));
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        {/* Hero banner */}
        <div className="relative rounded-2xl overflow-hidden mb-8 h-48">
          <AnimatedImageBg overlay="bg-primary/60" />
          <div className="relative z-10 flex flex-col justify-center h-full px-8">
            <h1 className="font-heading text-3xl font-bold text-white drop-shadow-lg">Welcome back, {user?.firstName || 'Teacher'} 👋</h1>
            <p className="text-white/80 mt-2 text-lg">Here's an overview of your swap activity.</p>
          </div>
        </div>

        {/* Global Announcements */}
        {announcements.length > 0 && (
          <div className="mb-8 space-y-4">
            <h2 className="font-heading font-semibold text-foreground flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" /> System Announcements
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {announcements.map((ann: any) => (
                <Card key={ann._id} className="p-4 border-l-4 shadow-sm" style={{ borderLeftColor: ann.priority === 'high' ? '#ef4444' : ann.priority === 'low' ? '#3b82f6' : '#eab308' }}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {ann.priority === 'high' ? <AlertCircle className="h-5 w-5 text-destructive" /> : <Megaphone className="h-5 w-5 text-primary" />}
                    </div>
                    <div>
                      <h3 className="font-heading font-medium">{ann.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{ann.content}</p>
                      <p className="text-xs text-muted-foreground/60 mt-2">
                        {new Date(ann.createdAt).toLocaleDateString()} at {new Date(ann.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by Admin
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {dynamicStats.map((stat) => (
            <Card key={stat.label} className="p-5 shadow-card hover-lift">
              <div className="flex items-center justify-between mb-3">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-heading font-bold text-foreground">
                {isLoading ? "..." : stat.value}
              </p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Matches */}
          <div className="lg:col-span-2">
            <Card className="shadow-card">
              <div className="flex items-center justify-between p-5 border-b border-border">
                <h2 className="font-heading font-semibold text-foreground">Recent Matches</h2>
                <Link to="/matches">
                  <Button variant="ghost" size="sm" className="gap-1 text-primary">
                    View All <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
              <div className="divide-y divide-border">
                {isLoading ? (
                  <div className="p-5 text-center text-muted-foreground">Loading matches...</div>
                ) : dynamicMatches.length === 0 ? (
                  <div className="p-5 text-center text-muted-foreground">No matches yet. Post a swap request to get started!</div>
                ) : (
                  dynamicMatches.slice(0, 5).map((match: any, index: number) => {
                    const other = match.teacher1?._id === user?._id ? match.teacher2 : match.teacher1;
                    return (
                      <div key={index} className="p-5 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center">
                              <span className="text-sm font-semibold text-accent-foreground">
                                {other?.firstName?.[0] || "T"}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{other?.firstName} {other?.lastName}</p>
                              <p className="text-sm text-muted-foreground">{other?.subjects?.join(" / ")} • {other?.currentStation?.county}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-sm font-semibold ${match.compatibilityScore >= 85 ? "text-success" : "text-warning"}`}>
                              {match.compatibilityScore}%
                            </span>
                            <Button size="sm" variant="outline" onClick={() => navigate("/messages")}>Chat</Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2 px-1">
                          <div className="text-[11px] text-muted-foreground">
                            Subject <strong>{match.scoreBreakdown?.mutualSubject || 0}/25</strong>
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            County <strong>{match.scoreBreakdown?.mutualCounty || 0}/25</strong>
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Sub-C <strong>{match.scoreBreakdown?.mutualSubcounty || 0}/25</strong>
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            School <strong>{match.scoreBreakdown?.mutualSchool || 0}/25</strong>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="shadow-card p-5">
            <h2 className="font-heading font-semibold text-foreground mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link to="/matches" className="block">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Users className="h-4 w-4" /> Browse Matches
                </Button>
              </Link>
              <Link to="/profile" className="block">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <TrendingUp className="h-4 w-4" /> Update Profile
                </Button>
              </Link>
              <Button
                variant="default"
                className={cn(
                  "w-full justify-start gap-2 h-11",
                  activeRequestDoc && "bg-orange-500 hover:bg-orange-600 text-white border-none shadow-md font-bold"
                )}
                onClick={() => {
                  if (activeRequestDoc) {
                    navigate("/my-swaps");
                  } else {
                    setActiveRequestId(null);
                    setShowSwapModal(true);
                  }
                }}
              >
                <Send className="h-4 w-4" />
                {activeRequestDoc ? "View / Edit Active Request" : "Post Swap Request"}
              </Button>
              {activeRequestDoc && activeRequestDoc.status === 'pending_approval' && (
                <p className="text-xs text-muted-foreground text-center">Your request is awaiting admin approval.</p>
              )}
            </div>

            <div className="mt-6 rounded-lg bg-accent p-4">
              <h3 className="font-heading text-sm font-semibold text-accent-foreground mb-1">Profile Tip</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Complete your profile with all subjects and preferences to improve your match accuracy by up to 40%.
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Post Swap Request Modal ─────────────────── */}
      {showSwapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading text-xl font-bold">Post Swap Request</h2>
              <button onClick={() => setShowSwapModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">

              <div className="bg-muted/30 p-3 rounded-lg space-y-3">
                <h3 className="font-semibold text-sm">Your Current Details</h3>

                <div className="space-y-1.5">
                  <Label className="text-xs">Current County</Label>
                  <Select value={swapForm.currentCounty} onValueChange={v => setSwapForm(f => ({ ...f, currentCounty: v, currentSubCounty: "" }))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select county..." /></SelectTrigger>
                    <SelectContent>
                      {ALL_COUNTIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Current Sub-County</Label>
                    <Select disabled={!swapForm.currentCounty} value={swapForm.currentSubCounty} onValueChange={v => setSwapForm(f => ({ ...f, currentSubCounty: v }))}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select sub-county" /></SelectTrigger>
                      <SelectContent className="max-h-56">
                        {availableCurrentSubCounties.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Current School</Label>
                    <Input className="h-8 text-sm" placeholder="e.g. Nairobi High" value={swapForm.currentSchool} onChange={e => setSwapForm(f => ({ ...f, currentSchool: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Subject Combination Taught</Label>
                  <div className="relative">
                    <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={comboboxOpen}
                          className="w-full justify-between h-8 bg-background border-input font-normal hover:bg-background text-sm"
                        >
                          {swapForm.subjectCombination || "Select subjects..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search combination..." className="h-8" />
                          <CommandList>
                            <CommandEmpty>No combination found.</CommandEmpty>
                            <CommandGroup className="max-h-64 overflow-y-auto">
                              {KENYAN_SUBJECT_COMBINATIONS.map((subject) => (
                                <CommandItem
                                  key={subject}
                                  value={subject}
                                  onSelect={(currentValue) => {
                                    setSwapForm(f => ({ ...f, subjectCombination: currentValue === swapForm.subjectCombination ? "" : currentValue }));
                                    setComboboxOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      swapForm.subjectCombination === subject ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {subject}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              <div className="bg-primary/5 p-3 rounded-lg space-y-3 border border-primary/10">
                <h3 className="font-semibold text-sm text-primary">Your Desired Destination</h3>
                <div>
                  <Label className="text-xs font-medium">Desired Counties <span className="text-destructive">*</span></Label>
                  <div className="flex gap-2 mt-1">
                    <Select value={selectedCounty} onValueChange={setSelectedCounty}>
                      <SelectTrigger className="flex-1 h-8 text-sm">
                        <SelectValue placeholder="Add county..." />
                      </SelectTrigger>
                      <SelectContent>
                        {ALL_COUNTIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="sm" onClick={addCounty}>Add</Button>
                  </div>
                  {swapForm.desiredCounties.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {swapForm.desiredCounties.map(c => (
                        <span key={c} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[10px] px-2 py-1 rounded-full border border-primary/20">
                          {c} <button onClick={() => removeCounty(c)}><X className="h-3 w-3 hover:text-destructive" /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-xs font-medium">Desired Sub-Counties (Optional)</Label>
                    <div className="flex gap-2">
                      <Select disabled={availableDesiredSubCounties.length === 0} value={selectedSubCounty} onValueChange={setSelectedSubCounty}>
                        <SelectTrigger className="flex-1 h-8 text-sm">
                          <SelectValue placeholder="Add exact sub-county..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-56">
                          {availableDesiredSubCounties.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="outline" size="sm" disabled={!selectedSubCounty} onClick={addSubCounty}>Add</Button>
                    </div>
                    {swapForm.desiredSubCounties.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {swapForm.desiredSubCounties.map(c => (
                          <span key={c} className="inline-flex items-center gap-1 bg-secondary/30 text-secondary-foreground text-[10px] px-2 py-1 rounded-full border border-secondary/20">
                            {c} <button onClick={() => removeSubCounty(c)}><X className="h-3 w-3 hover:text-destructive" /></button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-xs">Specific School (Optional)</Label>
                    <Input className="h-8 text-sm border-primary/20" placeholder="e.g. Alliance High" value={swapForm.desiredSchool} onChange={e => setSwapForm(f => ({ ...f, desiredSchool: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Urgency</Label>
                  <Select value={swapForm.urgency} onValueChange={v => setSwapForm(f => ({ ...f, urgency: v }))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Low", "Medium", "High", "Urgent"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Reason for transfer</Label>
                <Textarea
                  className="text-sm resize-none"
                  placeholder="Briefly describe why you want to swap..."
                  value={swapForm.reason}
                  onChange={e => setSwapForm(f => ({ ...f, reason: e.target.value }))}
                  maxLength={1000}
                  rows={2}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowSwapModal(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={swapForm.desiredCounties.length === 0 || postSwapMutation.isPending}
                onClick={() => postSwapMutation.mutate()}
              >
                {postSwapMutation.isPending ? "Posting..." : "Post Request"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
};

export default DashboardPage;
