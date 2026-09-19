import React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";

export function CustomDatePicker({ date, setDate, placeholder = "Pick a date", className }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal bg-[var(--bg-elevated)] border-[var(--border-default)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] text-[var(--text-primary)] rounded-xl py-6 px-4 font-mono",
            !date && "text-[var(--text-secondary)]",
            className
          )}
        >
          <CalendarIcon className="mr-3 h-4 w-4" />
          {date ? format(new Date(date), "dd / MM / yyyy") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-none bg-[#1c1c1f] rounded-[24px] overflow-hidden shadow-2xl relative" align="start">
        {/* Purple top accent/glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-1.5 bg-[#8b5cf6] rounded-b-xl shadow-[0_0_20px_#8b5cf6]" />
        
        <Calendar
          mode="single"
          selected={date ? new Date(date) : undefined}
          onSelect={(d) => d && setDate(d.toISOString())}
          initialFocus
          className="p-5 pt-6"
          classNames={{
            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
            month: "space-y-4",
            month_caption: "flex justify-center pt-2 pb-2 relative items-center",
            caption_label: "text-lg font-medium text-[var(--text-primary)]",
            nav: "space-x-1 flex items-center",
            button_previous: cn(
              "absolute left-4 top-8 h-8 w-8 bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] flex items-center justify-center transition-colors border border-[var(--border-default)] rounded-full z-10"
            ),
            button_next: cn(
              "absolute right-4 top-8 h-8 w-8 bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] flex items-center justify-center transition-colors border border-[var(--border-default)] rounded-full z-10"
            ),
            month_grid: "w-full border-collapse space-y-2 text-center mt-4",
            weekdays: "flex w-full mt-4",
            weekday: "text-[#8a8b94] font-semibold text-[11px] uppercase tracking-wider w-10 flex items-center justify-center pb-2",
            week: "flex w-full mt-2 gap-1",
            day: "h-10 w-10 p-0 font-normal rounded-full text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors flex items-center justify-center text-sm",
            selected: "bg-[#8b5cf6] text-[var(--text-primary)] hover:bg-[#8b5cf6] hover:text-[var(--text-primary)] rounded-full shadow-[0_0_15px_rgba(139,92,246,0.6)] font-bold",
            today: "text-[#8b5cf6] font-bold bg-[#8b5cf6]/10",
            outside: "text-[#4a4b50] opacity-30",
            disabled: "text-[#4a4b50] opacity-30",
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
