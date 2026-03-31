import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, Mic } from "lucide-react";
import { toast } from "sonner";

export default function SearchBar() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const typingTimerRef = useRef(null);
  const recordingToastIdRef = useRef(null);
  const transcribingToastIdRef = useRef(null);
  const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

  const handleSearch = () => {
    navigate("/find-care");
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
      const message = "Missing OpenAI key. Add VITE_OPENAI_API_KEY in your env.";
      toast.error("Voice input unavailable", { description: message });
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

      typeTextWithAnimation(transcript);
      toast.success("Voice captured", {
        id: transcribingToastIdRef.current,
        description: "Transcript added to search bar.",
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

  const startRecording = async () => {
    clearTypingAnimation();

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
              type="text"
              value={query}
              onChange={handleChange}
              placeholder="Try: 'Looking for memory care in Los Angeles under $6000/month'"
              className="min-w-0 flex-1 rounded-lg bg-transparent text-[#132329] placeholder:italic placeholder:text-[#0000004D] focus:outline-none text-sm placeholder:text-base sm:text-base sm:placeholder:text-lg min-[1280px]:text-base min-[1280px]:placeholder:text-base min-[1536px]:text-lg min-[1536px]:placeholder:text-lg"
            />
            {/* <Mic className="h-4 w-4 shrink-0 text-[#132329] sm:h-5 sm:w-5 min-[1280px]:h-4 min-[1280px]:w-4 min-[1536px]:h-5 min-[1536px]:w-5" strokeWidth={2} aria-hidden /> */}
          </div>

          <div className="mt-2 flex items-center justify-end gap-2">
            <button className="flex items-center gap-2 rounded-lg bg-[#132329] px-3 py-3.5 text-white font-medium hover:opacity-90 text-sm sm:rounded-xl sm:px-4 sm:py-4 sm:text-base min-[1280px]:rounded-xl min-[1280px]:px-4 min-[1280px]:py-4 min-[1536px]:py-5">
              <span className="whitespace-nowrap">Carrie – AI Advisor</span>
            </button>

            {showSendButton ? (
              <button
                className="flex items-center justify-center rounded-lg bg-[#00CFF4] px-3 py-3.5 text-white hover:opacity-90 sm:rounded-xl sm:px-4 sm:py-4 min-[1536px]:py-5 min-[1536px]:px-5"
                aria-label="Send"
                onClick={handleSearch}
              >
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.5} />
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
      `}</style>
    </div>
  );
}