"use client"

import React from "react"
import { cx } from "class-variance-authority"
import { AnimatePresence, motion } from "framer-motion"
import { Mic, MicOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import fixzysIcon from "@/assets/fixzys-icon.png"
import { useAudioRecorder } from "@/hooks/useAudioRecorder"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useIsMobile } from "@/hooks/use-mobile"

interface OrbProps {
  dimension?: string
  className?: string
  tones?: {
    base?: string
    accent1?: string
    accent2?: string
    accent3?: string
  }
  spinDuration?: number
}

const ColorOrb: React.FC<OrbProps> = ({
  dimension = "192px",
  className,
  tones,
  spinDuration = 20,
}) => {
  const fallbackTones = {
    base: "oklch(95% 0.02 264.695)",
    accent1: "oklch(70% 0.18 35)", // Orange from FixZys brand
    accent2: "oklch(75% 0.15 45)", // Complementary orange
    accent3: "oklch(65% 0.20 25)", // Deeper orange
  }

  const palette = { ...fallbackTones, ...tones }

  const dimValue = parseInt(dimension.replace("px", ""), 10)

  const blurStrength =
    dimValue < 50 ? Math.max(dimValue * 0.008, 1) : Math.max(dimValue * 0.015, 4)

  const contrastStrength =
    dimValue < 50 ? Math.max(dimValue * 0.004, 1.2) : Math.max(dimValue * 0.008, 1.5)

  const pixelDot = dimValue < 50 ? Math.max(dimValue * 0.004, 0.05) : Math.max(dimValue * 0.008, 0.1)

  const shadowRange = dimValue < 50 ? Math.max(dimValue * 0.004, 0.5) : Math.max(dimValue * 0.008, 2)

  const maskRadius =
    dimValue < 30 ? "0%" : dimValue < 50 ? "5%" : dimValue < 100 ? "15%" : "25%"

  const adjustedContrast =
    dimValue < 30 ? 1.1 : dimValue < 50 ? Math.max(contrastStrength * 1.2, 1.3) : contrastStrength

  return (
    <div
      className={cn("color-orb", className)}
      style={{
        width: dimension,
        height: dimension,
        "--base": palette.base,
        "--accent1": palette.accent1,
        "--accent2": palette.accent2,
        "--accent3": palette.accent3,
        "--spin-duration": `${spinDuration}s`,
        "--blur": `${blurStrength}px`,
        "--contrast": adjustedContrast,
        "--dot": `${pixelDot}px`,
        "--shadow": `${shadowRange}px`,
        "--mask": maskRadius,
      } as React.CSSProperties}
    >
      <style dangerouslySetInnerHTML={{
        __html: `
        @property --angle {
          syntax: "<angle>";
          inherits: false;
          initial-value: 0deg;
        }

        .color-orb {
          display: grid;
          grid-template-areas: "stack";
          overflow: hidden;
          border-radius: 50%;
          position: relative;
          transform: scale(1.1);
        }

        .color-orb::before,
        .color-orb::after {
          content: "";
          display: block;
          grid-area: stack;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          transform: translateZ(0);
        }

        .color-orb::before {
          background:
            conic-gradient(
              from calc(var(--angle) * 2) at 25% 70%,
              var(--accent3),
              transparent 20% 80%,
              var(--accent3)
            ),
            conic-gradient(
              from calc(var(--angle) * 2) at 45% 75%,
              var(--accent2),
              transparent 30% 60%,
              var(--accent2)
            ),
            conic-gradient(
              from calc(var(--angle) * -3) at 80% 20%,
              var(--accent1),
              transparent 40% 60%,
              var(--accent1)
            ),
            conic-gradient(
              from calc(var(--angle) * 2) at 15% 5%,
              var(--accent2),
              transparent 10% 90%,
              var(--accent2)
            ),
            conic-gradient(
              from calc(var(--angle) * 1) at 20% 80%,
              var(--accent1),
              transparent 10% 90%,
              var(--accent1)
            ),
            conic-gradient(
              from calc(var(--angle) * -2) at 85% 10%,
              var(--accent3),
              transparent 20% 80%,
              var(--accent3)
            );
          box-shadow: inset var(--base) 0 0 var(--shadow) calc(var(--shadow) * 0.2);
          filter: blur(var(--blur)) contrast(var(--contrast));
          animation: spin var(--spin-duration) linear infinite;
        }

        .color-orb::after {
          background-image: radial-gradient(
            circle at center,
            var(--base) var(--dot),
            transparent var(--dot)
          );
          background-size: calc(var(--dot) * 2) calc(var(--dot) * 2);
          backdrop-filter: blur(calc(var(--blur) * 2)) contrast(calc(var(--contrast) * 2));
          mix-blend-mode: overlay;
        }

        .color-orb[style*="--mask: 0%"]::after {
          mask-image: none;
        }

        .color-orb:not([style*="--mask: 0%"])::after {
          mask-image: radial-gradient(black var(--mask), transparent 75%);
        }

        @keyframes spin {
          to {
            --angle: 360deg;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .color-orb::before {
            animation: none;
          }
        }
      `}} />
    </div>
  )
}

