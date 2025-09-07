"use client";

import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SendHorizonal, Upload } from "lucide-react";

interface Message {
  id: number;
  sender: "user" | "bot";
  content: string;
}

interface GeminiRequest {
  contents: Array<{
    role: "user" | "model";
    parts: Array<{ text: string }>;
  }>;
  generationConfig: {
    responseMimeType: string;
  };
  tools: Array<{ googleSearch: {} }>;
}

interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason: string;
    index: number;
  }>;
}

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

// ✨ Magical themes
const themes = {
  aurora: {
    bg: "bg-gradient-to-br from-purple-900 via-indigo-900 to-black",
    bubbleUser: "bg-purple-600 text-white shadow-purple-500/50",
    bubbleBot: "bg-indigo-200 text-black",
    button: "bg-purple-500 hover:bg-purple-400 text-white",
  },
  neon: {
    bg: "bg-gradient-to-br from-black via-gray-900 to-black",
    bubbleUser: "bg-green-500 text-black shadow-green-400/70 border border-green-300",
    bubbleBot: "bg-pink-500 text-white shadow-pink-400/70 border border-pink-300",
    button: "bg-yellow-400 hover:bg-yellow-300 text-black font-bold",
  },
  cosmic: {
    bg: "bg-gradient-to-tr from-indigo-900 via-black to-blue-900",
    bubbleUser: "bg-blue-600 text-white shadow-lg shadow-blue-400/50",
    bubbleBot: "bg-gray-100 text-black shadow-inner",
    button: "bg-blue-500 hover:bg-blue-400 text-white",
  },
  sakura: {
    bg: "bg-gradient-to-br from-pink-200 via-pink-300 to-pink-500",
    bubbleUser: "bg-pink-600 text-white shadow-pink-400/50",
    bubbleBot: "bg-white text-pink-700 border border-pink-300",
    button: "bg-pink-500 hover:bg-pink-400 text-white",
  },
  galaxy: {
    bg: "bg-gradient-to-r from-purple-800 via-black to-indigo-900",
    bubbleUser: "bg-fuchsia-600 text-white shadow-fuchsia-400/50",
    bubbleBot: "bg-indigo-300 text-black",
    button: "bg-fuchsia-500 hover:bg-fuchsia-400 text-white",
  },
  ocean: {
    bg: "bg-gradient-to-tr from-blue-800 via-cyan-900 to-blue-950",
    bubbleUser: "bg-cyan-600 text-white shadow-cyan-400/50",
    bubbleBot: "bg-teal-200 text-black",
    button: "bg-cyan-400 hover:bg-cyan-300 text-black",
  },
};

export default function ChatbotUI(): JSX.Element {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [pdfUploaded, setPdfUploaded] = useState<boolean>(false);
  const [theme, setTheme] = useState<keyof typeof themes>("aurora"); // 🌈 default theme
  const pdfInputRef = useRef<HTMLInputElement | null>(null);

  // Load PDF.js CDN script dynamically
  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
    };
    document.body.appendChild(script);
  }, []);

  const handleSend = async (): Promise<void> => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      sender: "user",
      content: input.trim(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsTyping(true);

    const requestBody: GeminiRequest = {
      contents: updatedMessages.map((msg) => ({
        role: msg.sender === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      })),
      generationConfig: {
        responseMimeType: "text/plain",
      },
      tools: [
        {
          googleSearch: {},
        },
      ],
    };

    try {
      const res: Response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=AIzaSyDNkyADTHw5wC9nCqXDvxGCEHfVgQSuP1E",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      const data: GeminiResponse = await res.json();

      const botText: string =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response";

      const botMessage: Message = {
        id: Date.now() + 1,
        sender: "bot",
        content: botText,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("API Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "bot",
          content: "Sorry, something went wrong.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") return;

    setPdfUploaded(true);

    const reader = new FileReader();
    reader.onload = async function () {
      const typedarray = new Uint8Array(reader.result as ArrayBuffer);

      const pdf = await window.pdfjsLib.getDocument({ data: typedarray }).promise;
      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map((item: any) => item.str).join(" ");
        fullText += `\n--- Page ${i} ---\n${strings}\n`;
      }

      console.log("📄 Parsed PDF Content:\n", fullText);
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <div
      className={`h-screen w-screen flex flex-col items-center justify-center relative overflow-hidden text-white font-sans transition-all duration-500 ${themes[theme].bg}`}
    >
      {/* Header */}
      <h1 className="text-3xl font-bold mb-6 text-center drop-shadow-xl">
        ✨ Shreya's Magical Chatbot
      </h1>

      {/* Theme Switcher */}
      <div className="absolute top-5 right-5 flex gap-2 z-50">
        {Object.keys(themes).map((t) => (
          <Button
            key={t}
            onClick={() => setTheme(t as keyof typeof themes)}
            className={`text-xs px-3 py-1 rounded-full shadow-md ${
              themes[t as keyof typeof themes].button
            }`}
          >
            {t}
          </Button>
        ))}
      </div>

      <Card className="flex-1 overflow-hidden shadow-xl rounded-2xl backdrop-blur bg-black/30 border border-white/30 relative z-10 w-full max-w-2xl">
        <ScrollArea className="h-full p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex transition-transform duration-300 ${
                msg.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`rounded-xl px-4 py-2 max-w-xs text-sm shadow-md transform transition-all duration-300 ${
                  msg.sender === "user"
                    ? themes[theme].bubbleUser
                    : themes[theme].bubbleBot
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-200 text-black px-4 py-2 rounded-xl text-sm animate-pulse">
                Typing...
              </div>
            </div>
          )}

          {pdfUploaded && (
            <div className="flex justify-start">
              <div className="bg-green-600 text-white px-4 py-1 rounded-xl text-sm">
                ✅ 1 PDF file uploaded
              </div>
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Input Section */}
      <div className="mt-4 flex flex-col gap-2 relative z-10 w-full max-w-2xl px-4">
        <div className="flex gap-2">
          <Input
            placeholder="Type your message..."
            value={input}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setInput(e.target.value)
            }
            onKeyDown={handleKeyDown}
            className="rounded-xl shadow-md focus:ring-2 focus:ring-blue-300 transition-all bg-white text-black w-full"
          />
          <Button
            onClick={handleSend}
            variant="default"
            className={`rounded-xl transition-colors ${themes[theme].button}`}
          >
            <SendHorizonal size={18} />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            accept=".pdf"
            ref={pdfInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            onClick={() => pdfInputRef.current?.click()}
            className={`text-sm px-3 py-1 rounded-xl ${themes[theme].button}`}
          >
            <Upload size={16} className="mr-1" /> Upload PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
