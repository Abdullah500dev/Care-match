import React from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminMessageIconButton({
  onClick,
  label = "Message",
  disabled = false,
  className = "",
  variant = "outline",
  size = "icon",
}) {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      className={`shrink-0 rounded-xl border-slate-200 text-[#00B8DB] hover:bg-cyan-50 hover:text-[#0E7490] ${className}`}
      aria-label={label}
      title={label}
    >
      <MessageSquare className="h-4 w-4" />
    </Button>
  );
}
