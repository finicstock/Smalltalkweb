import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { MessageCircle, X, Send, Minimize2 } from "lucide-react";
import { nanoid } from "nanoid";

const LOGO_URL = "/manus-storage/logo_fb6c7e34.png";

function getSessionId() {
  let id = localStorage.getItem("chat_session_id");
  if (!id) {
    id = nanoid(16);
    localStorage.setItem("chat_session_id", id);
  }
  return id;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sessionId] = useState(getSessionId);
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages, refetch } = trpc.chat.getMessages.useQuery(
    { sessionId, limit: 100 },
    { enabled: isOpen, refetchInterval: isOpen ? 5000 : false }
  );

  const createSession = trpc.chat.getOrCreateSession.useMutation();
  const sendMessage = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      refetch();
      setMessage("");
    },
  });

  useEffect(() => {
    if (isOpen) {
      createSession.mutate({ sessionId, userName: user?.name ?? undefined });
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMessage.mutate({
      sessionId,
      message: message.trim(),
      senderType: "user",
    });
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center"
          aria-label="채팅 상담"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)]">
          <Card className="shadow-2xl border overflow-hidden flex flex-col" style={{ height: "500px" }}>
            {/* Header */}
            <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <img src={LOGO_URL} alt="" className="h-8 w-8 rounded-full bg-white/10 p-0.5" />
                <div>
                  <p className="font-semibold text-sm">닉스의 스몰톡</p>
                  <p className="text-xs text-primary-foreground/70">채팅 상담</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-md hover:bg-primary-foreground/10 transition-colors">
                  <Minimize2 className="h-4 w-4" />
                </button>
                <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-md hover:bg-primary-foreground/10 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef as any}>
              <div className="space-y-3">
                {/* Welcome message */}
                <div className="flex gap-2">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <MessageCircle className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="bg-muted rounded-xl rounded-tl-sm px-3.5 py-2.5 max-w-[80%]">
                    <p className="text-sm text-foreground">
                      안녕하세요! 닉스의 스몰톡입니다. 궁금한 점이 있으시면 편하게 문의해 주세요.
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">운영시간: 평일 10:00-18:00</p>
                  </div>
                </div>

                {messages?.map((msg) => (
                  <div key={msg.id} className={`flex gap-2 ${msg.senderType === "user" ? "justify-end" : ""}`}>
                    {msg.senderType !== "user" && (
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <MessageCircle className="h-3.5 w-3.5 text-primary" />
                      </div>
                    )}
                    <div className={`rounded-xl px-3.5 py-2.5 max-w-[80%] ${
                      msg.senderType === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-muted text-foreground rounded-tl-sm"
                    }`}>
                      <p className="text-sm">{msg.message}</p>
                      <p className={`text-[10px] mt-1 ${
                        msg.senderType === "user" ? "text-primary-foreground/60" : "text-muted-foreground"
                      }`}>
                        {new Date(msg.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Input */}
            <form onSubmit={handleSend} className="p-3 border-t bg-background shrink-0">
              <div className="flex gap-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="메시지를 입력하세요..."
                  className="text-sm"
                  autoFocus
                />
                <Button type="submit" size="icon" disabled={!message.trim() || sendMessage.isPending}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}
