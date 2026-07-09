import { useMemo, useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { WatchSchedule, useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { ChevronDown, ChevronUp, Calendar as CalendarIcon } from 'lucide-react';

interface ScheduleMatrixViewProps {
    schedule: WatchSchedule;
    className?: string;
    // currentUserRole: 'captain' | 'crew';
    currentUserId?: string;
    showOnlyUserId?: string;
    printMode?: boolean;
}

export function ScheduleMatrixView({ schedule, className, currentUserId, showOnlyUserId, printMode = false }: ScheduleMatrixViewProps) {
    const { users } = useData();
    const { user } = useAuth();

    // 1. Determine columns (Unique Crew, ordered if possible)
    // For now, we extract unique crew from all slots. In the future, schedule.crewOrder will drive this.
    const crewColumns = useMemo(() => {
        const uniqueCrew = new Map<string, string>(); // Id -> Name
        schedule.slots.forEach(slot => {
            slot.crew.forEach(c => {
                const liveUser = users.find(u => u.id === c.userId) || (user?.id === c.userId ? user : null);
                const name = liveUser?.firstName?.trim() || c.userFirstName?.trim() || 'Unknown';
                uniqueCrew.set(c.userId, name);
            });
        });

        let allColumns = Array.from(uniqueCrew.entries()).map(([id, firstName]) => ({ id, firstName }));

        if (showOnlyUserId) {
            allColumns = allColumns.filter(c => c.id === showOnlyUserId);
        }

        return allColumns;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [schedule, showOnlyUserId]);

    // 2. Determine Rows (Time Slots)
    // We assume slots are sorted by time.
    const rows = schedule.slots;

    // Helper: Is Valid Time
    const getHour = (isoString: string) => {
        const d = new Date(isoString);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const getDay = (isoString: string) => {
        const d = new Date(isoString);
        return d.toLocaleDateString([], { weekday: 'short', day: 'numeric' });
    };

    // Calculate current time position for Red Line
    // We need to update this periodically to move the line
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        // Update every 1 minute to keep the line moving relatively smoothly
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000 * 60);

        return () => clearInterval(timer);
    }, []);

    const activeSlotId = rows.find(slot => {
        const start = new Date(slot.start);
        const end = new Date(slot.end);
        return currentTime >= start && currentTime < end;
    })?.id;

    const getProgress = (slot: any) => {
        const start = new Date(slot.start).getTime();
        const end = new Date(slot.end).getTime();
        const now = currentTime.getTime();

        if (now < start) return 0;
        if (now > end) return 100;
        const total = end - start;
        const current = now - start;
        return (current / total) * 100;
    };


    // 3. Group slots by Day
    const dayGroups = useMemo(() => {
        const groups: { date: string; slots: typeof rows }[] = [];
        rows.forEach(slot => {
            const dateStr = getDay(slot.start);
            const existingGroup = groups.find(g => g.date === dateStr);
            if (existingGroup) {
                existingGroup.slots.push(slot);
            } else {
                groups.push({ date: dateStr, slots: [slot] });
            }
        });
        return groups;
    }, [rows]);

    // State for Open Accordion (Default: First Day)
    const [openDay, setOpenDay] = useState<string | null>(dayGroups[0]?.date || null);

    return (
        <div className={cn("flex flex-col gap-2", className)}>
            {/* Legend / Column Headers - kept sticky or at top? Users usually want to see columns. */}
            {/* If we put it inside each accordion, it repeats. If outside, it might be far away. */}
            {/* Let's put it at the top, but ensure alignment matches inner grids. */}
            {/* Day Groups as Accordions */}
            <div className="divide-y border rounded-xl overflow-hidden bg-background shadow-sm">
                {dayGroups.map((group) => {
                    const isOpen = printMode || openDay === group.date;

                    return (
                        <div key={group.date} className="bg-card schedule-day-group">
                            {/* Accordion Header */}
                            <button
                                onClick={() => setOpenDay(isOpen ? null : group.date)}
                                className={cn(
                                    "w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/50",
                                    isOpen && "bg-muted/30 font-semibold border-b"
                                )}
                            >
                                <span className="text-sm font-bold flex items-center gap-2">
                                    <CalendarIcon className="h-4 w-4 text-primary" />
                                    {group.date}
                                </span>
                                {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                            </button>

                            {/* Accordion Body */}
                            {isOpen && (
                                <div className={cn("animate-in fade-in slide-in-from-top-2 duration-200", printMode && "animate-none")}>
                                    {/* Header Row - Now inside the day group */}
                                    <div className="grid border-b bg-muted/30 schedule-header-row" style={{ gridTemplateColumns: `80px repeat(${crewColumns.length}, 1fr)` }}>
                                        <div className="p-2 text-xs font-semibold text-muted-foreground border-r flex items-center justify-center">
                                            Time
                                        </div>
                                        {crewColumns.map(c => (
                                            <div key={c.id} className="p-2 text-xs font-semibold text-center border-r last:border-r-0 truncate flex items-center justify-center flex-col">
                                                {c.firstName}
                                                {c.id === currentUserId && <span className="text-[9px] text-primary leading-none mt-0.5">(You)</span>}
                                            </div>
                                        ))}
                                    </div>

                                    {group.slots.map((slot, index) => {
                                        const prevSlot = group.slots[index - 1];
                                        const nextSlot = group.slots[index + 1];


                                        return (
                                            <div
                                                key={slot.id}
                                                className={cn(
                                                    "grid min-h-[50px] relative",
                                                    slot.id === activeSlotId && "bg-primary/5" // Highlight active row background slightly
                                                )}
                                                style={{ gridTemplateColumns: `80px repeat(${crewColumns.length}, 1fr)` }}
                                            >
                                                {/* Continuous Active Line - Span entire row */}
                                                {slot.id === activeSlotId && (
                                                    <div
                                                        className="absolute left-[8px] right-0 h-[1.5px] bg-[#df5750] z-30 pointer-events-none transition-all duration-300 ease-in-out flex items-center shadow-sm"
                                                        style={{ top: `${getProgress(slot)}%` }}
                                                    >
                                                        <div className="absolute -left-[8px] bg-[#df5750] text-[10px] font-medium text-white px-2 py-0.5 rounded-full shadow-sm tabular-nums tracking-wide">
                                                            {currentTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: false })}
                                                        </div>
                                                    </div>
                                                )}
                                                {/* Time Column */}
                                                <div className={cn(
                                                    "p-2 text-xs text-muted-foreground border-r border-slate-300 dark:border-white/10 flex flex-col justify-center items-center text-center",
                                                    index === 0 ? "" : "border-t border-slate-300 dark:border-white/10"
                                                )}>
                                                    <span>{getHour(slot.start)}</span>
                                                    <span className="text-[10px] opacity-50">{getHour(slot.end)}</span>
                                                </div>

                                                {/* Crew Columns */}
                                                {crewColumns.map(column => {
                                                    const isOnWatch = slot.crew.some(c => c.userId === column.id);
                                                    const isConnectedTop = isOnWatch && prevSlot?.crew.some(c => c.userId === column.id);
                                                    const isConnectedBottom = isOnWatch && nextSlot?.crew.some(c => c.userId === column.id);

                                                    // Grid Lines: Always visible (except top row)
                                                    // Card sits on top (z-10) and is OPAQUE to cover the lines
                                                    return (
                                                        <div
                                                            key={`${slot.id}-${column.id}`}
                                                            className={cn(
                                                                "border-r border-slate-300 dark:border-white/10 relative last:border-r-0",
                                                                index === 0 ? "" : "border-t border-slate-300 dark:border-white/10"
                                                            )}
                                                        >
                                                            {isOnWatch && (
                                                                <div className={cn(
                                                                    "absolute z-10",
                                                                    // specific colors requested by user
                                                                    "bg-[#D7E6FC] dark:bg-[#D7E6FC]",
                                                                    "border border-[#1E3A8A] dark:border-[#1E3A8A]",
                                                                    "rounded-md",

                                                                    // Simulated padding
                                                                    "left-1 right-1",

                                                                    // Vertical Merging Logic covering borders:
                                                                    // If connected top, pull up over the border (-1px). Else valid gap (top-1).
                                                                    isConnectedTop ? "-top-[1px] rounded-t-none border-t-0" : "top-1",

                                                                    // If connected bottom, extend to bottom edge (0). Else valid gap (bottom-1).
                                                                    isConnectedBottom ? "bottom-0 rounded-b-none border-b-0" : "bottom-1"
                                                                )} />
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>

    );
}
