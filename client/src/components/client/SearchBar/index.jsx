import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, Mic, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { sendChatMessages } from "@/services/chatService";

export default function SearchBar() {
  const navigate = useNavigate();
  const thinkingMessages = [
    "Reviewing care preferences",
    "Comparing nearby communities",
    "Ranking the strongest matches",
    "Checking care and lifestyle fit",
  ];
  const [query, setQuery] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatComposer, setChatComposer] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [thinkingMessageIndex, setThinkingMessageIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const inputRef = useRef(null);
  const chatComposerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const audioChunksRef = useRef([]);
  const typingTimerRef = useRef(null);
  const recordingToastIdRef = useRef(null);
  const transcribingToastIdRef = useRef(null);
  const isChatOpenRef = useRef(false);
  const chatMessagesRef = useRef(chatMessages);
  const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

  useEffect(() => {
    chatMessagesRef.current = chatMessages;
  }, [chatMessages]);

  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
    window.dispatchEvent(
      new CustomEvent("carematch:chat-open-change", {
        detail: { isOpen: isChatOpen },
      })
    );
  }, [isChatOpen]);

  useEffect(() => {
    if (!isChatOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatOpen]);

  useEffect(() => {
    if (!isChatOpen) return;
    const id = window.setTimeout(() => {
      chatComposerRef.current?.focus();
    }, 200);
    return () => window.clearTimeout(id);
  }, [isChatOpen]);

  useEffect(() => {
    if (!chatSending) {
      setThinkingMessageIndex(0);
      return;
    }
    const intervalId = window.setInterval(() => {
      setThinkingMessageIndex((prev) => (prev + 1) % thinkingMessages.length);
    }, 1800);
    return () => window.clearInterval(intervalId);
  }, [chatSending]);

  useEffect(() => {
    const onOpenChatRequest = () => {
      openChatPanel();
    };
    window.addEventListener("carematch:open-chat-request", onOpenChatRequest);
    return () => {
      window.removeEventListener("carematch:open-chat-request", onOpenChatRequest);
    };
  }, []);

  const handleSearch = () => {
    navigate("/find-care");
  };

  const focusChatComposer = () => {
    window.requestAnimationFrame(() => {
      chatComposerRef.current?.focus();
    });
  };

  const openChatPanel = () => {
    setIsChatOpen(true);
    focusChatComposer();
  };

  const buildApiMessages = (priorMessages, userText) => [
    ...priorMessages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.text })),
    { role: "user", content: userText },
  ];

  const sendCarrieReply = async (text, { restoreToQuery, restoreToComposer } = {}) => {
    const trimmed = text.trim();
    if (!trimmed || chatSending) return;
    const userEntry = { id: `${Date.now()}-u`, role: "user", text: trimmed };
    const apiPayload = buildApiMessages(chatMessagesRef.current, trimmed);

    setChatSending(true);
    setChatMessages((prev) => [...prev, userEntry]);
    setIsChatOpen(true);

    try {
      const { data } = await sendChatMessages(apiPayload);
      const reply = data?.message;
      if (reply?.role === "assistant" && reply?.content) {
        setChatMessages((prev) => [
          ...prev,
          { id: `${Date.now()}-a`, role: "assistant", text: reply.content },
        ]);
        const matches = data?.matchedFacilities;
        const matchedPreferences = data?.matchedPreferences;
        if (Array.isArray(matches) && matches.length > 0) {
          setIsChatOpen(false);
          navigate("/care-explorer", {
            state: { carrieMatches: matches, carrieFilters: matchedPreferences, fromCarrie: true },
          });
        }
      } else {
        toast.error("No reply from Carrie");
        setChatMessages((prev) => prev.filter((m) => m.id !== userEntry.id));
        if (restoreToQuery) setQuery(trimmed);
        if (restoreToComposer) setChatComposer(trimmed);
      }
    } catch (err) {
      const desc =
        err?.response?.data?.message || err?.message || "Chat request failed.";
      toast.error("Carrie couldn’t respond", { description: desc });
      setChatMessages((prev) => prev.filter((m) => m.id !== userEntry.id));
      if (restoreToQuery) setQuery(trimmed);
      if (restoreToComposer) setChatComposer(trimmed);
    } finally {
      setChatSending(false);
      focusChatComposer();
    }
  };

  const handleChatSubmit = () => {
    const text = query.trim();
    if (!text || chatSending) return;
    setQuery("");
    sendCarrieReply(text, { restoreToQuery: true });
  };

  const handlePanelSend = () => {
    const text = chatComposer.trim();
    if (!text || chatSending) return;
    setChatComposer("");
    sendCarrieReply(text, { restoreToComposer: true });
  };

  const handleCarrieClick = () => {
    openChatPanel();
  };

  const clearTypingAnimation = () => {
    if (typingTimerRef.current) {
      window.clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearTypingAnimation();
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.onresult = null;
        speechRecognitionRef.current.onerror = null;
        speechRecognitionRef.current.onend = null;
        speechRecognitionRef.current.stop?.();
      }
      if (recordingToastIdRef.current) {
        toast.dismiss(recordingToastIdRef.current);
      }
      if (transcribingToastIdRef.current) {
        toast.dismiss(transcribingToastIdRef.current);
      }
    };
  }, []);

  const typeTextWithAnimation = (text) => {
    clearTypingAnimation();
    setQuery("");

    if (!text) return;

    let index = 0;
    typingTimerRef.current = window.setInterval(() => {
      index += 1;
      setQuery(text.slice(0, index));
      if (index >= text.length) {
        clearTypingAnimation();
      }
    }, 24);
  };

  const handleChange = (e) => {
    clearTypingAnimation();
    setQuery(e.target.value);
  };

  const transcribeAudio = async (audioBlob) => {
    if (!OPENAI_API_KEY) {
      const message = "Missing OpenAI key. Use browser voice recognition instead.";
      toast.error("Voice transcription unavailable", { description: message });
      return;
    }

    setIsTranscribing(true);
    transcribingToastIdRef.current = toast.loading("Transcribing your voice...");

    try {
      const file = new File([audioBlob], "voice-input.webm", {
        type: audioBlob.type || "audio/webm",
      });

      const formData = new FormData();
      formData.append("file", file);
      formData.append("model", "gpt-4o-mini-transcribe");

      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        const errorMessage =
          errorPayload?.error?.message || "Transcription failed. Please try again.";
        throw new Error(errorMessage);
      }

      const payload = await response.json();
      const transcript = (payload?.text || "").trim();

      if (!transcript) {
        const message = "No speech detected. Please try speaking clearly.";
        toast.error("Transcription failed", { id: transcribingToastIdRef.current, description: message });
        transcribingToastIdRef.current = null;
        return;
      }

      if (isChatOpenRef.current) {
        setChatComposer((prev) => (prev ? `${prev.trim()} ${transcript}` : transcript));
        focusChatComposer();
      } else {
        typeTextWithAnimation(transcript);
      }
      toast.success("Voice captured", {
        id: transcribingToastIdRef.current,
        description: isChatOpenRef.current ? "Transcript added to chat." : "Transcript added to search bar.",
      });
      transcribingToastIdRef.current = null;
    } catch (error) {
      const message = error.message || "Voice transcription failed.";
      toast.error("Transcription failed", {
        id: transcribingToastIdRef.current,
        description: message,
      });
      transcribingToastIdRef.current = null;
    } finally {
      setIsTranscribing(false);
    }
  };

  const startBrowserSpeechRecognition = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Voice input unavailable", {
        description: "Speech recognition is not supported in this browser.",
      });
      return;
    }

    const recognition = new SpeechRecognition();
    speechRecognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsRecording(true);
    recordingToastIdRef.current = toast.loading("Listening... speak now");

    recognition.onresult = (event) => {
      const transcript = event?.results?.[0]?.[0]?.transcript?.trim() || "";
      if (!transcript) return;
      if (isChatOpenRef.current) {
        setChatComposer((prev) => (prev ? `${prev.trim()} ${transcript}` : transcript));
        focusChatComposer();
      } else {
        typeTextWithAnimation(transcript);
      }
      toast.success("Voice captured", {
        description: isChatOpenRef.current ? "Transcript added to chat." : "Transcript added to search bar.",
      });
    };

    recognition.onerror = (event) => {
      toast.error("Voice input failed", {
        description: event?.error || "Please allow mic access and try again.",
      });
    };

    recognition.onend = () => {
      setIsRecording(false);
      if (recordingToastIdRef.current) {
        toast.dismiss(recordingToastIdRef.current);
        recordingToastIdRef.current = null;
      }
    };

    recognition.start();
  };

  const startRecording = async () => {
    clearTypingAnimation();

    if (!OPENAI_API_KEY) {
      startBrowserSpeechRecognition();
      return;
    }

    if (typeof MediaRecorder === "undefined") {
      startBrowserSpeechRecognition();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      const message = "This browser does not support voice input.";
      toast.error("Voice input unavailable", { description: message });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        await transcribeAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      recordingToastIdRef.current = toast.loading("Listening... tap mic again to stop");
    } catch {
      const message = "Microphone access was blocked. Please allow mic permission.";
      toast.error("Microphone blocked", { description: message });
    }
  };

  const stopRecording = () => {
    openChatPanel();
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop?.();
      speechRecognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingToastIdRef.current) {
      toast.dismiss(recordingToastIdRef.current);
      recordingToastIdRef.current = null;
    }
  };

  const handleMicClick = () => {
    if (isTranscribing) return;
    if (isRecording) {
      stopRecording();
      return;
    }
    startRecording();
  };

  const showSendButton = query.trim().length > 0;

  return (
    <div className="mx-auto mt-6 w-full max-w-4xl sm:mt-8 lg:mt-10 min-[1280px]:mt-8 min-[1280px]:max-w-3xl min-[1536px]:mt-10 min-[1536px]:max-w-4xl" id="search-bar">
      <div
        className="rounded-2xl p-[2px] shadow-sm min-[1280px]:rounded-3xl"
        style={{
          background: "linear-gradient(90deg, #00CFF4, #FECACB, #FCFCFC, #00CFF4, #00CFF4)",
          backgroundSize: "300% 100%",
          animation: "gradientShift 6s ease-in-out infinite",
        }}
      >
        <div className="flex min-h-44 flex-col justify-between rounded-[14px] bg-white p-4 sm:min-h-48 sm:p-5 md:min-h-52 md:p-6 min-[1280px]:min-h-48 min-[1280px]:rounded-[22px] min-[1280px]:p-5 min-[1536px]:min-h-52 min-[1536px]:p-6">
          <div className="flex items-center gap-2 rounded-lg">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleChange}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleChatSubmit();
                }
              }}
              placeholder="Try: 'Looking for Assisted living facilities in Los Angeles under $6000/month'"
              className="min-w-0 flex-1 rounded-lg bg-transparent text-[#132329] placeholder:italic placeholder:text-[#0000004D] focus:outline-none text-sm placeholder:text-base sm:text-base sm:placeholder:text-lg min-[1280px]:text-base min-[1280px]:placeholder:text-base min-[1536px]:text-lg min-[1536px]:placeholder:text-lg"
            />
            {/* <Mic className="h-4 w-4 shrink-0 text-[#132329] sm:h-5 sm:w-5 min-[1280px]:h-4 min-[1280px]:w-4 min-[1536px]:h-5 min-[1536px]:w-5" strokeWidth={2} aria-hidden /> */}
          </div>

          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleCarrieClick}
              className="flex items-center gap-2 rounded-lg bg-[#132329] px-3 py-3.5 text-white font-medium hover:opacity-90 text-sm sm:rounded-xl sm:px-4 sm:py-4 sm:text-base min-[1280px]:rounded-xl min-[1280px]:px-4 min-[1280px]:py-4 min-[1536px]:py-5"
            >
              <span className="whitespace-nowrap">Carrie – AI Advisor</span>
            </button>

            {showSendButton ? (
              <button
                type="button"
                className="flex items-center justify-center rounded-lg bg-[#00CFF4] px-3 py-3.5 text-white hover:opacity-90 disabled:opacity-40 sm:rounded-xl sm:px-4 sm:py-4 min-[1536px]:py-5 min-[1536px]:px-5"
                aria-label="Send"
                onClick={handleChatSubmit}
                disabled={chatSending}
              >
                {chatSending ? (
                  <Loader2 className="h-4 w-4 animate-spin sm:h-5 sm:w-5" strokeWidth={2.5} />
                ) : (
                  <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.5} />
                )}
              </button>
            ) : (
              <button
                type="button"
                className={`flex items-center justify-center rounded-lg px-3 py-3.5 text-[#132329] sm:rounded-xl sm:px-4 sm:py-4 min-[1536px]:py-5 min-[1536px]:px-5 ${
                  isRecording
                    ? "bg-[#FEE2E2] text-[#B91C1C] shadow-[0_0_0_3px_rgba(239,68,68,0.35)] mic-recording-pulse"
                    : isTranscribing
                    ? "bg-[#DBEAFE] text-[#1D4ED8] mic-transcribing-pulse"
                    : "bg-[#E2E8F0] hover:bg-[#CBD5F1]"
                }`}
                aria-label={
                  isRecording
                    ? "Stop recording"
                    : isTranscribing
                    ? "Transcribing voice"
                    : "Start voice input"
                }
                onClick={handleMicClick}
                disabled={isTranscribing}
              >
                {isTranscribing ? (
                  <Loader2 className="h-4 w-4 animate-spin sm:h-5 sm:w-5" strokeWidth={2.5} />
                ) : (
                  <Mic className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.5} />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <Sheet open={isChatOpen} onOpenChange={setIsChatOpen}>
        <SheetContent
          side="right"
          className="z-[100] flex h-full max-h-screen w-full flex-col gap-0 border-l border-slate-200 p-0 sm:max-w-md [&>button]:text-slate-600"
        >
          <SheetHeader className="shrink-0 space-y-1 border-b border-slate-200 px-4 py-4 text-left">
            <SheetTitle className="flex items-center gap-2 text-lg text-[#132329]">
              <MessageCircle className="h-5 w-5 shrink-0 text-[#00CFF4]" aria-hidden />
              Carrie – AI Advisor
            </SheetTitle>
            <SheetDescription className="text-left text-sm text-slate-600">
              Ask about senior living options. Use the microphone to speak, or type your message. Sign in for AI replies.
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {chatMessages.length === 0 && !chatSending ? (
              <p className="text-sm text-slate-500">Send a message from the search bar or type below to get started.</p>
            ) : (
              <>
                {chatMessages.map((m) => (
                  <div
                    key={m.id}
                    className={`mb-3 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                        m.role === "user"
                          ? "bg-[#00CFF4] text-white"
                          : "bg-slate-100 text-slate-800"
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
                {chatSending && (
                  <div className="mb-3 flex justify-start">
                    <div className="carrie-thinking-card max-w-[92%] rounded-3xl px-3 py-3 text-sm text-slate-700 sm:px-4">
                      <div className="flex items-start gap-3">
                        <div className="carrie-thinking-orb mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#00CFF4]/15 text-[#00A8C8]">
                          <MessageCircle className="h-5 w-5" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-[#132329]">Carrie is thinking</p>
                            <div className="flex items-center gap-1" aria-hidden>
                              <span className="carrie-thinking-dot h-1.5 w-1.5 rounded-full bg-[#00CFF4]" />
                              <span
                                className="carrie-thinking-dot h-1.5 w-1.5 rounded-full bg-[#00CFF4]"
                                style={{ animationDelay: "0.18s" }}
                              />
                              <span
                                className="carrie-thinking-dot h-1.5 w-1.5 rounded-full bg-[#00CFF4]"
                                style={{ animationDelay: "0.36s" }}
                              />
                            </div>
                          </div>
                          <p className="mt-1 text-sm text-slate-600">
                            {thinkingMessages[thinkingMessageIndex]}
                          </p>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#E2E8F0]">
                            <div className="carrie-thinking-progress h-full rounded-full" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="shrink-0 border-t border-slate-200 bg-white p-4">
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <textarea
                  ref={chatComposerRef}
                  value={chatComposer}
                  onChange={(e) => setChatComposer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handlePanelSend();
                    }
                  }}
                  placeholder="Type your message..."
                  rows={1}
                  disabled={chatSending}
                  className="h-11 min-h-[44px] w-full max-w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-[#132329] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00CFF4]/50 disabled:opacity-60"
                />
              </div>
              <div className="mb-2 flex shrink-0 items-end gap-2">
                <button
                  type="button"
                  className={`flex h-11 w-11 items-center justify-center rounded-xl text-[#132329] ${
                    isRecording
                      ? "bg-[#FEE2E2] text-[#B91C1C] shadow-[0_0_0_3px_rgba(239,68,68,0.35)] mic-recording-pulse"
                      : isTranscribing
                        ? "bg-[#DBEAFE] text-[#1D4ED8] mic-transcribing-pulse"
                        : "bg-[#E2E8F0] hover:bg-[#CBD5F1]"
                  }`}
                  aria-label={
                    isRecording
                      ? "Stop recording"
                      : isTranscribing
                        ? "Transcribing voice"
                        : "Start voice input"
                  }
                  onClick={handleMicClick}
                  disabled={isTranscribing}
                >
                  {isTranscribing ? (
                    <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.5} />
                  ) : (
                    <Mic className="h-5 w-5" strokeWidth={2.5} />
                  )}
                </button>
                <button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00CFF4] text-white hover:opacity-90 disabled:opacity-40"
                  aria-label="Send message"
                  onClick={handlePanelSend}
                  disabled={!chatComposer.trim() || chatSending}
                >
                  {chatSending ? (
                    <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.5} />
                  ) : (
                    <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Subtext */}
      <p className="mt-3 text-center text-sm font-medium italic text-[#132329B2] sm:mt-4 sm:text-base min-[1280px]:mt-4 min-[1280px]:text-sm min-[1536px]:text-base">
        Verified Communities, 100% Free Service, Expert Guidance
      </p>

      <div className="mt-4 flex justify-center sm:mt-5">
        <button
          type="button"
          onClick={handleSearch}
          className="rounded-xl px-5 py-3.5 text-sm font-semibold text-white transition hover:opacity-90 sm:px-6 sm:py-4 sm:text-base"
          style={{ backgroundColor: "#00ccf4" }}
        >
          Find Facilities
        </button>
      </div>

      <style jsx global>{`
        @keyframes gradientShift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes micPulse {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5);
          }
          70% {
            transform: scale(1.04);
            box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
          }
        }

        .mic-recording-pulse {
          animation: micPulse 1.3s ease-out infinite;
        }

        @keyframes transcribingPulse {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.45);
          }
          70% {
            transform: scale(1.04);
            box-shadow: 0 0 0 8px rgba(59, 130, 246, 0);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
          }
        }

        .mic-transcribing-pulse {
          animation: transcribingPulse 1.2s ease-out infinite;
        }

        @keyframes carrieThinkingFloat {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-2px);
          }
        }

        @keyframes carrieThinkingDot {
          0%, 80%, 100% {
            transform: translateY(0);
            opacity: 0.45;
          }
          40% {
            transform: translateY(-3px);
            opacity: 1;
          }
        }

        @keyframes carrieThinkingProgress {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(220%);
          }
        }

        .carrie-thinking-card {
          background:
            linear-gradient(135deg, rgba(255,255,255,0.96), rgba(240,249,255,0.98)),
            linear-gradient(90deg, rgba(0,207,244,0.08), rgba(99,102,241,0.08));
          border: 1px solid rgba(14, 165, 233, 0.14);
          box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
        }

        .carrie-thinking-orb {
          animation: carrieThinkingFloat 2.1s ease-in-out infinite;
          box-shadow: 0 8px 20px rgba(0, 207, 244, 0.18);
        }

        .carrie-thinking-dot {
          animation: carrieThinkingDot 1.1s ease-in-out infinite;
        }

        .carrie-thinking-progress {
          width: 42%;
          background: linear-gradient(90deg, #00cff4, #60a5fa, #818cf8);
          animation: carrieThinkingProgress 1.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}