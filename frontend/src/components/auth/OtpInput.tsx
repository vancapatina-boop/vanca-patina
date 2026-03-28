import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  numInputs?: number;
  className?: string;
  disabled?: boolean;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  value,
  onChange,
  numInputs = 6,
  className,
  disabled = false,
}) => {
  const [activeInput, setActiveInput] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (inputRefs.current[activeInput]) {
      inputRefs.current[activeInput]?.focus();
    }
  }, [activeInput]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value;

    if (/^[0-9]$/.test(val)) {
      const newValue = value.slice(0, index) + val + value.slice(index + 1);
      onChange(newValue);

      if (index < numInputs - 1) {
        setActiveInput(index + 1);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (value[index]) {
        const newValue = value.slice(0, index) + value.slice(index + 1);
        onChange(newValue);
      } else if (index > 0) {
        setActiveInput(index - 1);
        const newValue = value.slice(0, index - 1) + value.slice(index);
        onChange(newValue);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      setActiveInput(index - 1);
    } else if (e.key === "ArrowRight" && index < numInputs - 1) {
      setActiveInput(index + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text").slice(0, numInputs);
    if (/^\d+$/.test(paste)) {
      onChange(paste);
      setActiveInput(Math.min(paste.length, numInputs - 1));
    }
  };

  return (
    <div className={cn("flex gap-2 justify-center", className)}>
      {Array.from({ length: numInputs }, (_, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={value[index] || ""}
          onChange={(e) => handleInputChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          onFocus={() => setActiveInput(index)}
          disabled={disabled}
          className={cn(
            "w-12 h-12 text-center text-xl font-semibold border-2 rounded-lg",
            "bg-white/5 border-white/10 focus:border-[#D4AF37]/50 text-white",
            "placeholder:text-zinc-600 transition-all focus:bg-white/10",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            activeInput === index && "border-[#D4AF37]/50 bg-white/10"
          )}
        />
      ))}
    </div>
  );
};