"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { MessageCircle, X, Send, Sparkles } from "lucide-react"
import Image from "next/image"
import { motion, AnimatePresence } from "motion/react"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"

interface Message {
  id: string
  text: string
  sender: "user" | "bot"
  timestamp: Date
}

interface QuickQuestion {
  id: number;
  questionText: string;
  responseText: string;
  category: string;
}

export function Chatbot() {
  const { isAuthenticated } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [quickQuestions, setQuickQuestions] = useState<Record<string, QuickQuestion[]>>({})
  const [loadingQuestions, setLoadingQuestions] = useState(true)
  const [showQuickQuestions, setShowQuickQuestions] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Load quick questions when the component mounts
  useEffect(() => {
    const loadQuickQuestions = async () => {
      try {
        const response = await fetch('/api/quick-questions')
        if (response.ok) {
          const questions = await response.json()
          setQuickQuestions(questions)
        }
      } catch (error) {
        console.error('Error loading quick questions:', error)
      } finally {
        setLoadingQuestions(false)
      }
    }

    if (isOpen) {
      // Add initial welcome message when the chatbot opens
      if (messages.length === 0) {
        const welcomeMessage = isAuthenticated
          ? "Hello! I'm Berong the BFP Sta Cruz assistant. I'm powered by AI to help you with fire safety questions. Ask me anything!"
          : "Hello! I'm Berong the BFP Sta Cruz assistant. How can I help you with fire safety today?\n\n💡 Tip: Sign in to unlock AI-powered responses for more personalized help!"

        setMessages([
          {
            id: "1",
            text: welcomeMessage,
            sender: "bot",
            timestamp: new Date(),
          }
        ])
      }

      // Show quick questions when opening chatbot
      setShowQuickQuestions(true);

      // Load quick questions if not already loaded
      if (Object.keys(quickQuestions).length === 0) {
        loadQuickQuestions()
      }
    }
  }, [isOpen, messages.length, quickQuestions, isAuthenticated])

  const handleSend = async () => {
    if (!inputValue.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")

    // Get bot response and add to messages
    const botResponse = await generateBotResponse(inputValue)
    const botMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: botResponse,
      sender: "bot",
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, botMessage])
  }

  const handleQuickQuestion = async (questionText: string, responseText: string) => {
    // Add the question as a user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: questionText,
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])

    // Add the response as a bot message
    const botMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: responseText,
      sender: "bot",
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, botMessage])
  }

  const generateBotResponse = async (input: string): Promise<string> => {
    // Only use AI for authenticated users
    if (!isAuthenticated) {
      return generateRuleBasedResponse(input) + "\n\n💡 Sign in for AI-powered responses!"
    }

    try {
      // Use AI backend for logged-in users
      const response = await fetch('/api/chatbot/ai-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: input }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.response;
      } else {
        console.error('AI response failed:', response.status);
        // Fallback to rule-based response
        return generateRuleBasedResponse(input);
      }
    } catch (error) {
      console.error('Error calling AI backend:', error);
      // Fallback to rule-based response
      return generateRuleBasedResponse(input);
    }
  }

  const generateRuleBasedResponse = (input: string): string => {
    const lowerInput = input.toLowerCase()

    if (lowerInput.includes("fire") && lowerInput.includes("extinguisher")) {
      return "To use a fire extinguisher, remember PASS: Pull the pin, Aim at the base, Squeeze the handle, and Sweep side to side. Check our Adult section for detailed tutorials!"
    }
    if (lowerInput.includes("emergency") || lowerInput.includes("911")) {
      return "In case of fire emergency, call 911 immediately. Our emergency hotline is also available at (02) 888-0000."
    }
    if (lowerInput.includes("smoke detector") || lowerInput.includes("alarm")) {
      return "Smoke detectors should be tested monthly and batteries replaced annually. Install them on every level of your home, especially near bedrooms."
    }
    if (lowerInput.includes("kids") || lowerInput.includes("children")) {
      return "We have a dedicated Kids section with educational games and modules! Children can learn fire safety in a fun, interactive way."
    }
    if (lowerInput.includes("professional") || lowerInput.includes("training")) {
      return "Our Professional section offers advanced firefighting techniques, fire codes, and BFP manuals. Access requires professional credentials or admin permission."
    }
    if (lowerInput.includes("contact") || lowerInput.includes("location")) {
      return "BFP Sta Cruz Fire Station is located in Sta Cruz, Philippines. Contact us at (02) 8888-000 or bfp.stacruz@bfp.gov.ph"
    }

    return "Thank you for your question! For specific fire safety information, please explore our Dashboard, Adult, or Professional sections. For emergencies, always call 911."
  }

  return (
    <>
      {/* Chatbot Toggle - Berong Character on the right side */}
      <div className="fixed bottom-0 right-0 z-[60] pointer-events-none">
        {/* Berong Character - Clickable to toggle chat, hidden when chat is open */}
        <AnimatePresence>
          {!isOpen && (
            <motion.div
              className="pointer-events-auto cursor-pointer"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              onClick={() => setIsOpen(true)}
            >
              <Image
                src="/berong_chatbot.png"
                alt="Berong - BFP Assistant"
                width={180}
                height={180}
                className="chatbot-berong-image drop-shadow-2xl select-none"
                draggable={false}
                priority
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Chatbot Window - Positioned above chathead */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{
              opacity: 0,
              scale: 0,
              originX: 1,
              originY: 1
            }}
            animate={{
              opacity: 1,
              scale: 1,
              originX: 1,
              originY: 1
            }}
            exit={{
              opacity: 0,
              scale: 0,
              originX: 1,
              originY: 1
            }}
            transition={{
              type: "spring",
              stiffness: 350,
              damping: 30,
              mass: 0.8
            }}
            className="chatbot-window-container fixed bottom-24 right-6 z-50"
            style={{ transformOrigin: 'bottom right' }}
          >
            <Card className="chatbot-window w-[480px] max-w-[90vw] h-[70vh] min-h-[450px] max-h-[620px] flex flex-col shadow-2xl border-secondary p-0 gap-0 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground rounded-t-lg">
                <div className="flex items-center gap-2">
                  <Image
                    src="/RD Logo.png"
                    alt="BFP Assistant"
                    width={20}
                    height={20}
                    className="h-5 w-5 object-contain rounded-full"
                  />
                  <h3 className="font-semibold">BFP Assistant</h3>
                </div>
                <Button
                  onClick={() => setIsOpen(false)}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {/* Quick Questions Section */}
              {loadingQuestions ? (
                <div className="p-3 text-center">
                  <div className="animate-pulse text-xs text-muted-foreground">Loading suggestions...</div>
                </div>
              ) : Object.keys(quickQuestions).length > 0 && showQuickQuestions ? (
                <div className="py-2 px-3 bg-gray-50/50 border-b backdrop-blur-sm">

                  {/* Header with Icon */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Suggested Topics
                    </h4>
                  </div>

                  {/* Scrollable Area - Hidden Scrollbar */}
                  <div className="max-h-[110px] overflow-y-auto pr-1 space-y-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full">
                    {Object.entries(quickQuestions).map(([category, questions]) => (
                      <div key={category} className="first:mt-0">
                        {/* Category Header */}
                        <h5 className="text-[10px] font-bold text-gray-400 mb-2 pl-1 uppercase">
                          {category}
                        </h5>

                        {/* Question Chips */}
                        <div className="flex flex-wrap gap-2">
                          {questions.slice(0, 4).map((question) => (
                            <button
                              key={question.id}
                              onClick={() => handleQuickQuestion(question.questionText, question.responseText)}
                              className="
                            text-xs text-left px-3 py-2 rounded-xl
                            bg-white border border-gray-200 shadow-sm
                            text-gray-700 transition-all duration-200
                            hover:border-red-200 hover:bg-red-50 hover:text-red-700 hover:shadow-md
                            active:scale-95
                          "
                            >
                              {question.questionText}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${message.sender === "user" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
                        }`}
                    >
                      <p className="text-sm">{message.text}</p>
                    </div>
                  </div>
                ))}
                {/* Scroll anchor for auto-scroll */}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      // Hide quick questions when user starts typing
                      if (e.target.value.trim() !== '') {
                        setShowQuickQuestions(false);
                      }
                    }}
                    onKeyPress={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Ask about fire safety..."
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSend}
                    size="icon"
                    className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
};
