import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Clock, 
  MapPin, 
  BookOpen, 
  Check, 
  X, 
  AlertCircle,
  ChevronsUpDown
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { toast } from "sonner";
import { ALL_COUNTIES, KENYA_COUNTIES, KENYAN_SUBJECT_COMBINATIONS } from "@/lib/kenyaData";
import { cn } from "@/lib/utils";

const MySwapsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState<any>(null);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [selectedCounty, setSelectedCounty] = useState("");
  const [selectedSubCounty, setSelectedSubCounty] = useState("");

  const [swapForm, setSwapForm] = useState({
    currentCounty: "",
    currentSubCounty: "",
    currentSchool: "",
    subjectCombination: "",
    desiredCounties: [] as string[],
    desiredSubCounties: [] as string[],
    desiredSchool: "",
    reason: "",
    urgency: "Medium",
    schoolType: [] as string[],
  });

  const { data: mySwapsResponse, isLoading } = useQuery({
    queryKey: ["mySwaps"],
    queryFn: () => fetchApi("/swap-requests/my/requests"),
  });

  const mySwaps = mySwapsResponse?.data || [];

  const updateSwapMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/swap-requests/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        ...swapForm,
        subjectCombination: swapForm.subjectCombination.split("/").map(s => s.trim()).filter(Boolean),
        desiredSubCounties: swapForm.desiredSubCounties
      }),
    }),
    onSuccess: () => {
      toast.success("Swap request updated!");
      setShowEditModal(false);
      queryClient.invalidateQueries({ queryKey: ["mySwaps"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to update"),
  });

  const cancelSwapMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/swap-requests/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Swap request cancelled!");
      queryClient.invalidateQueries({ queryKey: ["mySwaps"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to cancel"),
  });

  const handleEdit = (req: any) => {
    setEditingRequest(req);
    setSwapForm({
      currentCounty: req.currentCounty || "",
      currentSubCounty: req.currentSubCounty || "",
      currentSchool: req.currentSchool || "",
      subjectCombination: req.subjectCombination?.join(" / ") || "",
      desiredCounties: req.desiredCounties || [],
      desiredSubCounties: req.desiredSubCounties || [],
      desiredSchool: req.desiredSchool || "",
      reason: req.reason || "",
      urgency: req.preferences?.urgency || "Medium",
      schoolType: req.preferences?.schoolType || [],
    });
    setShowEditModal(true);
  };

  const addCounty = () => {
    if (selectedCounty && !swapForm.desiredCounties.includes(selectedCounty)) {
      setSwapForm(f => ({ ...f, desiredCounties: [...f.desiredCounties, selectedCounty] }));
      setSelectedCounty("");
    }
  };

  const removeCounty = (c: string) => {
    setSwapForm(f => ({ ...f, desiredCounties: f.desiredCounties.filter(x => x !== c) }));
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

  const availableCurrentSubCounties = swapForm.currentCounty ? KENYA_COUNTIES[swapForm.currentCounty as keyof typeof KENYA_COUNTIES] || [] : [];
  const availableDesiredSubCounties = swapForm.desiredCounties.length > 0 
    ? Array.from(new Set(swapForm.desiredCounties.flatMap(c => KENYA_COUNTIES[c as keyof typeof KENYA_COUNTIES] || [])))
    : [];

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">My Swap Requests</h1>
            <p className="text-muted-foreground mt-1">Manage your active and past swap postings.</p>
          </div>
          <Button onClick={() => window.location.href = "/dashboard"}>
            <Plus className="mr-2 h-4 w-4" /> New Request
          </Button>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Loading your requests...</div>
        ) : mySwaps.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <Clock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No swap requests yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              You haven't posted any swap requests. Create one to start finding matching teachers.
            </p>
            <Button onClick={() => window.location.href = "/dashboard"}>Post Your First Request</Button>
          </Card>
        ) : (
          <div className="grid gap-6">
            {mySwaps.map((req: any) => (
              <Card key={req._id} className="shadow-card overflow-hidden">
                <div className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-heading font-bold text-lg">Swap Request</span>
                          <Badge variant={
                            req.status === 'active' ? 'default' : 
                            req.status === 'matched' ? 'success' : 
                            req.status === 'pending_approval' ? 'outline' : 'secondary'
                          } className="capitalize">
                            {req.status?.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground italic">Posted on {new Date(req.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(req)} disabled={req.status !== 'active' && req.status !== 'pending_approval'}>
                        <Edit3 className="mr-2 h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => cancelSwapMutation.mutate(req._id)} disabled={req.status === 'cancelled' || req.status === 'approved'}>
                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Cancel
                      </Button>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Current Position</h4>
                      <div className="bg-muted/30 p-4 rounded-lg space-y-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          <span className="font-medium">{req.currentSchool || "Not specified"}</span>
                        </div>
                        <p className="text-sm text-muted-foreground pl-6">{req.currentSubCounty}, {req.currentCounty} County</p>
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-primary" />
                          <span className="text-sm">{(req.subjectCombination || []).join(" / ")}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Desired Destination</h4>
                      <div className="bg-primary/5 border border-primary/10 p-4 rounded-lg space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {(req.desiredCounties || []).map((c: string) => (
                            <Badge key={c} variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
                              {c}
                            </Badge>
                          ))}
                        </div>
                        {req.desiredSubCounties?.length > 0 && (
                          <p className="text-sm text-muted-foreground">
                            Sub-counties: {req.desiredSubCounties.join(", ")}
                          </p>
                        )}
                        {req.desiredSchool && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Targeting: {req.desiredSchool}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {req.reason && (
                    <div className="mt-6 border-t pt-4">
                      <h4 className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Internal Reason</h4>
                      <p className="text-sm text-muted-foreground italic truncate max-w-2xl">"{req.reason}"</p>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── Edit Swap Modal (similar to creation) ─────────────────── */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading text-xl font-bold">Edit Swap Request</h2>
              <button onClick={() => setShowEditModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="bg-muted/30 p-3 rounded-lg space-y-3">
                <h3 className="font-semibold text-sm">Your Current Details</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs">Current County</Label>
                    <Select value={swapForm.currentCounty} onValueChange={v => setSwapForm(f => ({ ...f, currentCounty: v, currentSubCounty: "" }))}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ALL_COUNTIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Current Sub-County</Label>
                    <Select disabled={!swapForm.currentCounty} value={swapForm.currentSubCounty} onValueChange={v => setSwapForm(f => ({ ...f, currentSubCounty: v }))}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-56">
                        {availableCurrentSubCounties.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Current School</Label>
                    <Input className="h-8 text-sm" value={swapForm.currentSchool} onChange={e => setSwapForm(f => ({ ...f, currentSchool: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div className="bg-primary/5 p-3 rounded-lg space-y-3 border border-primary/10">
                <h3 className="font-semibold text-sm text-primary">Your Desired Destination</h3>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Desired Counties</Label>
                  <div className="flex gap-2">
                    <Select value={selectedCounty} onValueChange={setSelectedCounty}>
                      <SelectTrigger className="flex-1 h-8 text-sm"><SelectValue placeholder="Add..." /></SelectTrigger>
                      <SelectContent>
                        {ALL_COUNTIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={addCounty}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {swapForm.desiredCounties.map(c => (
                      <Badge key={c} variant="secondary" className="bg-primary/10 text-primary">
                        {c} <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => removeCounty(c)} />
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Reason for transfer</Label>
                <Textarea 
                  className="text-sm bg-background" 
                  value={swapForm.reason} 
                  onChange={e => setSwapForm(f => ({ ...f, reason: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button 
                className="flex-1" 
                disabled={updateSwapMutation.isPending}
                onClick={() => updateSwapMutation.mutate(editingRequest._id)}
              >
                {updateSwapMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
};

export default MySwapsPage;