const SPEED_FACTOR = 1

interface ContextShape {
  showForm: boolean
  successFlag: boolean
  triggerOpen: () => void
  triggerClose: () => void
}

const FormContext = React.createContext({} as ContextShape)
const useFormContext = () => React.useContext(FormContext)

const FORM_WIDTH = 720
const FORM_HEIGHT = 400

export function MorphPanel() {
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()

  const [showForm, setShowForm] = React.useState(false)
  const [successFlag, setSuccessFlag] = React.useState(false)
  const [position, setPosition] = React.useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = React.useState(false)
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 })

  const triggerClose = React.useCallback(() => {
    setShowForm(false)
    textareaRef.current?.blur()
  }, [])

  const triggerOpen = React.useCallback(() => {
    setShowForm(true)
    setTimeout(() => {
      textareaRef.current?.focus()
    })
  }, [])

  const handleSuccess = React.useCallback(() => {
    triggerClose()
    setSuccessFlag(true)
    setTimeout(() => setSuccessFlag(false), 1500)
  }, [triggerClose])

  React.useEffect(() => {
    function clickOutsideHandler(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node) && showForm) {
        triggerClose()
      }
    }
    document.addEventListener("mousedown", clickOutsideHandler)
    return () => document.removeEventListener("mousedown", clickOutsideHandler)
  }, [showForm, triggerClose])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (showForm || isMobile) return // Não arrasta quando o formulário está aberto ou em mobile
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    })
  }

  const handleMouseMove = React.useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return
      
      const newX = e.clientX - dragStart.x
      const newY = e.clientY - dragStart.y
      
      setPosition({ x: newX, y: newY })
    },
    [isDragging, dragStart]
  )

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false)
  }, [])

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const ctx = React.useMemo(
    () => ({ showForm, successFlag, triggerOpen, triggerClose }),
    [showForm, successFlag, triggerOpen, triggerClose]
  )

  return (
    <div 
      ref={containerRef}
      className={cn(
        "fixed z-50",
        isMobile 
          ? "bottom-4 left-1/2 -translate-x-1/2" 
          : "bottom-8 right-8"
      )}
      style={isMobile ? {} : {
        transform: `translate(${position.x}px, ${position.y}px)`,
        cursor: isDragging ? 'grabbing' : (showForm ? 'default' : 'grab'),
      }}
    >
      <motion.div
        ref={wrapperRef}
        data-panel
        className={cx(
          "bg-card relative flex flex-col items-center overflow-hidden border border-border shadow-lg backdrop-blur-sm",
          isMobile && "max-w-[calc(100vw-2rem)]"
        )}
        initial={false}
        animate={{
          width: showForm ? (isMobile ? "min(90vw, 600px)" : FORM_WIDTH) : "auto",
          height: showForm ? (isMobile ? "min(70vh, 500px)" : FORM_HEIGHT) : 88,
          borderRadius: showForm ? 14 : 20,
        }}
        transition={{
          type: "spring",
          stiffness: 550 / SPEED_FACTOR,
          damping: 45,
          mass: 0.7,
          delay: showForm ? 0 : 0.08,
        }}
        onMouseDown={handleMouseDown}
      >
        <FormContext.Provider value={ctx}>
          <DockBar />
          <InputForm ref={textareaRef} onSuccess={handleSuccess} />
        </FormContext.Provider>
      </motion.div>
    </div>
  )
}

