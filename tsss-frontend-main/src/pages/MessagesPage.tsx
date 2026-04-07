import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Send, ShieldCheck } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const MessagesPage = () => {
  const [selected, setSelected] = useState(0);
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState("");
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: convResponse, isLoading: isLoadingConv } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => fetchApi("/messages/conversations"),
    refetchInterval: 10000, // poll every 10s
  });
  const conversations = convResponse?.data || [];
  const activeConversation = conversations[selected];

  const { data: msgResponse, isLoading: isLoadingMsg } = useQuery({
    queryKey: ["messages", activeConversation?.participant?._id],
    queryFn: () => fetchApi(`/messages/conversation/${activeConversation?.participant?._id}`),
    enabled: !!activeConversation?.participant?._id,
    refetchInterval: 5000, // poll every 5s for new messages
  });
  const messages = msgResponse?.data || [];

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: (content: string) => fetchApi("/messages", {
      method: "POST",
      body: JSON.stringify({
        receiverId: activeConversation.participant._id,
        content,
      })
    }),
    onSuccess: () => {
      setNewMessage("");
      // Immediately refetch messages and conversations
      queryClient.invalidateQueries({ queryKey: ["messages", activeConversation?.participant?._id] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (e: any) => {
      toast.error(e.message || "Failed to send message");
    }
  });

  const handleSend = () => {
    if (!newMessage.trim() || !activeConversation) return;
    sendMutation.mutate(newMessage.trim());
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="mb-6">
          <h1 className="font-heading text-2xl font-bold text-foreground">Messages</h1>
          <p className="text-muted-foreground mt-1">Communicate securely with your matched swap partners.</p>
        </div>

        <Card className="shadow-card overflow-hidden" style={{ height: "calc(100vh - 200px)" }}>
          <div className="flex h-full">
            {/* Conversation List */}
            <div className="w-80 border-r border-border flex flex-col">
              <div className="p-3 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search conversations..." className="pl-9 h-9" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {isLoadingConv ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
                ) : conversations.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    <p className="mb-2">No conversations yet.</p>
                    <p className="text-xs">Get matched with a teacher and click "Connect" on the Matches page to start chatting.</p>
                  </div>
                ) : conversations.map((c: any, i: number) => (
                  <button
                    key={c.participant?._id || i}
                    onClick={() => setSelected(i)}
                    className={`w-full flex items-start gap-3 p-4 text-left transition-colors border-b border-border ${selected === i ? "bg-accent" : "hover:bg-muted/50"}`}
                  >
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-primary">{c.participant?.firstName?.[0] || 'U'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm text-foreground flex items-center gap-1 truncate">
                          {c.participant?.role === 'admin' ? (
                            <><ShieldCheck className="h-3.5 w-3.5 text-primary" /> System Admin ({c.participant?.firstName})</>
                          ) : (
                            <>{c.participant?.firstName} {c.participant?.lastName}</>
                          )}
                        </p>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {c.lastMessage?.createdAt ? new Date(c.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{c.lastMessage?.content}</p>
                    </div>
                    {c.unreadCount > 0 && (
                      <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center shrink-0">
                        {c.unreadCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              {activeConversation ? (
                <>
                  <div className="p-4 border-b border-border flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center">
                      <span className="text-sm font-semibold text-accent-foreground">{activeConversation.participant?.firstName?.[0]}</span>
                    </div>
                    <div>
                      <p className="font-heading font-semibold text-sm text-foreground flex items-center gap-1.5">
                        {activeConversation.participant?.role === 'admin' && <ShieldCheck className="h-4 w-4 text-primary" />}
                        {activeConversation.participant?.role === 'admin' ? "System Administrator" : `${activeConversation.participant?.firstName} ${activeConversation.participant?.lastName}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activeConversation.participant?.role === 'admin'
                          ? "Official Command Center"
                          : `${(activeConversation.participant?.subjects || []).join(" / ")} • ${activeConversation.participant?.currentStation?.county || 'Unknown'}`
                        }
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {isLoadingMsg ? (
                      <div className="text-center text-sm text-muted-foreground">Loading messages...</div>
                    ) : messages.length === 0 ? (
                      <div className="text-center text-sm text-muted-foreground">No messages yet. Say hello!</div>
                    ) : messages.map((msg: any, i: number) => {
                      const isMe = msg.sender?._id === user?._id || msg.sender === user?._id || msg.sender?.id === user?._id;
                      return (
                        <div key={msg._id || i} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[70%] rounded-xl px-4 py-2.5 ${isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                            <p className="text-sm">{msg.content}</p>
                            <p className={`text-xs mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  Select a conversation to start chatting
                </div>
              )}

              <div className="p-4 border-t border-border">
                <div className="flex gap-2">
                  <Input
                    placeholder={activeConversation ? "Type a message..." : "Select a conversation first"}
                    className="flex-1"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                    disabled={!activeConversation || sendMutation.isPending}
                  />
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!activeConversation || !newMessage.trim() || sendMutation.isPending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default MessagesPage;
