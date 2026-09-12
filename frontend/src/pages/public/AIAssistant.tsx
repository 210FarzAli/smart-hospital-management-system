import { FormEvent, useEffect, useRef, useState } from "react";
import { assistantApi } from "../../lib/apiClient";
import {
  Sparkles,
  Send,
  User,
  AlertTriangle,
  Refresh,
  ShieldCheck,
  Stethoscope,
} from "../../components/icons/Icons";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

function getSessionToken() {
  const key = "ai_session_token";
  let token = sessionStorage.getItem(key);

  if (!token) {
    token = crypto.randomUUID();
    sessionStorage.setItem(key, token);
  }

  return token;
}

const SUGGESTED_QUESTIONS = [
  "Mujhe 2 din se bukhar aur gale mein dard hai, kya karoon?",
  "When should I visit a cardiologist instead of a general physician?",
  "What documents and tests should I bring for an OPD appointment?",
  "Severe headache and blurred vision warning signs",
];

export default function AIAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hello! I am your AI Health Guide for Smart Hospital. You can ask me medical triage questions, guidance on which doctor to consult, and clinic timings. You may write in English, Urdu, or Roman Urdu (Aap Urdu mein bhi sawal pooch saktay hain).",
      timestamp: "Just now",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Suggestions are visible only at the beginning of a session.
  // They disappear permanently after the first user message.
  const [showSuggestions, setShowSuggestions] = useState(true);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const latestUserMsgRef = useRef<HTMLDivElement>(null);

  // Scroll behavior:
  // When a newly sent user message is added, position it near the top of the internal chat container
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === "user") {
      requestAnimationFrame(() => {
        if (latestUserMsgRef.current && chatContainerRef.current) {
          const containerRect = chatContainerRef.current.getBoundingClientRect();
          const msgRect = latestUserMsgRef.current.getBoundingClientRect();
          const offset = msgRect.top - containerRect.top;
          chatContainerRef.current.scrollBy({
            top: offset - 24, // 24px margin from top of internal chat container
            behavior: "smooth",
          });
        }
      });
    }
  }, [messages]);

  async function handleSend(textToSend?: string) {
    const query = (textToSend || input).trim();

    if (!query || loading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    // Add the user message.
    setMessages((prev) => [...prev, userMessage]);

    setInput("");
    setLoading(true);

    // ============================================================
    // HIDE SUGGESTIONS AFTER THE FIRST USER MESSAGE
    // ============================================================

    setShowSuggestions(false);

    try {
      const { reply } =
        await assistantApi.sendMessage(
          getSessionToken(),
          query
        );

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: reply,
          timestamp: new Date().toLocaleTimeString(
            [],
            {
              hour: "2-digit",
              minute: "2-digit",
            }
          ),
        },
      ]);
    } catch (err) {
      console.error(err);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I am experiencing a temporary connection issue. Please check your internet connection or contact the hospital reception directly.",
          timestamp: new Date().toLocaleTimeString(
            [],
            {
              hour: "2-digit",
              minute: "2-digit",
            }
          ),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    handleSend();
  }

  function handleReset() {
    sessionStorage.removeItem(
      "ai_session_token"
    );

    // ============================================================
    // NEW SESSION = SHOW SUGGESTIONS AGAIN
    // ============================================================

    setShowSuggestions(true);

    setMessages([
      {
        role: "assistant",
        content:
          "Session refreshed. How can I assist with your health questions today?",
        timestamp: "Just now",
      },
    ]);

    setInput("");
    setLoading(false);
  }

  return (
    <div className="flex h-[calc(100vh-73px)] flex-col bg-slate-50/60">
      {/* ============================================================
          TOP BANNER / TRIAGE BAR
      ============================================================ */}

      <div className="border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-teal-900 text-teal-300 shadow-md">
              <Sparkles className="h-5 w-5" />

              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-teal-950">
                  AI Medical Health Guide
                </h1>

                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 ring-1 ring-emerald-200">
                  Online Triage
                </span>
              </div>

              <p className="text-xs text-slate-500">
                English • Urdu • Roman Urdu assistance
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-xs hover:bg-slate-50 hover:text-teal-950"
            title="Start new conversation"
          >
            <Refresh className="h-3.5 w-3.5" />

            <span className="hidden sm:inline">
              New Session
            </span>
          </button>
        </div>
      </div>

      {/* ============================================================
          EMERGENCY DISCLAIMER BANNER
      ============================================================ */}

      <div className="bg-amber-50/90 px-4 py-2 text-center text-xs text-amber-900 ring-1 ring-amber-200/60">
        <div className="mx-auto flex max-w-4xl items-center justify-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" />

          <span>
            <strong className="font-semibold">
              Medical Notice:
            </strong>{" "}
            This AI assistant provides general information only, not formal diagnosis. In critical emergency situations, proceed directly to our Emergency Trauma Unit or call 1122.
          </span>
        </div>
      </div>

      {/* ============================================================
          CHAT MESSAGES AREA
      ============================================================ */}

      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6 sm:px-8"
      >
        <div className="mx-auto max-w-4xl space-y-5">
          {messages.map((m, idx) => {
            const isLatestUserMessage =
              m.role === "user" &&
              idx === messages.map((msg) => msg.role).lastIndexOf("user");
            return (
              <div
                key={idx}
                ref={isLatestUserMessage ? latestUserMsgRef : undefined}
                className={`flex gap-3 ${
                  m.role === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
              {m.role === "assistant" && (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-900 text-teal-200 shadow-xs">
                  <Stethoscope className="h-4 w-4" />
                </div>
              )}

              <div
                className={`group relative max-w-[85%] rounded-2xl p-4 text-sm shadow-xs transition-all sm:max-w-[75%] ${
                  m.role === "user"
                    ? "rounded-tr-xs bg-teal-900 text-white"
                    : "rounded-tl-xs border border-slate-200/80 bg-white text-slate-800"
                }`}
              >
                <div className="whitespace-pre-wrap leading-relaxed">
                  {m.content}
                </div>

                {m.timestamp && (
                  <div
                    className={`mt-1.5 text-right text-[10px] font-medium ${
                      m.role === "user"
                        ? "text-teal-200"
                        : "text-slate-400"
                    }`}
                  >
                    {m.timestamp}
                  </div>
                )}
              </div>

              {m.role === "user" && (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-800">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          );
        })}

          {/* ============================================================
              TYPING INDICATOR
          ============================================================ */}

          {loading && (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-900 text-teal-200">
                <Stethoscope className="h-4 w-4" />
              </div>

              <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-xs border border-slate-200 bg-white px-4 py-3 shadow-xs">
                <span className="h-2 w-2 animate-bounce rounded-full bg-teal-600" />

                <span className="h-2 w-2 animate-bounce rounded-full bg-teal-600 [animation-delay:0.15s]" />

                <span className="h-2 w-2 animate-bounce rounded-full bg-teal-600 [animation-delay:0.3s]" />

                <span className="ml-2 text-xs font-medium text-slate-500">
                  Assistant is thinking...
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================
          SUGGESTED QUESTIONS
          
          IMPORTANT:
          These are rendered ONLY when showSuggestions === true.
          First user message sets it to false.
          New Session sets it back to true.
      ============================================================ */}

      {showSuggestions && (
        <div className="border-t border-slate-200/60 bg-white/60 px-4 py-2.5 backdrop-blur sm:px-8">
          <div className="mx-auto max-w-4xl">
            <div className="mb-1.5 text-[11px] font-semibold text-slate-500">
              Suggested health queries:
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:pb-0">
              {SUGGESTED_QUESTIONS.map(
                (q, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSend(q)}
                    disabled={loading}
                    className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-2xs transition-colors hover:border-teal-300 hover:bg-teal-50/50 hover:text-teal-950 disabled:opacity-50"
                  >
                    {q}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          INPUT BAR
      ============================================================ */}

      <div className="border-t border-slate-200 bg-white p-4 sm:px-8">
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-4xl items-center gap-3"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) =>
                setInput(e.target.value)
              }
              placeholder="Ask in English or Urdu (e.g., 'What are OPD hours for Cardiology?')..."
              disabled={loading}
              className="input-field py-3 pr-10 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="btn-primary inline-flex h-11 items-center justify-center gap-2 px-6 shadow-md shadow-teal-900/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="hidden sm:inline">
              Send
            </span>

            <Send className="h-4 w-4" />
          </button>
        </form>

        <p className="mt-2 text-center text-[11px] text-slate-500">
          Powered by Smart Hospital AI Engine • Data is encrypted and confidential
        </p>
      </div>
    </div>
  );
}