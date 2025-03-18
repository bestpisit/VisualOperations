"use client"

import * as React from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { CalendarDays, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DatePickerDemoProps {
    onDateChange: (date: Date) => void;
    selectedDate?: Date; // Accept selectedDate as an optional prop
}

export function DatePicker({ onDateChange, selectedDate }: DatePickerDemoProps) {
    const [date, setDate] = React.useState<Date | undefined>(selectedDate); // Initialize state with selectedDate if provided

    const handleDateSelect = (selectedDate: Date | undefined) => {
        if (selectedDate) {
            setDate(selectedDate);
            onDateChange(selectedDate); // Pass the selected date to parent
        }
    };

    React.useEffect(() => {
        if (selectedDate) {
            setDate(selectedDate); // Update local state if selectedDate prop changes
        }
    }, [selectedDate]);

    // Format the date with Thai Buddhist year
    const formatDateInThai = (date: Date) => {
        const formattedDate = format(date, "d MMMM yyyy", { locale: th });
        const buddhistYear = date.getFullYear() + 543;
        return formattedDate.replace(date.getFullYear().toString(), buddhistYear.toString());
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "w-[220px] h-12 px-2 py-1 bg-white rounded-lg border border-slate-200 justify-start items-center gap-2 inline-flex",
                        !date && "text-slate-500"
                    )}
                >
                    <CalendarDays className="w-6 h-6 text-slate-500" />
                    <span className="grow shrink basis-0 text-slate-500 text-base font-normal leading-[30px]">
                        {date ? formatDateInThai(date) : "Pick a date"}
                    </span>
                    <ChevronDown className="w-6 h-6 relative text-slate-400" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDateSelect}
                    locale={th}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    );
}