function DockBar() {
  const { showForm, triggerOpen } = useFormContext()
  return (
    <footer className="mt-auto flex h-[88px] items-center justify-center whitespace-nowrap select-none">
      <div className="flex items-center justify-center gap-3 px-4 py-3">
        <div className="flex w-fit items-center gap-3">
          <AnimatePresence mode="wait">
            {showForm ? (
              <motion.div
                key="blank"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0 }}
                exit={{ opacity: 0 }}
                className="h-8 w-8"
              />
            ) : (
              <motion.div
                key="logo"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-center"
              >
                <img src={fixzysIcon} alt="FixZys AI" className="h-8 w-8" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Button
          type="button"
          className="flex h-fit flex-1 justify-end rounded-full px-4 !py-2 text-base font-semibold"
          variant="ghost"
          onClick={triggerOpen}
        >
          <span className="truncate">Ask AI</span>
        </Button>
      </div>
    </footer>
  )
}

function InputForm({ ref, onSuccess }: { ref: React.Ref<HTMLTextAreaElement>; onSuccess: () => void }) {
  const { triggerClose, showForm } = useFormContext()
  const btnRef = React.useRef<HTMLButtonElement>(null)
  const { toast } = useToast()
  const { isRecording, audioBlob, startRecording, stopRecording, resetRecording } = useAudioRecorder()
  const [isTranscribing, setIsTranscribing] = React.useState(false)
  const [messages, setMessages] = React.useState<Array<{ text: string; timestamp: string; type: 'user' | 'ai' }>>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  React.useEffect(() => {
    scrollToBottom()
  }, [messages])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    
    const formData = new FormData(e.currentTarget)
    const message = formData.get('message') as string
    
    if (!message?.trim()) return
    
    // Adiciona mensagem do usuário ao chat
    const userMessage = {
      text: message,
      timestamp: new Date().toISOString(),
      type: 'user' as const
    }
    setMessages(prev => [...prev, userMessage])
    
    // Limpa o textarea
    if (textareaRef.current) {
      textareaRef.current.value = ''
    }
    
    setIsLoading(true)
    
    try {
      const response = await fetch('https://primary-production-dc42.up.railway.app/webhook/d6d48088-8d7b-48c2-ac01-7b8e88813d53', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          timestamp: new Date().toISOString(),
        }),
      })
      
      // Lê a resposta como texto primeiro (evita double-read)
      const responseText = await response.text()
      console.log('Webhook status:', response.status)
      console.log('Webhook response:', responseText)
      
      let aiResponseText = ""
      
      if (response.ok) {
        // Tenta fazer parse do JSON
        try {
          const data = JSON.parse(responseText)
          aiResponseText = data.output || data.message || data.response || data.text || responseText
        } catch (jsonError) {
          console.error('Resposta não é JSON válido:', jsonError)
          aiResponseText = responseText
        }
      } else {
        // Verifica se é o erro específico do n8n
        if (responseText.includes('Unused Respond to Webhook node')) {
          aiResponseText = "Erro no n8n: Configure o nó 'Respond to Webhook' no final do workflow e conecte-o ao fluxo principal."
        } else {
          // Tenta fazer parse do erro
          try {
            const errorData = JSON.parse(responseText)
            aiResponseText = `Erro: ${errorData.message || errorData.error || 'Erro ao processar mensagem'}`
          } catch {
            aiResponseText = `Erro: ${responseText || `Status ${response.status}`}`
          }
        }
      }
      
      const aiMessage = {
        text: aiResponseText,
        timestamp: new Date().toISOString(),
        type: 'ai' as const
      }
      setMessages(prev => [...prev, aiMessage])
      
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem. Verifique a URL do webhook.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  function handleKeys(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape") triggerClose()
    if (e.key === "Enter" && e.metaKey) {
      e.preventDefault()
      btnRef.current?.click()
    }
  }

  const handleMicClick = () => {
    toast({
      title: "Em desenvolvimento",
      description: "A funcionalidade de áudio está em desenvolvimento.",
    })
  }

  React.useEffect(() => {
    if (audioBlob && !isRecording) {
      handleAudioTranscription()
    }
  }, [audioBlob, isRecording])

  const handleAudioTranscription = async () => {
    if (!audioBlob) return

    setIsTranscribing(true)
    
    try {
      const reader = new FileReader()
      reader.readAsDataURL(audioBlob)
      
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1]
        
        const { data, error } = await supabase.functions.invoke('transcribe-audio', {
          body: { audio: base64Audio }
        })

        if (error) throw error

        if (data?.text && textareaRef.current) {
          textareaRef.current.value = data.text
          toast({
            title: "Áudio transcrito",
            description: "Seu áudio foi convertido em texto com sucesso!",
          })
        }
        
        resetRecording()
        setIsTranscribing(false)
      }
    } catch (error) {
      console.error('Erro na transcrição:', error)
      toast({
        title: "Erro",
        description: "Não foi possível transcrever o áudio",
        variant: "destructive",
      })
      resetRecording()
      setIsTranscribing(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="absolute bottom-0"
      style={{ width: FORM_WIDTH, height: FORM_HEIGHT, pointerEvents: showForm ? "all" : "none" }}
    >
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 550 / SPEED_FACTOR, damping: 45, mass: 0.7 }}
            className="flex h-full flex-col p-1"
          >
            <div className="flex justify-between items-center py-2 px-2 border-b border-border">
              <div className="flex items-center gap-2">
                <img src={fixzysIcon} alt="FixZys AI" className="h-8 w-8" />
                <p className="text-foreground flex items-center gap-[6px] select-none font-semibold text-base">
                  {isRecording ? "Gravando..." : isTranscribing ? "Transcrevendo..." : "FixZys AI"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={handleMicClick}
                  disabled={isTranscribing}
                  className={cn(
                    "h-9 w-9",
                    isRecording && "text-destructive animate-pulse"
                  )}
                >
                  {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>
                <button
                  type="submit"
                  ref={btnRef}
                  disabled={isLoading}
                  className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center justify-center gap-1 rounded-[12px] bg-transparent text-center select-none transition-colors disabled:opacity-50"
                >
                  <KeyHint>⌘</KeyHint>
                  <KeyHint className="w-fit">Enter</KeyHint>
                </button>
              </div>
            </div>

            {/* Área de mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>Comece uma conversa...</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex",
                      msg.type === 'user' ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-4 py-2",
                        msg.type === 'user'
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      )}
                    >
                      <p className="text-sm">{msg.text}</p>
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted text-foreground max-w-[80%] rounded-lg px-4 py-2">
                    <p className="text-sm">...</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Área de input */}
            <div className="border-t border-border p-2">
              <textarea
                ref={(node) => {
                  if (typeof ref === 'function') {
                    ref(node)
                  } else if (ref && 'current' in ref) {
                    (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node
                  }
                  textareaRef.current = node
                }}
                placeholder={isTranscribing ? "Transcrevendo áudio..." : "Pergunte-me qualquer coisa..."}
                name="message"
                className="bg-background text-foreground placeholder:text-muted-foreground w-full resize-none rounded-md p-3 outline-0 border border-input focus:border-primary transition-colors text-base min-h-[60px] max-h-[120px]"
                required
                onKeyDown={handleKeys}
                spellCheck={false}
                disabled={isTranscribing || isLoading}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute top-3 left-3"
          >
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  )
}

function KeyHint({ children, className }: { children: string; className?: string }) {
  return (
    <kbd
      className={cx(
        "text-muted-foreground flex h-7 w-fit items-center justify-center rounded-sm border border-border px-2 font-sans text-sm",
        className
      )}
    >
      {children}
    </kbd>
  )
}

export default MorphPanel
