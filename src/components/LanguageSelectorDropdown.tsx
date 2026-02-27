import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Language } from "@/i18n/translations";

const languages = [
  { code: "pt-BR" as Language, label: "Português (BR)", flag: "🇧🇷" },
  { code: "en" as Language, label: "English", flag: "🇺🇸" },
  { code: "es" as Language, label: "Español", flag: "🇪🇸" },
];

export function LanguageSelectorDropdown() {
  const { language, setLanguage } = useLanguage();
  const selected = languages.find((l) => l.code === language) || languages[0];
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm",
          "bg-card/60 backdrop-blur-md shadow-sm",
          "border-border",
          "text-foreground",
          "hover:bg-muted transition-all"
        )}
      >
        <span>{selected.flag}</span>
        <span>{selected.label}</span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          className={cn(
            "absolute right-0 z-50 mt-1 w-48 rounded-xl border shadow-lg overflow-hidden",
            "bg-card/90 backdrop-blur-md border-border",
            "animate-in fade-in slide-in-from-top-1 duration-150"
          )}
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code);
                setOpen(false);
              }}
              className={cn(
                "flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-colors",
                selected.code === lang.code
                  ? "font-semibold text-primary"
                  : "text-foreground hover:bg-muted"
              )}
            >
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
              {selected.code === lang.code && (
                <Check className="w-4 h-4 ml-auto" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
