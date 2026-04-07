import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Users, RefreshCw, ShieldCheck, MapPin, UserCheck, Clock,
  CheckCircle2, XCircle, AlertTriangle, MessageSquare, Megaphone
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const ADMIN_EMAIL = "graphitechsoftwares@gmail.com";
const POLL_INTERVAL = 15000; // 15 seconds

const AdminDashboardPage = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [announcementDialogOpen, setAnnouncementDialogOpen] = useState(false);
  const [viewRequestDialogOpen, setViewRequestDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [messageContent, setMessageContent] = useState("");
  const [announcement, setAnnouncement] = useState({ title: "", content: "", priority: "medium" });

  // ── Guard: block all non-admin emails immediately ─────────────
  useEffect(() => {
    if (!authLoading && user && user.role !== 'admin' && user.email !== ADMIN_EMAIL) {
      toast.error("Unauthorized: Admin access only.");
      navigate("/dashboard", { replace: true });
    }
    if (!authLoading && !user) {
      navigate("/login", { replace: true });
    }
  }, [user, authLoading, navigate]);

  // ── Live Data Queries (all with polling) ──────────────────────
  const { data: analyticsResp, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ["adminAnalytics"],
    queryFn: () => fetchApi("/admin/analytics"),
    refetchInterval: POLL_INTERVAL,
    enabled: !!user && (user.role === 'admin' || user.email === ADMIN_EMAIL),
  });

  const { data: usersResp, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["adminUsers"],
    queryFn: () => fetchApi("/admin/users"),
    refetchInterval: POLL_INTERVAL,
    enabled: !!user && (user.role === 'admin' || user.email === ADMIN_EMAIL),
  });

  const { data: swapRequestsResp, isLoading: isLoadingSwaps } = useQuery({
    queryKey: ["adminSwapRequests"],
    queryFn: () => fetchApi("/admin/swap-requests"),
    refetchInterval: POLL_INTERVAL,
    enabled: !!user && (user.role === 'admin' || user.email === ADMIN_EMAIL),
  });

  const { data: matchesResp, isLoading: isLoadingMatches } = useQuery({
    queryKey: ["adminMatches"],
    queryFn: () => fetchApi("/admin/matches"),
    refetchInterval: POLL_INTERVAL,
    enabled: !!user && (user.role === 'admin' || user.email === ADMIN_EMAIL),
  });

  // ── Mutations ─────────────────────────────────────────────────

  const approveSwapMutation = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) =>
      fetchApi(`/admin/swap-requests/${id}/approve`, {
        method: "PUT",
        body: JSON.stringify({ approve }),
      }),
    onSuccess: (_, { approve }) => {
      toast.success(`Request ${approve ? "approved" : "rejected"} successfully.`);
      queryClient.invalidateQueries({ queryKey: ["adminSwapRequests"] });
      queryClient.invalidateQueries({ queryKey: ["adminAnalytics"] });
      queryClient.invalidateQueries({ queryKey: ["adminMatches"] });
    },
    onError: (e: any) => toast.error(e.message || "Action failed"),
  });

  const authorizeChatMutation = useMutation({
    mutationFn: ({ id, authorize }: { id: string; authorize: boolean }) =>
      fetchApi(`/admin/matches/${id}/authorize-chat`, {
        method: "PUT",
        body: JSON.stringify({ authorize }),
      }),
    onSuccess: (_, { authorize }) => {
      toast.success(`Chat ${authorize ? "authorized" : "revoked"}!`);
      queryClient.invalidateQueries({ queryKey: ["adminMatches"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to update chat access"),
  });

  const broadcastMutation = useMutation({
    mutationFn: (data: any) => fetchApi("/admin/announcements", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      toast.success("Announcement broadcasted successfully!");
      setAnnouncementDialogOpen(false);
      setAnnouncement({ title: "", content: "", priority: "medium" });
      queryClient.invalidateQueries({ queryKey: ["adminAnnouncements"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to post announcement"),
  });

  const sendMessageMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) => fetchApi(`/admin/users/${id}/message`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
    onSuccess: () => {
      toast.success("Message sent to user!");
      setMessageDialogOpen(false);
      setMessageContent("");
    },
    onError: (e: any) => toast.error(e.message || "Failed to send message"),
  });

  const blockUserMutation = useMutation({
    mutationFn: ({ id, block }: { id: string; block: boolean }) =>
      fetchApi(`/admin/users/${id}/block`, {
        method: "PUT",
        body: JSON.stringify({ block, reason: block ? "Blocked by admin" : undefined }),
      }),
    onSuccess: (_, { block }) => {
      toast.success(`User ${block ? "blocked" : "unblocked"}.`);
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["adminAnalytics"] });
    },
    onError: (e: any) => toast.error(e.message || "Action failed"),
  });

  const runAlgorithmMutation = useMutation({
    mutationFn: () => fetchApi("/matches/run-algorithm", { method: "POST" }),
    onSuccess: (data: any) => {
      toast.success(data.message || "Matching algorithm completed!");
      queryClient.invalidateQueries({ queryKey: ["adminMatches"] });
      queryClient.invalidateQueries({ queryKey: ["adminAnalytics"] });
      queryClient.invalidateQueries({ queryKey: ["adminSwapRequests"] });
    },
    onError: (e: any) => toast.error(e.message || "Algorithm failed"),
  });

  // ── Derived values from live API ──────────────────────────────
  const analytics = analyticsResp?.data;
  const usersList: any[] = usersResp?.data?.data || usersResp?.data || [];
  const swapReqs: any[] = swapRequestsResp?.data?.data || swapRequestsResp?.data || [];
  const matchList: any[] = matchesResp?.data?.data || matchesResp?.data || [];
  const countyStats: any[] = analytics?.usersByCounty || [];

  const overviewCards = [
    {
      label: "Total Teachers",
      value: analytics?.users?.total ?? "—",
      icon: Users,
      color: "text-primary",
      sub: `${analytics?.users?.active ?? 0} active`,
    },
    {
      label: "Active Swap Requests",
      value: analytics?.swapRequests?.active ?? "—",
      icon: RefreshCw,
      color: "text-warning",
      sub: `${analytics?.swapRequests?.total ?? 0} total`,
    },
    {
      label: "Matched / Approved",
      value: analytics?.swapRequests?.matched ?? "—",
      icon: CheckCircle2,
      color: "text-success",
      sub: `${analytics?.swapRequests?.approved ?? 0} approved`,
    },
    {
      label: "Verified Profiles",
      value: analytics?.users?.verified ?? "—",
      icon: ShieldCheck,
      color: "text-info",
      sub: `${analytics?.users?.blocked ?? 0} blocked`,
    },
  ];

  // Don't render page content until auth is resolved
  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Checking authorization...
        </div>
      </DashboardLayout>
    );
  }

  if (!user || (user.role !== 'admin' && user.email !== ADMIN_EMAIL)) {
    return null; // useEffect will redirect
  }

  return (
    <DashboardLayout>
      <div className="animate-fade-in space-y-6">

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">MwalimuLink Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Live system management — auto-refreshes every 15s
            </p>
          </div>
          <Button 
            variant="outline" 
            className="sm:w-auto gap-2" 
            disabled={runAlgorithmMutation.isPending}
            onClick={() => runAlgorithmMutation.mutate()}
          >
            <RefreshCw className={cn("h-4 w-4", runAlgorithmMutation.isPending && "animate-spin")} />
            {runAlgorithmMutation.isPending ? "Calculating..." : "Recalculate Matches"}
          </Button>
        </div>

        {/* ── Overview Stats ───────────────────────────────────── */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {overviewCards.map((card) => (
            <Card key={card.label} className="p-5 shadow-card hover-lift">
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                {isLoadingAnalytics && (
                  <RefreshCw className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
                )}
              </div>
              <p className="text-2xl font-heading font-bold text-foreground">
                {isLoadingAnalytics ? "…" : card.value}
              </p>
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">{card.sub}</p>
            </Card>
          ))}
        </div>

        {/* ── Tabs ─────────────────────────────────────────────── */}
        <Tabs defaultValue="requests" className="space-y-4">
          <TabsList>
            <TabsTrigger value="requests" className="relative">
              MwalimuLink Requests
              {swapReqs.filter(r => r.status === 'active').length > 0 && (
                <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
                  {swapReqs.filter(r => r.status === 'active').length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="matches">Matches</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="announcements">Announcements</TabsTrigger>
            <TabsTrigger value="geography">Geography</TabsTrigger>
          </TabsList>

          {/* ── Announcements Tab ─────────────────────────────── */}
          <TabsContent value="announcements">
            <Card className="shadow-card overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div>
                  <h2 className="font-heading font-semibold text-foreground">Global Announcements</h2>
                  <p className="text-sm text-muted-foreground">
                    Broadcast messages to all teachers' dashboard feeds.
                  </p>
                </div>
                <Button onClick={() => setAnnouncementDialogOpen(true)} className="gap-2">
                  <Megaphone className="h-4 w-4" /> New Broadcast
                </Button>
              </div>
              <div className="p-8 text-center text-muted-foreground">
                <AlertTriangle className="h-10 w-10 mx-auto mb-4 opacity-50" />
                <p>Announcements history will appear here over time.</p>
              </div>
            </Card>
          </TabsContent>

          {/* ── Swap Requests Tab ─────────────────────────────── */}
          <TabsContent value="requests">
            <Card className="shadow-card overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div>
                  <h2 className="font-heading font-semibold text-foreground">All Swap Requests</h2>
                  <p className="text-sm text-muted-foreground">
                    Approve or reject requests. Approved requests enter the background matching pool.
                  </p>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Current County</TableHead>
                    <TableHead>Desired Counties</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingSwaps ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2" />
                        Loading swap requests…
                      </TableCell>
                    </TableRow>
                  ) : swapReqs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        No swap requests yet.
                      </TableCell>
                    </TableRow>
                  ) : swapReqs.filter(r => r.status !== 'cancelled').map((req: any) => (
                    <TableRow key={req._id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{req.teacher?.firstName} {req.teacher?.lastName}</p>
                          <p className="text-xs text-muted-foreground">{req.teacher?.tscNumber}</p>
                          <p className="text-xs text-muted-foreground">{req.teacher?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {req.teacher?.currentStation?.county || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {(req.desiredCounties || []).join(", ") || "Any"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[140px] truncate" title={req.reason}>
                        {req.reason || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {req.createdAt ? new Date(req.createdAt).toLocaleDateString("en-KE") : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            req.status === "approved" ? "default"
                              : req.status === "matched" ? "default"
                                : req.status === "active" ? "secondary"
                                  : "destructive"
                          }
                          className="capitalize"
                        >
                          {req.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(req.status === "pending_approval" || req.status === "active" || req.status === "matched") ? (
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs border-primary text-primary hover:bg-primary/10"
                              onClick={() => {
                                setSelectedRequest(req);
                                setViewRequestDialogOpen(true);
                              }}
                            >
                              View Details
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground capitalize">{req.status}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* ── Matches Tab ───────────────────────────────────── */}
          <TabsContent value="matches">
            <Card className="shadow-card overflow-hidden">
              <div className="p-5 border-b border-border">
                <h2 className="font-heading font-semibold text-foreground">Algorithm Matches</h2>
                <p className="text-sm text-muted-foreground">
                  Stable pairs generated by the Gale-Shapley algorithm
                </p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teacher 1</TableHead>
                    <TableHead>Teacher 2</TableHead>
                    <TableHead>Compatibility</TableHead>
                    <TableHead>Distance (km)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Chat Access</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingMatches ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                        <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2" />
                        Loading matches…
                      </TableCell>
                    </TableRow>
                  ) : matchList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                        No matches yet. Run the Gale-Shapley algorithm to generate pairs.
                      </TableCell>
                    </TableRow>
                  ) : matchList.map((m: any) => (
                    <TableRow key={m._id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{m.teacher1?.firstName} {m.teacher1?.lastName}</p>
                          <p className="text-xs text-muted-foreground">{m.teacher1?.currentStation?.county}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{m.teacher2?.firstName} {m.teacher2?.lastName}</p>
                          <p className="text-xs text-muted-foreground">{m.teacher2?.currentStation?.county}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-sm ${m.matchLevel === 'Green' ? "text-success" :
                            m.matchLevel === 'Blue' ? "text-[#3b82f6]" :
                              m.matchLevel === 'Yellow' ? "text-warning" :
                                m.compatibilityScore === 100 ? "text-success" :
                                  m.compatibilityScore >= 75 ? "text-[#3b82f6]" :
                                    m.compatibilityScore >= 50 ? "text-warning" : "text-muted-foreground"
                            }`}>
                            {m.compatibilityScore}%
                          </span>
                          {m.matchLevel && m.matchLevel !== 'None' && (
                            <span className={`h-2.5 w-2.5 rounded-full ${m.matchLevel === 'Green' ? "bg-success" :
                              m.matchLevel === 'Blue' ? "bg-[#3b82f6]" :
                                "bg-warning"
                              }`} />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {m.distanceBetweenStations != null ? `${m.distanceBetweenStations} km` : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={m.status === "mutual_interest" ? "default" : "secondary"} className="capitalize">
                          {m.status?.replace(/_/g, " ") || "pending"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={m.adminApproved ? "success" : "destructive"}>
                          {m.adminApproved ? "Authorized" : "Locked"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant={m.adminApproved ? "secondary" : "default"}
                            className="h-7 text-xs"
                            disabled={authorizeChatMutation.isPending}
                            onClick={() => authorizeChatMutation.mutate({ id: m._id, authorize: !m.adminApproved })}
                          >
                            {m.adminApproved ? "Revoke Chat" : "Authorize Chat"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* ── Users Tab ─────────────────────────────────────── */}
          <TabsContent value="users">
            <div className="grid sm:grid-cols-3 gap-4 mb-4">
              <Card className="p-5 shadow-card">
                <div className="flex items-center gap-3 mb-2">
                  <UserCheck className="h-5 w-5 text-success" />
                  <span className="font-heading font-semibold">Verified</span>
                </div>
                <p className="text-3xl font-heading font-bold">{isLoadingAnalytics ? "…" : (analytics?.users?.verified ?? 0)}</p>
                <p className="text-sm text-muted-foreground">TSC verified accounts</p>
              </Card>
              <Card className="p-5 shadow-card">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="h-5 w-5 text-warning" />
                  <span className="font-heading font-semibold">Active</span>
                </div>
                <p className="text-3xl font-heading font-bold">{isLoadingAnalytics ? "…" : (analytics?.users?.active ?? 0)}</p>
                <p className="text-sm text-muted-foreground">Active accounts</p>
              </Card>
              <Card className="p-5 shadow-card">
                <div className="flex items-center gap-3 mb-2">
                  <XCircle className="h-5 w-5 text-destructive" />
                  <span className="font-heading font-semibold">Blocked</span>
                </div>
                <p className="text-3xl font-heading font-bold">{isLoadingAnalytics ? "…" : (analytics?.users?.blocked ?? 0)}</p>
                <p className="text-sm text-muted-foreground">Suspended accounts</p>
              </Card>
            </div>

            <Card className="shadow-card overflow-hidden">
              <div className="p-5 border-b border-border">
                <h2 className="font-heading font-semibold text-foreground">All Registered Teachers</h2>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teacher</TableHead>
                    <TableHead>TSC Number</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>County</TableHead>
                    <TableHead>Subjects</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingUsers ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2" />
                        Loading users…
                      </TableCell>
                    </TableRow>
                  ) : usersList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        No registered users yet.
                      </TableCell>
                    </TableRow>
                  ) : usersList.map((u: any) => (
                    <TableRow key={u._id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center shrink-0">
                            <span className="text-xs font-semibold text-accent-foreground">
                              {u.firstName?.[0] || "U"}
                            </span>
                          </div>
                          <p className="font-medium text-sm">{u.firstName} {u.lastName}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.tscNumber}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.currentStation?.county || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {(u.subjects || []).join(", ") || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={u.isBlocked ? "destructive" : u.tscVerified ? "default" : "secondary"}
                          className="capitalize"
                        >
                          {u.isBlocked ? "Blocked" : u.tscVerified ? "Verified" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 text-xs gap-1"
                            onClick={() => {
                              setSelectedUser(u);
                              setMessageDialogOpen(true);
                            }}
                          >
                            <MessageSquare className="h-3 w-3" /> Message
                          </Button>
                          <Button
                            size="sm"
                            variant={u.isBlocked ? "outline" : "destructive"}
                            className="h-7 text-xs"
                            disabled={blockUserMutation.isPending || u.email === ADMIN_EMAIL}
                            onClick={() => blockUserMutation.mutate({ id: u._id, block: !u.isBlocked })}
                          >
                            {u.isBlocked ? "Unblock" : "Block"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* ── Geography Tab ─────────────────────────────────── */}
          <TabsContent value="geography">
            <Card className="shadow-card overflow-hidden">
              <div className="p-5 border-b border-border">
                <h2 className="font-heading font-semibold text-foreground flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" /> County Distribution
                </h2>
                <p className="text-sm text-muted-foreground">Teachers registered per county (live from database)</p>
              </div>
              {isLoadingAnalytics ? (
                <div className="p-12 text-center text-muted-foreground">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                  Loading geography data…
                </div>
              ) : countyStats.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <AlertTriangle className="h-5 w-5 mx-auto mb-2" />
                  No geographic data available yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>County</TableHead>
                      <TableHead>Teachers</TableHead>
                      <TableHead>Distribution</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {countyStats
                      .sort((a: any, b: any) => b.count - a.count)
                      .map((c: any, i: number) => {
                        const max = countyStats[0]?.count || 1;
                        const pct = Math.round((c.count / max) * 100);
                        return (
                          <TableRow key={c._id}>
                            <TableCell className="text-muted-foreground text-sm">{i + 1}</TableCell>
                            <TableCell className="font-medium text-sm">{c._id}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{c.count}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-muted rounded-full h-2">
                                  <div
                                    className="bg-primary h-2 rounded-full transition-all duration-700"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Dialogs ────────────────────────────────────────── */}

      {/* Message Dialog */}
      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Message User: {selectedUser?.firstName} {selectedUser?.lastName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Message Content (Sent as Admin)</Label>
              <Textarea
                placeholder="Write your message here..."
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMessageDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (selectedUser && messageContent) {
                  sendMessageMutation.mutate({ id: selectedUser._id, content: messageContent });
                }
              }}
              disabled={!messageContent || sendMessageMutation.isPending}
            >
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Swap Request Details Dialog */}
      <Dialog open={viewRequestDialogOpen} onOpenChange={setViewRequestDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Swap Request Verification</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-6 py-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-1">Teacher Info</h4>
                  <p className="font-medium text-foreground">{selectedRequest.teacher?.firstName} {selectedRequest.teacher?.lastName}</p>
                  <p className="text-sm text-foreground">TSC: {selectedRequest.teacher?.tscNumber}</p>
                  <p className="text-sm text-foreground">{selectedRequest.teacher?.email}</p>
                  <p className="text-sm text-foreground">Job Group: {selectedRequest.teacher?.jobGroup || "N/A"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-1">Professional</h4>
                  <p className="text-sm text-foreground">Subjects: {selectedRequest.subjectCombination?.join(" / ") || selectedRequest.teacher?.subjects?.join(" / ")}</p>
                  <p className="text-sm text-foreground mt-1 flex items-center gap-2">
                    System Status: <Badge variant="outline" className="capitalize">{selectedRequest.status}</Badge>
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl border border-border">
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Current Station</h4>
                  <p className="text-sm text-muted-foreground">County: <span className="text-foreground">{selectedRequest.currentCounty || selectedRequest.teacher?.currentStation?.county || "N/A"}</span></p>
                  <p className="text-sm text-muted-foreground">Sub-County: <span className="text-foreground">{selectedRequest.currentSubCounty || "N/A"}</span></p>
                  <p className="text-sm text-muted-foreground">School: <span className="text-foreground">{selectedRequest.currentSchool || selectedRequest.teacher?.currentStation?.schoolName || "N/A"}</span></p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Desired Transfer Target</h4>
                  <p className="text-sm text-muted-foreground">Counties: <span className="text-foreground">{(selectedRequest.desiredCounties || []).join(", ") || "Any"}</span></p>
                  <p className="text-sm text-muted-foreground">Sub-Counties: <span className="text-foreground">{(selectedRequest.desiredSubCounties || []).join(", ") || "Any"}</span></p>
                  <p className="text-sm text-muted-foreground">School: <span className="text-foreground">{selectedRequest.desiredSchool || "Any"}</span></p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-1">Additional Context</h4>
                <p className="text-sm text-foreground">Priority / Urgency: {selectedRequest.preferences?.urgency || "Medium"}</p>
                <div className="mt-2 p-3 bg-muted/50 rounded-lg border border-border">
                  <p className="text-sm text-foreground italic">"{selectedRequest.reason || "No reason provided by the teacher."}"</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-3 sm:gap-0 mt-4 border-t border-border pt-4">
            <Button variant="ghost" onClick={() => setViewRequestDialogOpen(false)}>Cancel / Close</Button>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={() => {
                  approveSwapMutation.mutate({ id: selectedRequest._id, approve: false });
                  setViewRequestDialogOpen(false);
                }}
                disabled={approveSwapMutation.isPending}
              >
                Reject Request
              </Button>
              <Button
                variant="default"
                onClick={() => {
                  approveSwapMutation.mutate({ id: selectedRequest._id, approve: true });
                  setViewRequestDialogOpen(false);
                }}
                disabled={approveSwapMutation.isPending}
              >
                Approve Request
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Announcement Dialog */}
      <Dialog open={announcementDialogOpen} onOpenChange={setAnnouncementDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Broadcast Announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="e.g. System Maintenance Tomorrow"
                value={announcement.title}
                onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                placeholder="Write your announcement details here..."
                value={announcement.content}
                onChange={(e) => setAnnouncement({ ...announcement, content: e.target.value })}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnnouncementDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => broadcastMutation.mutate(announcement)}
              disabled={!announcement.title || !announcement.content || broadcastMutation.isPending}
              className="gap-2"
            >
              <Megaphone className="h-4 w-4" /> Broadcast Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminDashboardPage;
