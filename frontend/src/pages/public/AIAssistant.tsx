import { FormEvent, useEffect, useRef, useState } from "react";
import { assistantApi } from "../../lib/apiClient";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// A per-tab session token so the backend can group messages into one
// conversation without requiring the patient to log in.
function getSessionToken() {
  const key = "ai_session_token";
  let token = sessionStorage.getItem(key);
  if (!token) {
    token = crypto.randomUUID();
    sessionStorage.setItem(key, token);
  }
  return token;
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi, I'm the Hospital AI Health Assistant. You can write to me in English, Urdu, or Roman Urdu — main aap ki madad Urdu mein bhi kar sakta hoon.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const { reply } = await assistantApi.sendMessage(getSessionToken(), userMessage.content);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I couldn't reach the assistant. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-73px)] max-w-3xl flex-col px-6 py-8">
      <h1 className="text-2xl font-semibold text-teal-950">AI Health Assistant</h1>
      <p className="mt-1 text-sm text-slate-500">
        General guidance only — not a substitute for a doctor's diagnosis. For emergencies, go to the
        nearest emergency department immediately.
      </p>

      <div className="mt-4 flex-1 space-y-3 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                m.role === "user" ? "bg-teal-900 text-white" : "bg-teal-50 text-teal-950"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div className="text-sm text-slate-400">Assistant is typing...</div>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          className="input-field flex-1"
          placeholder="Type in English, Urdu, or Roman Urdu..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="btn-primary" disabled={loading}>Send</button>
      </form>
    </div>
  );
}
