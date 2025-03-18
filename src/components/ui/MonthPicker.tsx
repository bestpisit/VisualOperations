import {
	add,
	eachMonthOfInterval,
	endOfYear,
	format,
	isEqual,
	isFuture,
	parse,
	startOfMonth,
	startOfToday,
} from 'date-fns';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import * as React from 'react';
import { cn, getThaiMonthAndYear, getThaiMonthName, getThaiYear } from "@/lib/utils";
import { buttonVariants } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

function getStartOfCurrentMonth() {
	return startOfMonth(startOfToday());
}

interface MonthPickerProps {
	currentMonth: Date | null;
	onMonthChange: (newMonth: Date) => void;
}

export function MonthPicker({ currentMonth, onMonthChange }: MonthPickerProps) {
	const [currentYear, setCurrentYear] = React.useState(
		currentMonth ? format(currentMonth, 'yyyy') : format(new Date(), 'yyyy'),
	);
	const firstDayCurrentYear = parse(currentYear, 'yyyy', new Date());

	const months = eachMonthOfInterval({
		start: firstDayCurrentYear,
		end: endOfYear(firstDayCurrentYear),
	});

	function previousYear() {
		const firstDayNextYear = add(firstDayCurrentYear, { years: -1 });
		setCurrentYear(format(firstDayNextYear, 'yyyy'));
	}

	function nextYear() {
		const firstDayNextYear = add(firstDayCurrentYear, { years: 1 });
		setCurrentYear(format(firstDayNextYear, 'yyyy'));
	}

	return (
		<Popover>
			<PopoverTrigger asChild>
				<button className={cn(
                    "w-[220px] h-12 px-2 py-1 bg-white rounded-lg justify-between border border-slate-200 items-center gap-2 inline-flex",
                    "text-slate-500 font-medium transition-colors hover:bg-gray-50 hover:shadow-sm focus:ring focus:ring-indigo-500",
                    !months && "text-muted-foreground"
                )}>
                    <CalendarDays className="w-4 h-4 text-slate-500" />
					{currentMonth ? getThaiMonthAndYear(format(currentMonth, 'yyyy-MM-dd')) : 'Select Month'}
                    <ChevronDown className="w-4 h-4 text-slate-400" />
				</button>
			</PopoverTrigger>
			<PopoverContent className="p-4">
				<div className="flex flex-col justify-center">
					<div className="space-y-4">
						<div className="relative flex items-center justify-center pt-1">
							<div
								className="text-sm font-medium"
								aria-live="polite"
								role="presentation"
								id="month-picker"
							>
								{getThaiYear(format(firstDayCurrentYear, 'yyyy-MM-dd'))}
							</div>
							<div className="flex items-center space-x-1">
								<button
									name="previous-year"
									aria-label="Go to previous year"
									className={cn(
										buttonVariants({ variant: 'outline' }),
										'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
										'absolute left-1',
									)}
									type="button"
									onClick={previousYear}
								>
									<ChevronLeft className="h-4 w-4" />
								</button>
								<button
									name="next-year"
									aria-label="Go to next year"
									className={cn(
										buttonVariants({ variant: 'outline' }),
										'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
										'absolute right-1 disabled:bg-slate-100',
									)}
									type="button"
									disabled={isFuture(add(firstDayCurrentYear, { years: 1 }))}
									onClick={nextYear}
								>
									<ChevronRight className="h-4 w-4" />
								</button>
							</div>
						</div>
						<div
							className="grid w-full grid-cols-3 gap-2"
							role="grid"
							aria-labelledby="month-picker"
						>
							{months.map((month) => (
								<div
									key={month.toString()}
									className="relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-slate-100 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md dark:[&:has([aria-selected])]:bg-slate-800"
									role="presentation"
								>
									<button
										name="day"
										className={cn(
											'inline-flex h-9 w-20 items-center justify-center rounded-md text-sm font-normal ring-offset-white transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 aria-selected:opacity-100 dark:ring-offset-slate-950 dark:hover:bg-slate-800 dark:hover:text-slate-50 dark:focus-visible:ring-slate-800',
											isEqual(month, currentMonth ?? new Date()) &&
												'bg-slate-900 text-slate-50 hover:bg-slate-900 hover:text-slate-50 focus:bg-slate-900 focus:text-slate-50 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-50 dark:hover:text-slate-900 dark:focus:bg-slate-50 dark:focus:text-slate-900',
											!isEqual(month, currentMonth ?? new Date()) &&
												isEqual(month, getStartOfCurrentMonth()) &&
												'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50',
										)}
										disabled={isFuture(month)}
										role="gridcell"
										tabIndex={-1}
										type="button"
										onClick={() => onMonthChange(month)}
									>
										<time dateTime={format(month, 'yyyy-MM-dd')}>
											{getThaiMonthName(format(month, 'yyyy-MM-dd'))}
										</time>
									</button>
								</div>
							))}
						</div>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
