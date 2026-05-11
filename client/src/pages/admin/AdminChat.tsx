import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

export default function AdminChat() {
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: sessions, isLoading } = trpc.admin.listChatSessions.useQuery({ limit: 50 }, { refetchInterval: 10000 });
  const closeSession = trpc.admin.closeChatSession.useMutation({
    onSuccess: () => { toast.success("상담이 종료되었습니다."); },
  });

  const { data: messages, refetch: refetchMessages } = trpc.chat.getMessages.useQuery(
    { sessionId: selectedSession ?? "", limit: 200 },
    { enabled: !!selectedSession, refetchInterval: selectedSession ? 3000 : false }
  );

  const sendMessage = trpc.chat.sendMessage.useMutation({
    onSuccess: () => { refetchMessages(); setReply(""); },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim() || !selectedSession) return;
    sendMessage.mutate({ sessionId: selectedSession, message: reply.trim(), senderType: "admin" });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">채팅 상담</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ height: "calc(100vh - 250px)" }}>
        {/* Session List */}
        <Card className="lg:col-span-1 overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-foreground">상담 목록</h2>
          </div>
          <ScrollArea className="h-full">
            {isLoading ? (
              <div className="p-4 space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded animate-pulse" />)}</div>
            ) : sessions && sessions.length > 0 ? (
              <div className="divide-y">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => setSelectedSession(session.sessionId)}
                    className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${selectedSession === session.sessionId ? "bg-primary/5 border-l-2 border-primary" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm text-foreground">{session.userName ?? `방문자 #${session.id}`}</span>
                      <Badge variant={session.status === "open" ? "default" : "secondary"} className="text-xs">
                        {session.status === "open" ? "진행중" : "종료"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(session.updatedAt).toLocaleString("ko-KR")}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground text-sm">상담 내역이 없습니다.</div>
            )}
          </ScrollArea>
        </Card>

        {/* Chat Area */}
        <Card className="lg:col-span-2 overflow-hidden flex flex-col">
          {selectedSession ? (
            <>
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-foreground">상담 대화</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => closeSession.mutate({ sessionId: selectedSession })}
                >
                  <X className="h-3.5 w-3.5" /> 상담 종료
                </Button>
              </div>

              <ScrollArea className="flex-1 p-4" ref={scrollRef as any}>
                <div className="space-y-3">
                  {messages?.map((msg) => (
                    <div key={msg.id} className={`flex gap-2 ${msg.senderType === "admin" ? "justify-end" : ""}`}>
                      <div className={`rounded-xl px-3.5 py-2.5 max-w-[70%] ${
                        msg.senderType === "admin"
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-muted text-foreground rounded-tl-sm"
                      }`}>
                        <p className="text-sm">{msg.message}</p>
                        <p className={`text-[10px] mt-1 ${msg.senderType === "admin" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                          {new Date(msg.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <form onSubmit={handleReply} className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="답변을 입력하세요..."
                    autoFocus
                  />
                  <Button type="submit" size="icon" disabled={!reply.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                <p>좌측에서 상담을 선택해 주세요.</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
