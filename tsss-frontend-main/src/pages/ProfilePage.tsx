import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { User, MapPin, BookOpen, Building, Shield, RefreshCw, Check, ChevronsUpDown, AlertCircle, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { fetchApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { KENYA_COUNTIES, ALL_COUNTIES, KENYAN_SUBJECT_COMBINATIONS } from "@/lib/kenyaData";

const JOB_GROUPS = ["B5", "C1", "C2", "C3", "C4", "C5", "D1", "D2", "D3", "D4", "D5", "E1", "E2", "E3"];

const ProfilePage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  // Fetch fresh profile from API
  const { data: profileResp, isLoading } = useQuery({
    queryKey: ["myProfile"],
    queryFn: () => fetchApi("/users/profile"),
    enabled: !!user,
  });
  const profile = profileResp?.data || user;

  // Local form state seeded from live profile
  const [personal, setPersonal] = useState({ firstName: "", lastName: "", phoneNumber: "", bio: "" });
  const [teaching, setTeaching] = useState({ subjects: "", jobGroup: "", schoolName: "", county: "", subCounty: "" });

  const availableSubCounties = teaching.county ? KENYA_COUNTIES[teaching.county] || [] : [];

  useEffect(() => {
    if (profile) {
      setPersonal({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        phoneNumber: profile.phoneNumber || "",
        bio: profile.bio || "",
      });
      setTeaching({
        subjects: (profile.subjects || []).join(" / "),
        jobGroup: profile.jobGroup || "",
        schoolName: profile.currentStation?.schoolName || "",
        county: profile.currentStation?.county || "",
        subCounty: profile.currentStation?.subCounty || "",
      });
    }
  }, [profile]);

  const savePersonalMutation = useMutation({
    mutationFn: () => fetchApi("/users/profile", {
      method: "PUT",
      body: JSON.stringify({
        firstName: personal.firstName,
        lastName: personal.lastName,
        phoneNumber: personal.phoneNumber,
        bio: personal.bio,
      }),
    }),
    onSuccess: () => {
      toast.success("Personal details saved!");
      queryClient.invalidateQueries({ queryKey: ["myProfile"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to save"),
  });

  const saveTeachingMutation = useMutation({
    mutationFn: () => fetchApi("/users/profile", {
      method: "PUT",
      body: JSON.stringify({
        subjects: teaching.subjects.split("/").map(s => s.trim()).filter(Boolean),
        jobGroup: teaching.jobGroup,
        currentStation: {
          ...(profile?.currentStation || {}),
          schoolName: teaching.schoolName,
          county: teaching.county,
          subCounty: teaching.subCounty,
        },
      }),
    }),
    onSuccess: () => {
      toast.success("Teaching details saved!");
      queryClient.invalidateQueries({ queryKey: ["myProfile"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to save"),
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" /> Loading your profile…
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="animate-fade-in max-w-4xl">
        <div className="mb-8">
          <h1 className="font-heading text-2xl font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your personal and teaching details.</p>
        </div>

        {/* Profile Header */}
        <Card className="shadow-card p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
              {profile?.firstName?.[0] || <User className="h-7 w-7" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h2 className="font-heading text-xl font-bold text-foreground">
                  {profile?.firstName} {profile?.lastName}
                </h2>
                {profile?.tscVerified && (
                  <Badge className="bg-primary/10 text-primary border-0 gap-1">
                    <Shield className="h-3 w-3" /> TSC Verified
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-2">{profile?.email}</p>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {profile?.subjects && profile.subjects.length > 0 ? (
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" /> {profile.subjects.join(" / ")}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-destructive font-medium">
                    <AlertCircle className="h-3.5 w-3.5" /> Profile Incomplete
                  </span>
                )}
                {profile?.currentStation?.county ? (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {profile.currentStation.county}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-muted-foreground italic">
                    Station not set
                  </span>
                )}
                {profile?.jobGroup ? (
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" /> Job Group {profile.jobGroup}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-muted-foreground italic">
                    Grade not set
                  </span>
                )}
                <span className="font-medium text-primary ml-2">{profile?.tscNumber}</span>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Personal Details */}
          <Card className="shadow-card p-6">
            <h3 className="font-heading font-semibold text-foreground mb-4">Personal Details</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input value={personal.firstName} onChange={e => setPersonal(p => ({ ...p, firstName: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input value={personal.lastName} onChange={e => setPersonal(p => ({ ...p, lastName: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>TSC Number</Label>
                <Input value={profile?.tscNumber || ""} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={profile?.email || ""} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={personal.phoneNumber}
                  onChange={e => setPersonal(p => ({ ...p, phoneNumber: e.target.value }))}
                  placeholder="+254712345678"
                />
              </div>
              <div className="space-y-2">
                <Label>Bio (Optional)</Label>
                <Textarea
                  rows={3}
                  maxLength={500}
                  value={personal.bio}
                  onChange={e => setPersonal(p => ({ ...p, bio: e.target.value }))}
                  placeholder="A short description about yourself..."
                />
              </div>
              <Button
                className="w-full"
                disabled={savePersonalMutation.isPending}
                onClick={() => savePersonalMutation.mutate()}
              >
                {savePersonalMutation.isPending ? "Saving…" : "Save Personal Details"}
              </Button>
            </div>
          </Card>

          {/* Teaching Details */}
          <Card className="shadow-card p-6">
            <h3 className="font-heading font-semibold text-foreground mb-4">Teaching Details</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Subject Combination</Label>
                <p className="text-xs text-muted-foreground">Search and select your TSC teaching subjects</p>
                <div className="relative">
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between bg-background border-input font-normal hover:bg-background"
                      >
                        {teaching.subjects || "Select subject combination..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search combination..." />
                        <CommandList>
                          <CommandEmpty>No combination found.</CommandEmpty>
                          <CommandGroup>
                            {KENYAN_SUBJECT_COMBINATIONS.map((subject) => (
                              <CommandItem
                                key={subject}
                                value={subject}
                                onSelect={(currentValue) => {
                                  setTeaching(p => ({ ...p, subjects: currentValue === teaching.subjects ? "" : currentValue }));
                                  setOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    teaching.subjects === subject ? "opacity-100" : "opacity-0"
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
              <div className="space-y-2">
                <Label>Job Group</Label>
                <Select value={teaching.jobGroup} onValueChange={v => setTeaching(p => ({ ...p, jobGroup: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select job group" /></SelectTrigger>
                  <SelectContent>
                    {JOB_GROUPS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Current School Name</Label>
                <Input
                  value={teaching.schoolName}
                  onChange={e => setTeaching(p => ({ ...p, schoolName: e.target.value }))}
                  placeholder="School name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Current County</Label>
                  <Select value={teaching.county} onValueChange={v => setTeaching(p => ({ ...p, county: v, subCounty: "" }))}>
                    <SelectTrigger><SelectValue placeholder="Select county" /></SelectTrigger>
                    <SelectContent>
                      {ALL_COUNTIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Current Sub-County</Label>
                  <Select disabled={!teaching.county} value={teaching.subCounty} onValueChange={v => setTeaching(p => ({ ...p, subCounty: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select sub-county" /></SelectTrigger>
                    <SelectContent className="max-h-56">
                      {availableSubCounties.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                className="w-full"
                disabled={saveTeachingMutation.isPending}
                onClick={() => saveTeachingMutation.mutate()}
              >
                {saveTeachingMutation.isPending ? "Saving…" : "Save Teaching Details"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage;
