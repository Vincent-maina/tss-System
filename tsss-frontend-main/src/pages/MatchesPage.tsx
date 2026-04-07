import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, BookOpen, Building, MessageSquare, RefreshCw, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useState } from "react";

const KENYA_COUNTIES = [
  "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet", "Embu", "Garissa", "Homa Bay", "Isiolo",
  "Kajiado", "Kakamega", "Kericho", "Kiambu", "Kilifi", "Kirinyaga", "Kisii", "Kisumu", "Kitui",
  "Kwale", "Laikipia", "Lamu", "Machakos", "Makueni", "Mandera", "Marsabit", "Meru", "Migori",
  "Mombasa", "Murang'a", "Nairobi", "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua", "Nyeri",
  "Samburu", "Siaya", "Taita-Taveta", "Tana River", "Tharaka-Nithi", "Trans Nzoia", "Turkana",
  "Uasin Gishu", "Vihiga", "Wajir", "West Pokot"
];

const MatchesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: matchesResponse, isLoading, isError, error } = useQuery({
    queryKey: ["potentialMatches"],
    queryFn: () => fetchApi("/matches/potential"),
    refetchInterval: 30000,
  });

  const dynamicMatches = matchesResponse?.data || [];

  // Express interest in a match (triggers initial message)
  const expressInterestMutation = useMutation({
    mutationFn: (matchId: string) => fetchApi(`/matches/${matchId}/interest`, { method: "POST" }),
    onSuccess: (_, matchId) => {
      toast.success("Interest expressed! You can now chat with this teacher.");
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      navigate("/messages");
    },
    onError: (e: any) => {
      toast.error(e.message || "Could not connect. Make sure you both have active swap requests.");
    }
  });

  // Filter by search term
  const filtered = dynamicMatches.filter((m: any) => {
    const other = m.teacher1?._id === user?._id || m.teacher1?.id === user?.id ? m.teacher2 : m.teacher1;
    const name = `${other?.firstName || ''} ${other?.lastName || ''}`.toLowerCase();
    const subjects = (other?.subjects || []).join(' ').toLowerCase();
    const county = (other?.currentStation?.county || '').toLowerCase();
    return name.includes(search.toLowerCase()) || subjects.includes(search.toLowerCase()) || county.includes(search.toLowerCase());
  });

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="font-heading text-2xl font-bold text-foreground">Browse Matches</h1>
          <p className="text-muted-foreground mt-1">Discover compatible swap partners ranked by live compatibility heuristics.</p>
        </div>

        {/* Filters */}
        <Card className="shadow-card p-5 mb-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, subject, or county..."
                className="pl-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select>
              <SelectTrigger><SelectValue placeholder="County" /></SelectTrigger>
              <SelectContent>
                {KENYA_COUNTIES.map(c => (
                  <SelectItem key={c} value={c.toLowerCase()}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger><SelectValue placeholder="School Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="boarding">Boarding</SelectItem>
                <SelectItem value="day-boarding">Day & Boarding</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger><SelectValue placeholder="Job Group" /></SelectTrigger>
              <SelectContent>
                {["B5", "C1", "C2", "C3", "C4", "C5", "D1", "D2", "D3"].map(g => (
                  <SelectItem key={g} value={g.toLowerCase()}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Match Cards */}
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-primary/30" />
            <p>Scanning for potential swap partners...</p>
          </div>
        ) : isError ? (
          <Card className="p-12 text-center border-destructive/20 bg-destructive/5">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to load matches</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              {(error as any)?.message || "Something went wrong while searching. Please try again or complete your profile."}
            </p>
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["potentialMatches"] })}>
              Try Again
            </Button>
          </Card>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {dynamicMatches.length === 0
              ? "No matches yet. Post a swap request from your Dashboard to get matched!"
              : "No matches found for your search."}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((m: any, index: number) => {
              const other = m.teacher1?._id === user?._id || m.teacher1?.id === user?.id ? m.teacher2 : m.teacher1;
              return (
                <Card key={m._id || index} className="shadow-card hover-lift overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-full bg-accent flex items-center justify-center">
                          <span className="text-sm font-semibold text-accent-foreground">
                            {other?.firstName?.[0] || "T"}
                          </span>
                        </div>
                        <div>
                          <p className="font-heading font-semibold text-foreground">{other?.firstName} {other?.lastName}</p>
                          <Badge variant="secondary" className="text-xs mt-0.5">{other?.jobGroup}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`text-lg font-heading font-bold ${m.matchLevel === 'Green' ? "text-success" :
                          m.matchLevel === 'Blue' ? "text-[#3b82f6]" :
                            m.matchLevel === 'Yellow' ? "text-warning" :
                              m.compatibilityScore === 100 ? "text-success" :
                                m.compatibilityScore >= 75 ? "text-[#3b82f6]" :
                                  m.compatibilityScore >= 50 ? "text-warning" : "text-muted-foreground"
                          }`}>
                          {m.compatibilityScore}%
                        </div>
                        {m.matchLevel && m.matchLevel !== 'None' && (
                          <span className={`h-2.5 w-2.5 rounded-full ${m.matchLevel === 'Green' ? "bg-success" :
                            m.matchLevel === 'Blue' ? "bg-[#3b82f6]" :
                              "bg-warning"
                            }`} />
                        )}
                      </div>
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>{(other?.subjects || []).join(" / ")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{other?.currentStation?.county} County</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Building className="h-3.5 w-3.5" />
                        <span className={m.adminApproved !== true ? "italic" : ""}>
                          {m.adminApproved === true
                            ? `${other?.currentStation?.schoolName || 'Station Name'} ${other?.currentStation?.schoolType ? `(${other?.currentStation?.schoolType})` : ''}`
                            : "School hidden pending authorization"}
                        </span>
                      </div>
                    </div>

                    {/* Match Factors Breakdown */}
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Match Factors Breakdown</p>
                      <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                        <div className={`p-1.5 rounded-md border ${m.scoreBreakdown?.mutualSubject > 0 ? "bg-primary/5 border-primary/20 text-primary font-medium" : "bg-transparent border-border text-muted-foreground opacity-60"}`}>
                          Subject<br />{m.scoreBreakdown?.mutualSubject || 0}/25
                        </div>
                        <div className={`p-1.5 rounded-md border ${m.scoreBreakdown?.mutualCounty > 0 ? "bg-primary/5 border-primary/20 text-primary font-medium" : "bg-transparent border-border text-muted-foreground opacity-60"}`}>
                          County<br />{m.scoreBreakdown?.mutualCounty || 0}/25
                        </div>
                        <div className={`p-1.5 rounded-md border ${m.scoreBreakdown?.mutualSubcounty > 0 ? "bg-primary/5 border-primary/20 text-primary font-medium" : "bg-transparent border-border text-muted-foreground opacity-60"}`}>
                          Sub-C<br />{m.scoreBreakdown?.mutualSubcounty || 0}/25
                        </div>
                        <div className={`p-1.5 rounded-md border ${m.scoreBreakdown?.mutualSchool > 0 ? "bg-primary/5 border-primary/20 text-primary font-medium" : "bg-transparent border-border text-muted-foreground opacity-60"}`}>
                          School<br />{m.scoreBreakdown?.mutualSchool || 0}/25
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-border p-4">
                    {m.adminApproved === true ? (
                      <Button 
                        className="w-full gap-2 bg-success hover:bg-success/90 text-white font-bold h-10 shadow-lg"
                        disabled={expressInterestMutation.isPending}
                        onClick={() => expressInterestMutation.mutate(m._id)}
                      >
                        <MessageSquare className="h-4 w-4" />
                        Chat with this Match
                      </Button>
                    ) : m.adminApproved === false ? (
                      <div className="text-center p-2.5 rounded-lg bg-destructive/5 border border-destructive/20 text-destructive text-xs font-semibold">
                        Match Declined by Admin
                      </div>
                    ) : (
                      <div className="w-full text-center text-xs text-muted-foreground p-2 bg-muted/30 rounded-md border border-border">
                        Contact locked pending Admin Authorization
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MatchesPage;
