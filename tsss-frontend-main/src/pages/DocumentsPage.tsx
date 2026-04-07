import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Clock, CheckCircle, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import jsPDF from "jspdf";

const STATUS_COLORS: Record<string, string> = {
  active: "secondary",
  matched: "default",
  approved: "default",
  cancelled: "destructive",
  pending: "secondary",
};

const DocumentsPage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: requestsResp, isLoading } = useQuery({
    queryKey: ["mySwapRequests"],
    queryFn: () => fetchApi("/swap-requests/my/requests"),
    refetchInterval: 15000,
  });

  const documents = requestsResp?.data || [];

  const cancelMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/swap-requests/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Swap request cancelled successfully.");
      queryClient.invalidateQueries({ queryKey: ["mySwapRequests"] });
    },
    onError: (e: any) => {
      toast.error(e.message || "Failed to cancel request");
    }
  });

  const handleCancel = (id: string) => {
    if (window.confirm("Are you sure you want to cancel this swap request?")) {
      cancelMutation.mutate(id);
    }
  };

  const generatePDF = (doc: any) => {
    const pdf = new jsPDF();
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text("Teachers Service Commission (TSC)", 105, 20, { align: "center" });

    pdf.setFontSize(14);
    pdf.text("MwalimuLink Swap Application Letter", 105, 30, { align: "center" });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);

    const submitDate = doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('en-KE') : new Date().toLocaleDateString('en-KE');

    pdf.text(`Date of Application: ${submitDate}`, 20, 50);
    pdf.text(`Reference ID: ${doc._id}`, 20, 60);

    pdf.setFont("helvetica", "bold");
    pdf.text("Teacher Details", 20, 80);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Name: ${user?.firstName} ${user?.lastName}`, 20, 90);
    pdf.text(`TSC Number: ${user?.tscNumber}`, 20, 100);
    pdf.text(`Job Group: ${user?.jobGroup || 'N/A'}`, 20, 110);

    pdf.setFont("helvetica", "bold");
    pdf.text("Current Station Snapshot", 20, 130);
    pdf.setFont("helvetica", "normal");
    pdf.text(`County: ${doc.currentCounty || user?.currentStation?.county || 'N/A'}`, 20, 140);
    pdf.text(`Sub-County: ${doc.currentSubCounty || 'N/A'}`, 20, 150);
    pdf.text(`School: ${doc.currentSchool || user?.currentStation?.schoolName || 'N/A'}`, 20, 160);

    const subs = doc.subjectCombination?.length ? doc.subjectCombination.join(' / ') : user?.subjects?.join(' / ') || 'N/A';
    pdf.text(`Subjects Taught: ${subs}`, 20, 170);

    pdf.setFont("helvetica", "bold");
    pdf.text("Desired Transfer Location", 20, 190);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Desired Counties: ${doc.desiredCounties?.join(", ") || 'N/A'}`, 20, 200);
    pdf.text(`Desired Sub-Counties: ${doc.desiredSubCounties?.join(", ") || 'Any'}`, 20, 210);
    pdf.text(`Desired School: ${doc.desiredSchool || 'Any'}`, 20, 220);

    if (doc.reason) {
      pdf.setFont("helvetica", "italic");
      pdf.text(`Reason: "${doc.reason}"`, 20, 240, { maxWidth: 170 });
    }

    pdf.save(`Swap_Application_${user?.tscNumber || doc._id.slice(-6)}.pdf`);
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in max-w-4xl">
        <div className="mb-8">
          <h1 className="font-heading text-2xl font-bold text-foreground">Documents & Requests</h1>
          <p className="text-muted-foreground mt-1">Manage your swap applications and download approved forms.</p>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading documents...</div>
          ) : documents.map((doc: any, index: number) => (
            <Card key={doc._id || index} className="shadow-card p-5">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-11 w-11 rounded-lg bg-accent flex items-center justify-center">
                    <FileText className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="font-heading font-semibold text-foreground">Swap Application</p>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                      <span>Ref: {doc._id?.slice(-8).toUpperCase() || 'N/A'}</span>
                      <span>•</span>
                      <span>{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}</span>
                      {doc.desiredCounties?.length > 0 && (
                        <>
                          <span>•</span>
                          <span>Wants: {doc.desiredCounties.join(", ")}</span>
                        </>
                      )}
                    </div>
                    {doc.reason && (
                      <p className="text-xs text-muted-foreground mt-1 italic">"{doc.reason}"</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={(STATUS_COLORS[doc.status] as any) || "outline"} className="gap-1 capitalize">
                    {["approved", "matched"].includes(doc.status) ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    {doc.status.replace("_", " ")}
                  </Badge>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => generatePDF(doc)}>
                    <Download className="h-3.5 w-3.5" /> Download PDF
                  </Button>
                  {(doc.status === "active" || doc.status === "pending_approval") && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-1"
                      disabled={cancelMutation.isPending}
                      onClick={() => handleCancel(doc._id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Cancel
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {!isLoading && documents.length === 0 && (
          <Card className="shadow-card p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading font-semibold text-foreground mb-2">No Requests Yet</h3>
            <p className="text-sm text-muted-foreground">
              Go to your Dashboard and click "Post Swap Request" to get started.
            </p>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DocumentsPage;
