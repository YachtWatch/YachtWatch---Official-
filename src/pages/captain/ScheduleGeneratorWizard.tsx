import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useData, UserData, WATCH_TYPE_DEFAULTS, StandingOrder } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { ScheduleMatrixView } from '../../components/ScheduleMatrixView';
import { ArrowLeft, Anchor, Calendar as CalendarIcon, Clock, SlidersHorizontal, GripVertical, Plus, X } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ProfileDropdown } from '../../components/ui/ProfileDropdown';
import { cn } from '../../lib/utils';
import { WatchSchedule } from '../../contexts/DataContext';
import { supabase } from '../../lib/supabase';
import { Switch } from '../../components/ui/switch';
import CustomPaywall from '../../components/subscription/CustomPaywall';
import { useSubscription } from '../../context/SubscriptionContext';
import { Capacitor } from '@capacitor/core';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const fieldStyle: React.CSSProperties = {
    background: '#ffffff',
    border: '1.5px solid #e2ddd8',
    borderRadius: 10,
    padding: '13px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    width: '100%',
    boxSizing: 'border-box',
};

const parseDateStr = (s: string) => s ? new Date(s + 'T00:00:00') : null;
const parseTimeStr = (s: string) => {
    if (!s) return null;
    const [h, m] = s.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
};

const superscriptStyle: React.CSSProperties = { fontSize: 9, fontWeight: 700, color: '#1B2A6B', lineHeight: 1, alignSelf: 'flex-start', marginTop: 1 };

const PickerTrigger = React.forwardRef<HTMLDivElement, { value?: string; onClick?: () => void; icon: React.ReactNode; placeholder: string; superscript?: React.ReactNode }>(
    ({ value, onClick, icon, placeholder, superscript }, ref) => (
        <div ref={ref} style={fieldStyle} onClick={onClick}>
            <span style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 2 }}>
                <span style={{ fontSize: 14, color: value ? '#0f172a' : '#94a3b8' }}>{value || placeholder}</span>
                {superscript}
            </span>
            {icon}
        </div>
    )
);

const clockIcon = <Clock style={{ width: 16, height: 16, color: '#94a3b8', flexShrink: 0 }} />;



const TimePickerField: React.FC<{ label: string; value: string; onChange: (v: string) => void; isNextDay?: boolean }> = ({ label, value, onChange, isNextDay }) => {
    const native = Capacitor.isNativePlatform();
    const parsed = value ? (() => { const [h, m] = value.split(':').map(Number); const d = new Date(); d.setHours(h, m, 0, 0); return d; })() : null;
    const superscript = isNextDay ? <span style={superscriptStyle}>+1</span> : undefined;
    return (
        <div className="space-y-2">
            <label style={{ fontSize: 13 }} className="font-medium text-foreground">{label}</label>
            {native ? (
                <div style={{ ...fieldStyle, position: 'relative' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 2 }}>
                        <span style={{ fontSize: 14, color: value ? '#0f172a' : '#94a3b8' }}>{value || 'Select time'}</span>
                        {superscript}
                    </span>
                    {clockIcon}
                    <input type="time" value={value} onChange={e => onChange(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
                </div>
            ) : (
                <DatePicker
                    selected={parsed}
                    onChange={(d: Date | null) => d && onChange(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }))}
                    showTimeSelect showTimeSelectOnly
                    timeIntervals={15}
                    timeFormat="HH:mm"
                    dateFormat="HH:mm"
                    placeholderText="Select time"
                    customInput={<PickerTrigger icon={clockIcon} placeholder="Select time" superscript={superscript} />}
                />
            )}
        </div>
    );
};

interface SortableOrderCardProps {
    order: StandingOrder;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onRemove: () => void;
    onUpdate: (updates: Partial<StandingOrder>) => void;
}

function SortableOrderCard({ order, isExpanded, onToggleExpand, onRemove, onUpdate }: SortableOrderCardProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: order.id });
    const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
    const native = Capacitor.isNativePlatform();

    return (
        <div ref={setNodeRef} style={style} className="rounded-[10px] bg-white border border-[#e2ddd8] overflow-hidden">
            {/* Main row */}
            <div className="flex items-center gap-2 px-3 py-3">
                {/* Drag handle */}
                <button type="button" {...attributes} {...listeners} className="touch-none text-muted-foreground cursor-grab active:cursor-grabbing flex-shrink-0 p-1">
                    <GripVertical className="h-4 w-4" />
                </button>
                <span className="flex-1 text-sm text-foreground leading-snug">{order.text}</span>
                <button
                    type="button"
                    onClick={onToggleExpand}
                    className={cn('h-6 w-6 rounded-full flex items-center justify-center border transition-all flex-shrink-0',
                        isExpanded || order.time || order.requiresCompletion
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-muted-foreground border-border')}
                >
                    <SlidersHorizontal className="h-3 w-3" />
                </button>
                <button type="button" onClick={onRemove} className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-destructive flex-shrink-0">
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>

            {/* Settings panel */}
            {isExpanded && (
                <div className="border-t border-[#e2ddd8] px-3 pb-3 pt-2 space-y-3">
                    {/* Tied time */}
                    <div className="flex items-center gap-3">
                        <label style={{ fontSize: 12 }} className="font-medium text-foreground w-24 flex-shrink-0">Tied time</label>
                        <div style={{ ...fieldStyle, flex: 1, padding: '8px 12px', position: 'relative' }}>
                            <span style={{ fontSize: 13, color: order.time ? '#0f172a' : '#94a3b8' }}>{order.time || 'No time'}</span>
                            <input type="time" value={order.time || ''} onChange={e => onUpdate({ time: e.target.value || undefined })} style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
                        </div>
                        {order.time && (
                            <button type="button" onClick={() => onUpdate({ time: undefined })} className="text-xs text-muted-foreground underline flex-shrink-0">Clear</button>
                        )}
                    </div>

                    {/* Requires completion */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p style={{ fontSize: 12 }} className="font-medium text-foreground">Crew must mark done</p>
                            <p style={{ fontSize: 11 }} className="text-muted-foreground">Crew get a reminder; captain sees completion</p>
                        </div>
                        <input
                            type="checkbox"
                            checked={order.requiresCompletion}
                            onChange={e => onUpdate({ requiresCompletion: e.target.checked })}
                            className={`h-5 w-5 rounded border-input accent-primary ${native ? '' : 'cursor-pointer'}`}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ScheduleGeneratorWizard() {
    const { users, createSchedule, toggleWatchLeader, vessels } = useData();
    const { user: currentUser } = useAuth();
    const { isSubscribed } = useSubscription();
    const navigate = useNavigate();
    const location = useLocation();

    // Check for existing schedule to edit/remix
    const existingSchedule = location.state?.schedule as WatchSchedule | undefined;
    
    // Get current vessel
    const currentVessel = currentUser?.vesselId ? vessels.find(v => v.id === currentUser.vesselId) : null;

    // STEPS: 1=Config, 2=Crew, 3=Preview
    const [step, setStep] = useState(1);

    const [watchType, setWatchType] = useState<WatchSchedule['watchType']>(existingSchedule?.watchType || 'Navigation');
    const [scheduleName, setScheduleName] = useState(existingSchedule?.name || '');
    const [scheduleNameError, setScheduleNameError] = useState('');

    // Initializers for date/time
    const [startDate, setStartDate] = useState(() => {
        if (existingSchedule && existingSchedule.slots.length > 0) {
            return new Date(existingSchedule.slots[0].start).toISOString().split('T')[0];
        }
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    });

    const [startTime, setStartTime] = useState(() => {
        if (existingSchedule && existingSchedule.slots.length > 0) {
            return new Date(existingSchedule.slots[0].start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        }
        const now = new Date();
        return `${String(now.getHours()).padStart(2, '0')}:00`;
    });

    const [endDate, setEndDate] = useState(() => {
        if (existingSchedule && existingSchedule.slots.length > 0) {
            const lastSlot = existingSchedule.slots[existingSchedule.slots.length - 1];
            return new Date(lastSlot.end).toISOString().split('T')[0];
        }
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 8);
        return nextWeek.toISOString().split('T')[0];
    });

    const [endTime, setEndTime] = useState(() => {
        if (existingSchedule && existingSchedule.slots.length > 0) {
            const lastSlot = existingSchedule.slots[existingSchedule.slots.length - 1];
            return new Date(lastSlot.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        }
        return "12:00";
    });

    // Helper to calculate duration from existing slots if needed, or fallback to default
    const [duration, setDuration] = useState(() => {
        if (existingSchedule && existingSchedule.slots.length > 0) {
            const s1 = new Date(existingSchedule.slots[0].start);
            const s2 = new Date(existingSchedule.slots[0].end);
            const diffHours = (s2.getTime() - s1.getTime()) / (1000 * 60 * 60);
            return Math.round(diffHours);
        }
        return 4;
    });

    const [crewPerWatch, setCrewPerWatch] = useState(() => {
        if (existingSchedule?.watchConfig?.crewPerWatch) return existingSchedule.watchConfig.crewPerWatch;
        if (existingSchedule && existingSchedule.slots.length > 0) {
            return existingSchedule.slots[0].crew.length;
        }
        return 1;
    });
    const [isStaggered, setIsStaggered] = useState(existingSchedule?.watchConfig?.isStaggered !== undefined ? existingSchedule.watchConfig.isStaggered : true);

    // Anchor watch hours (single daily window, e.g. 20:00 → 08:00)
    const [anchorStartTime, setAnchorStartTime] = useState(() => {
        const h = existingSchedule?.watchConfig?.startHour;
        return h !== undefined ? String(h).padStart(2, '0') + ':00' : '20:00';
    });
    const [anchorEndTime, setAnchorEndTime] = useState(() => {
        const h = existingSchedule?.watchConfig?.endHour;
        return h !== undefined ? String(h).padStart(2, '0') + ':00' : '08:00';
    });

    // Dock watch hours — separate weekday and weekend windows
    const [dockWeekdayStart, setDockWeekdayStart] = useState(() => {
        const h = existingSchedule?.watchConfig?.weekdayStartHour;
        return h !== undefined ? String(h).padStart(2, '0') + ':00' : '08:00';
    });
    const [dockWeekdayEnd, setDockWeekdayEnd] = useState(() => {
        const h = existingSchedule?.watchConfig?.weekdayEndHour;
        return h !== undefined ? String(h).padStart(2, '0') + ':00' : '20:00';
    });
    const [dockWeekdayCrewPerWatch, setDockWeekdayCrewPerWatch] = useState(() =>
        existingSchedule?.watchConfig?.weekdayCrewPerWatch ?? 1
    );
    const [dockWeekendStart, setDockWeekendStart] = useState(() => {
        const h = existingSchedule?.watchConfig?.weekendStartHour;
        return h !== undefined ? String(h).padStart(2, '0') + ':00' : '08:00';
    });
    const [dockWeekendEnd, setDockWeekendEnd] = useState(() => {
        const h = existingSchedule?.watchConfig?.weekendEndHour;
        return h !== undefined ? String(h).padStart(2, '0') + ':00' : '20:00';
    });
    const [dockWeekendCrewPerWatch, setDockWeekendCrewPerWatch] = useState(() =>
        existingSchedule?.watchConfig?.weekendCrewPerWatch ?? 1
    );

    // -- Step 2: Crew State --
    // Per-crew restrictions for Nav Watch special cases (max watches/day, available hours)
    const [restrictions, setRestrictions] = useState<Record<string, { maxPerDay?: number; from?: string; to?: string }>>({});
    const [expandedRestriction, setExpandedRestriction] = useState<string | null>(null);

    const setRestrictionField = (userId: string, field: 'maxPerDay' | 'from' | 'to', value: number | string | undefined) => {
        setRestrictions(prev => ({ ...prev, [userId]: { ...prev[userId], [field]: value } }));
    };

    const [selectedCrewIds, setSelectedCrewIds] = useState<string[]>(() => {
        if (existingSchedule) {
            const ids = new Set<string>();
            existingSchedule.slots.forEach(s => s.crew.forEach(c => ids.add(c.userId)));
            return Array.from(ids);
        }
        return [];
    });

    // -- Standing Orders --
    const [standingOrders, setStandingOrders] = useState<StandingOrder[]>(existingSchedule?.standingOrders || []);
    const [newOrderText, setNewOrderText] = useState('');
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

    const addOrder = () => {
        const text = newOrderText.trim();
        if (!text) return;
        setStandingOrders(prev => [...prev, { id: Date.now().toString(), text, requiresCompletion: false }]);
        setNewOrderText('');
    };
    const removeOrder = (id: string) => setStandingOrders(prev => prev.filter(o => o.id !== id));
    const updateOrder = (id: string, updates: Partial<StandingOrder>) =>
        setStandingOrders(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));

    const dndSensors = useSensors(
        useSensor(PointerSensor),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
    );
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setStandingOrders(orders => {
                const from = orders.findIndex(o => o.id === active.id);
                const to = orders.findIndex(o => o.id === over.id);
                return arrayMove(orders, from, to);
            });
        }
    };

    // -- Step 3: Preview and Paywall State --
    const [previewSchedule, setPreviewSchedule] = useState<WatchSchedule | null>(null);
    const [scheduleViolations, setScheduleViolations] = useState<string[]>([]);
    const [showPaywall, setShowPaywall] = useState(false);

    // Filter crew logic updated to only look at `users` state directly
    // This perfectly matches what the CaptainCrewView displays.
    const availableCrew = useMemo(() => {
        if (!currentUser?.vesselId) return [];
        const vesselUsers = users.filter(u => u.id === currentUser.id || u.vesselId === currentUser.vesselId);

        // Ensure current user (Captain) is always present even if they weren't matched in the filter
        if (!vesselUsers.some(u => u.id === currentUser.id)) {
            vesselUsers.unshift(currentUser as unknown as UserData);
        }

        return vesselUsers;
    }, [users, currentUser]);

    const toggleCrewSelection = (userId: string) => {
        setSelectedCrewIds(prev => {
            if (prev.includes(userId)) {
                setRestrictions(r => { const next = { ...r }; delete next[userId]; return next; });
                setExpandedRestriction(e => e === userId ? null : e);
                return prev.filter(id => id !== userId);
            }
            return [...prev, userId];
        });
    };

    const getSelectionOrder = (userId: string) => {
        const index = selectedCrewIds.indexOf(userId);
        return index === -1 ? null : index + 1;
    };

    const generateSchedule = () => {
        if (endDate && startDate && parseDateStr(endDate)!.getTime() < parseDateStr(startDate)!.getTime()) {
            alert('End date must be after start date.');
            return;
        }

        const parseHourMin = (t: string) => t.split(':').map(Number) as [number, number];

        // Date-only strings ("YYYY-MM-DD") parse as UTC midnight in JS, which lands on the
        // previous calendar day for any timezone behind UTC once .setHours() is applied.
        // Use parseDateStr (local midnight) so the generated schedule starts on the day the
        // captain actually picked.
        const startDateTime = parseDateStr(startDate)!;
        if (watchType === 'Navigation') {
            const [h, m] = parseHourMin(startTime);
            startDateTime.setHours(h, m, 0, 0);
        } else {
            // Anchor/dock: start from midnight on the start date; watch-hour filtering handles active slots
            startDateTime.setHours(0, 0, 0, 0);
        }

        const endDateTime = parseDateStr(endDate)!;
        if (watchType === 'Navigation') {
            const [h, m] = parseHourMin(endTime);
            endDateTime.setHours(h, m, 0, 0);
        } else {
            // Run through end of the last day so the final night/day window is included
            endDateTime.setHours(23, 59, 59, 999);
        }

        const slots = [];
        let slotId = 1;

        const parseHour = (t: string) => parseInt(t.split(':')[0], 10);
        const parseMin  = (t: string) => parseInt(t.split(':')[1] ?? '0', 10);

        const orderedCrew = selectedCrewIds.map(id => availableCrew.find(u => u.id === id)).filter(Boolean) as UserData[];
        if (orderedCrew.length === 0) { console.warn('generateSchedule: orderedCrew is empty, aborting'); return; }

        const isWithinHours = (date: Date, startStr: string, endStr: string): boolean => {
            const h = date.getHours();
            const s = parseHour(startStr);
            const e = parseHour(endStr);
            if (s >= e) return h >= s || h < e; // overnight or same (24h)
            return h >= s && h < e;
        };

        let rotationIdx = 0;
        const watchesOnDay: Record<string, Record<string, number>> = {};
        const totalCrew = orderedCrew.length;
        const hasRestrictions = watchType === 'Navigation' && Object.keys(restrictions).length > 0;

        const constrainedPlacedOnDay: Record<string, Set<string>> = {};
        const constrainedCrew = orderedCrew.filter(u => restrictions[u.id]);
        const unconstrainedCrew = orderedCrew.filter(u => !restrictions[u.id]);
        constrainedCrew.forEach(u => { constrainedPlacedOnDay[u.id] = new Set(); });

        const crewLabel = (u: UserData) => {
            const isCaptain = u.id === currentUser?.id;
            return {
                userFirstName: u.firstName?.trim() || (isCaptain ? currentUser?.firstName?.trim() : '') || 'Unknown',
                userLastName: u.lastName?.trim() || (isCaptain ? currentUser?.lastName?.trim() : '') || 'Crew',
            };
        };

        // ── Dock watch: one slot per calendar day, correctly anchored to the window ──
        if (watchType === 'dock') {
            const effectiveDuration = duration; // used only for watchConfig saving
            const day = new Date(startDateTime);
            day.setHours(0, 0, 0, 0);
            const endDay = new Date(endDateTime);
            endDay.setHours(0, 0, 0, 0);

            while (day <= endDay) {
                const isWkend = day.getDay() === 0 || day.getDay() === 6;
                const wStart  = isWkend ? dockWeekendStart  : dockWeekdayStart;
                const wEnd    = isWkend ? dockWeekendEnd    : dockWeekdayEnd;
                const slotCPW = isWkend ? dockWeekendCrewPerWatch : dockWeekdayCrewPerWatch;

                const slotStart = new Date(day);
                slotStart.setHours(parseHour(wStart), parseMin(wStart), 0, 0);

                const slotEnd = new Date(day);
                slotEnd.setHours(parseHour(wEnd), parseMin(wEnd), 0, 0);
                // Same time or end before start → overnight / 24h → end is next day
                if (slotEnd.getTime() <= slotStart.getTime()) {
                    slotEnd.setDate(slotEnd.getDate() + 1);
                }

                const dateKey = day.toISOString().split('T')[0];
                const activeCrewInChunk: { userId: string; userFirstName: string; userLastName: string }[] = [];

                let added = 0;
                let attempts = 0;
                const startIdx = rotationIdx;
                while (added < slotCPW && attempts < totalCrew * 2) {
                    const u = orderedCrew[rotationIdx % totalCrew];
                    rotationIdx++;
                    attempts++;
                    if (activeCrewInChunk.find(a => a.userId === u.id)) continue;
                    activeCrewInChunk.push({ userId: u.id, ...crewLabel(u) });
                    if (!watchesOnDay[u.id]) watchesOnDay[u.id] = {};
                    watchesOnDay[u.id][dateKey] = (watchesOnDay[u.id][dateKey] ?? 0) + 1;
                    added++;
                }
                if (added < slotCPW) {
                    let fallback = startIdx;
                    while (added < slotCPW) {
                        const u = orderedCrew[fallback % totalCrew];
                        fallback++;
                        if (activeCrewInChunk.find(a => a.userId === u.id)) continue;
                        activeCrewInChunk.push({ userId: u.id, ...crewLabel(u) });
                        added++;
                    }
                }

                slots.push({ id: slotId++, start: slotStart.toISOString(), end: slotEnd.toISOString(), crew: activeCrewInChunk, condition: 'always' as const });

                day.setDate(day.getDate() + 1);
            }

            // Save and show preview
            const newSchedule = {
                id: 'preview-id', vesselId: 'current-vessel', name: scheduleName, watchType,
                createdAt: new Date().toISOString(), timezone: currentVessel?.timezone || 'UTC',
                standingOrders, watchConfig: {
                    crewPerWatch, duration: effectiveDuration, isStaggered, watchLeaderCount: 0,
                    weekdayStartHour: parseHour(dockWeekdayStart), weekdayEndHour: parseHour(dockWeekdayEnd),
                    weekdayCrewPerWatch: dockWeekdayCrewPerWatch,
                    weekendStartHour: parseHour(dockWeekendStart), weekendEndHour: parseHour(dockWeekendEnd),
                    weekendCrewPerWatch: dockWeekendCrewPerWatch,
                }, slots
            };
            setPreviewSchedule(newSchedule as any);
            setScheduleViolations([]);
            setStep(3);
            return;
        }

        // ── Nav / Anchor watch: fixed-duration slot loop ──
        const effectiveDuration = duration;
        const offsetHours = isStaggered && crewPerWatch > 1 ? (effectiveDuration / crewPerWatch) : effectiveDuration;
        const loopIncrement = offsetHours * 60 * 60 * 1000;
        let currentTime = new Date(startDateTime);

        while (currentTime < endDateTime) {
            const chunkStart = new Date(currentTime);
            const chunkEnd = new Date(currentTime.getTime() + loopIncrement);
            currentTime = chunkEnd;

            // Determine whether this slot is active, off-duty, or skipped entirely
            let shouldSkip = false;
            const condition: 'always' | 'outside-watch-hours' = 'always';

            if (watchType === 'anchor') {
                if (!isWithinHours(chunkStart, anchorStartTime, anchorEndTime)) shouldSkip = true;
            }

            if (shouldSkip) continue;

            const slotCrewPerWatch = crewPerWatch;

            const activeCrewInChunk: { userId: string; userFirstName: string; userLastName: string }[] = [];

            if (hasRestrictions) {
                const dateKey = chunkStart.toISOString().split('T')[0];

                // STEP 1: Anchor constrained crew into every slot they're eligible for
                for (const u of constrainedCrew) {
                    if (activeCrewInChunk.length >= slotCrewPerWatch) break;
                    if (activeCrewInChunk.find(a => a.userId === u.id)) continue;
                    const r = restrictions[u.id];
                    if (r.from && r.to && !isWithinHours(chunkStart, r.from, r.to)) continue;
                    if (r.maxPerDay !== undefined && (watchesOnDay[u.id]?.[dateKey] ?? 0) >= r.maxPerDay) continue;
                    activeCrewInChunk.push({ userId: u.id, ...crewLabel(u) });
                    if (!watchesOnDay[u.id]) watchesOnDay[u.id] = {};
                    watchesOnDay[u.id][dateKey] = (watchesOnDay[u.id][dateKey] ?? 0) + 1;
                    constrainedPlacedOnDay[u.id].add(dateKey);
                }

                // STEP 2: Fill remaining spots with unconstrained crew via round-robin
                const uncPool = unconstrainedCrew.length > 0 ? unconstrainedCrew : orderedCrew;
                let attempts = 0;
                while (activeCrewInChunk.length < slotCrewPerWatch && attempts < uncPool.length * 2) {
                    const u = uncPool[rotationIdx % uncPool.length];
                    rotationIdx++;
                    attempts++;
                    if (activeCrewInChunk.find(a => a.userId === u.id)) continue;
                    activeCrewInChunk.push({ userId: u.id, ...crewLabel(u) });
                }
            } else {
                // Fair global round-robin — rotationIdx never resets between days
                // so each night picks up exactly where the previous left off.
                // Per-night soft cap: prefer crew who haven't watched yet tonight
                // before doubling anyone up.
                const dateKey = chunkStart.toISOString().split('T')[0];
                let added = 0;
                let attempts = 0;
                const startIdx = rotationIdx;

                while (added < slotCrewPerWatch && attempts < totalCrew * 2) {
                    const u = orderedCrew[rotationIdx % totalCrew];
                    rotationIdx++;
                    attempts++;

                    if (activeCrewInChunk.find(a => a.userId === u.id)) continue;

                    const watchesTonight = watchesOnDay[u.id]?.[dateKey] ?? 0;
                    const someoneFreeTonightExists = orderedCrew.some(
                        o => !activeCrewInChunk.find(a => a.userId === o.id) &&
                             (watchesOnDay[o.id]?.[dateKey] ?? 0) === 0
                    );

                    // Skip this person if they've already watched tonight AND
                    // someone else who hasn't watched yet is still in the pool
                    if (watchesTonight > 0 && someoneFreeTonightExists) continue;

                    activeCrewInChunk.push({ userId: u.id, ...crewLabel(u) });
                    if (!watchesOnDay[u.id]) watchesOnDay[u.id] = {};
                    watchesOnDay[u.id][dateKey] = watchesTonight + 1;
                    added++;
                }

                // Safety: if we somehow couldn't fill the slot (shouldn't happen),
                // fall back to simple sequential fill
                if (added < slotCrewPerWatch) {
                    let fallback = startIdx;
                    while (added < slotCrewPerWatch) {
                        const u = orderedCrew[fallback % totalCrew];
                        fallback++;
                        if (activeCrewInChunk.find(a => a.userId === u.id)) continue;
                        activeCrewInChunk.push({ userId: u.id, ...crewLabel(u) });
                        added++;
                    }
                }
            }

            slots.push({
                id: slotId++,
                start: chunkStart.toISOString(),
                end: chunkEnd.toISOString(),
                crew: activeCrewInChunk,
                condition
            });
        }

        const newSchedule: WatchSchedule = {
            id: 'preview-id',
            vesselId: 'current-vessel',
            name: scheduleName,
            watchType: watchType,
            createdAt: new Date().toISOString(),
            timezone: currentVessel?.timezone || 'UTC',
            standingOrders,
            watchConfig: {
                crewPerWatch,
                duration: effectiveDuration,
                isStaggered,
                watchLeaderCount: 0,
                ...(watchType === 'anchor' && {
                    startHour: parseHour(anchorStartTime),
                    endHour: parseHour(anchorEndTime),
                }),
            },
            slots
        };

        // Detect violations: constrained crew missing from any day in the schedule
        const violations: string[] = [];
        if (hasRestrictions) {
            // Collect all unique day keys in the schedule
            const allDays = new Set(slots.map(s => s.start.split('T')[0]));
            for (const u of constrainedCrew) {
                const r = restrictions[u.id];
                const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Crew';
                const window = (r.from && r.to) ? `${r.from}–${r.to}` : null;
                const missing = [...allDays].filter(d => !constrainedPlacedOnDay[u.id].has(d));
                if (missing.length > 0) {
                    const reason = window
                        ? `no watch slot falls within their ${window} window`
                        : `max watches per day limit reached`;
                    violations.push(`${name} could not be placed on ${missing.length} day${missing.length > 1 ? 's' : ''} — ${reason}.`);
                }
            }
        }

        setScheduleViolations(violations);
        setPreviewSchedule(newSchedule);
        setStep(3);
    };

    const handlePublish = async () => {
        if (!isSubscribed) {
            setShowPaywall(true);
            return;
        }

        if (!previewSchedule) return;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _id, ...scheduleData } = previewSchedule;
        const targetVesselId = currentUser?.vesselId;
        if (!targetVesselId) {
            alert("No vessel found!");
            return;
        }

        await createSchedule({ ...scheduleData, vesselId: targetVesselId });
        await supabase.channel(`vessel_broadcast:${targetVesselId}`).send({
            type: 'broadcast', event: 'schedule-published', payload: { vesselId: targetVesselId, scheduleName: scheduleData.name }
        });
        navigate('/dashboard/captain');
    };

    // TODO: Replace with RevenueCat subscription tier limit when configured
    const maxCrewPerWatch = 8;
    const isNative = Capacitor.isNativePlatform();

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Main YachtWatch header */}
            <header className="border-b bg-card sticky top-0 z-50 safe-area-pt">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between pt-[5px]">
                    <div className="flex items-center gap-2 font-bold text-xl text-primary">
                        <Anchor className="h-6 w-6" />
                        <span>YachtWatch</span>
                    </div>
                    <ProfileDropdown />
                </div>
            </header>

            <div className="flex-1 p-6 max-w-lg mx-auto w-full pb-10 overflow-x-hidden">

                {/* Back button */}
                <div className="-ml-2" style={{ marginTop: '-5px', marginBottom: '2px' }}>
                    <Button variant="ghost" size="sm" className="gap-1 pl-2 text-muted-foreground" onClick={() => {
                        if (step === 1) navigate(-1);
                        else setStep(step - 1);
                    }}>
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Button>
                </div>

                {/* HEADLINES */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold tracking-tight">
                        {step === 1 && "Configuration"}
                        {step === 2 && "Select Crew"}
                        {step === 3 && "Preview"}
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        {step === 1 && "Set up the basic parameters for your watch schedule."}
                        {step === 2 && "Choose who will be on this rotation."}
                        {step === 3 && "Review the generated schedule before publishing."}
                    </p>
                </div>

                {/* STEP 1: CONFIGURATION */}
                {step === 1 && (
                    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">

                        {/* Watch Type Selector */}
                        <div className="space-y-2">
                            <label style={{ fontSize: 13 }} className="font-medium text-foreground">Watch Type</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['Navigation', 'anchor', 'dock'] as const).map(type => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => {
                                            setWatchType(type);
                                            const d = WATCH_TYPE_DEFAULTS[type];
                                            if (d.duration) setDuration(d.duration);
                                            if (d.crewPerWatch) setCrewPerWatch(d.crewPerWatch);
                                            if (d.isStaggered !== undefined) setIsStaggered(d.isStaggered);
                                        }}
                                        className={cn(
                                            'py-3 px-2 rounded-[10px] text-sm font-medium border transition-all',
                                            watchType === type
                                                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                                : 'bg-white text-foreground border-[#e2ddd8] hover:border-primary/50'
                                        )}
                                    >
                                        {type === 'Navigation' ? 'Nav Watch' : type === 'anchor' ? 'Anchor Watch' : 'Dock Watch'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label style={{ fontSize: 13 }} className="font-medium text-foreground">Schedule Name</label>
                            <Input
                                placeholder="e.g. Atlantic Crossing 2026"
                                value={scheduleName}
                                onChange={e => { setScheduleName(e.target.value); if (e.target.value.trim()) setScheduleNameError(''); }}
                                className={`rounded-[10px]${scheduleNameError ? ' animate-border-pulse-blue' : ''}`}
                                style={{ background: '#ffffff', border: '1.5px solid #e2ddd8', padding: '13px 14px', height: 'auto', textAlign: 'left', width: '100%', boxSizing: 'border-box' }}
                            />
                            {scheduleNameError && <p className="text-sm text-muted-foreground mt-1">{scheduleNameError}</p>}
                        </div>

                        {/* Anchor watch hour config */}
                        {watchType === 'anchor' && (
                            <div className="space-y-3">
                                <div>
                                    <label style={{ fontSize: 13 }} className="font-medium text-foreground">Watch Hours</label>
                                    <p className="text-xs text-muted-foreground mt-0.5">Crew are only assigned during these hours each day.</p>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <TimePickerField label="From" value={anchorStartTime} onChange={setAnchorStartTime} />
                                    <TimePickerField label="To" value={anchorEndTime} onChange={setAnchorEndTime} isNextDay={!!anchorStartTime && !!anchorEndTime && anchorEndTime < anchorStartTime} />
                                </div>
                            </div>
                        )}

                        {/* Dock watch hour config */}
                        {watchType === 'dock' && (
                            <div className="space-y-4">
                                <div>
                                    <label style={{ fontSize: 13 }} className="font-medium text-foreground">Watch Hours</label>
                                    <p className="text-xs text-muted-foreground mt-0.5">Slots outside these hours are marked as off-duty.</p>
                                </div>
                                <div className="space-y-2">
                                    <p style={{ fontSize: 12 }} className="font-medium text-muted-foreground uppercase tracking-wide">Weekdays</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                        <TimePickerField label="From" value={dockWeekdayStart} onChange={setDockWeekdayStart} />
                                        <TimePickerField label="To" value={dockWeekdayEnd} onChange={setDockWeekdayEnd} isNextDay={!!dockWeekdayStart && !!dockWeekdayEnd && dockWeekdayEnd <= dockWeekdayStart} />
                                    </div>
                                    <div style={fieldStyle} className="relative">
                                        <span style={{ fontSize: 14, color: '#0f172a' }}>{dockWeekdayCrewPerWatch} crew per watch</span>
                                        <select
                                            value={dockWeekdayCrewPerWatch}
                                            onChange={e => setDockWeekdayCrewPerWatch(Number(e.target.value))}
                                            style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                                        >
                                            {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} crew per watch</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <p style={{ fontSize: 12 }} className="font-medium text-muted-foreground uppercase tracking-wide">Weekends</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                        <TimePickerField label="From" value={dockWeekendStart} onChange={setDockWeekendStart} />
                                        <TimePickerField label="To" value={dockWeekendEnd} onChange={setDockWeekendEnd} isNextDay={!!dockWeekendStart && !!dockWeekendEnd && dockWeekendEnd <= dockWeekendStart} />
                                    </div>
                                    <div style={fieldStyle} className="relative">
                                        <span style={{ fontSize: 14, color: '#0f172a' }}>{dockWeekendCrewPerWatch} crew per watch</span>
                                        <select
                                            value={dockWeekendCrewPerWatch}
                                            onChange={e => setDockWeekendCrewPerWatch(Number(e.target.value))}
                                            style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                                        >
                                            {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} crew per watch</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Nav watch: Start Date + Start Time */}
                        {watchType === 'Navigation' && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div className="space-y-2">
                                    <label style={{ fontSize: 13 }} className="font-medium text-foreground">Start Date</label>
                                    {isNative ? (
                                        <div style={{ ...fieldStyle, position: 'relative' }}>
                                            <span style={{ fontSize: 14, color: startDate ? '#0f172a' : '#94a3b8' }}>
                                                {startDate ? new Date(startDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Select date'}
                                            </span>
                                            <CalendarIcon style={{ width: 16, height: 16, color: '#94a3b8', flexShrink: 0 }} />
                                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
                                        </div>
                                    ) : (
                                        <DatePicker
                                            selected={parseDateStr(startDate)}
                                            onChange={(d: Date | null) => d && setStartDate(d.toISOString().split('T')[0])}
                                            dateFormat="dd MMM yyyy"
                                            placeholderText="Select date"
                                            customInput={<PickerTrigger icon={<CalendarIcon style={{ width: 16, height: 16, color: '#94a3b8', flexShrink: 0 }} />} placeholder="Select date" />}
                                        />
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label style={{ fontSize: 13 }} className="font-medium text-foreground">Start Time</label>
                                    {isNative ? (
                                        <div style={{ ...fieldStyle, position: 'relative' }}>
                                            <span style={{ fontSize: 14, color: startTime ? '#0f172a' : '#94a3b8' }}>{startTime || 'Select time'}</span>
                                            <Clock style={{ width: 16, height: 16, color: '#94a3b8', flexShrink: 0 }} />
                                            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
                                        </div>
                                    ) : (
                                        <DatePicker
                                            selected={parseTimeStr(startTime)}
                                            onChange={(d: Date | null) => d && setStartTime(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }))}
                                            showTimeSelect showTimeSelectOnly
                                            timeIntervals={15}
                                            timeFormat="HH:mm"
                                            dateFormat="HH:mm"
                                            placeholderText="Select time"
                                            customInput={<PickerTrigger icon={<Clock style={{ width: 16, height: 16, color: '#94a3b8', flexShrink: 0 }} />} placeholder="Select time" />}
                                        />
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Nav watch: End Date + End Time */}
                        {watchType === 'Navigation' && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div className="space-y-2">
                                    <label style={{ fontSize: 13 }} className="font-medium text-foreground">End Date</label>
                                    {isNative ? (
                                        <div style={{ ...fieldStyle, position: 'relative' }}>
                                            <span style={{ fontSize: 14, color: endDate ? '#0f172a' : '#94a3b8' }}>
                                                {endDate ? new Date(endDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Select date'}
                                            </span>
                                            <CalendarIcon style={{ width: 16, height: 16, color: '#94a3b8', flexShrink: 0 }} />
                                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
                                        </div>
                                    ) : (
                                        <DatePicker
                                            selected={parseDateStr(endDate)}
                                            onChange={(d: Date | null) => d && setEndDate(d.toISOString().split('T')[0])}
                                            dateFormat="dd MMM yyyy"
                                            placeholderText="Select date"
                                            customInput={<PickerTrigger icon={<CalendarIcon style={{ width: 16, height: 16, color: '#94a3b8', flexShrink: 0 }} />} placeholder="Select date" />}
                                        />
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label style={{ fontSize: 13 }} className="font-medium text-foreground">End Time</label>
                                    {isNative ? (
                                        <div style={{ ...fieldStyle, position: 'relative' }}>
                                            <span style={{ fontSize: 14, color: endTime ? '#0f172a' : '#94a3b8' }}>{endTime || 'Select time'}</span>
                                            <Clock style={{ width: 16, height: 16, color: '#94a3b8', flexShrink: 0 }} />
                                            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
                                        </div>
                                    ) : (
                                        <DatePicker
                                            selected={parseTimeStr(endTime)}
                                            onChange={(d: Date | null) => d && setEndTime(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }))}
                                            showTimeSelect showTimeSelectOnly
                                            timeIntervals={15}
                                            timeFormat="HH:mm"
                                            dateFormat="HH:mm"
                                            placeholderText="Select time"
                                            customInput={<PickerTrigger icon={<Clock style={{ width: 16, height: 16, color: '#94a3b8', flexShrink: 0 }} />} placeholder="Select time" />}
                                        />
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Anchor/Dock watch: Start Date + End Date only (times derived from watch hours) */}
                        {watchType !== 'Navigation' && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div className="space-y-2">
                                    <label style={{ fontSize: 13 }} className="font-medium text-foreground">Start Date</label>
                                    {isNative ? (
                                        <div style={{ ...fieldStyle, position: 'relative' }}>
                                            <span style={{ fontSize: 14, color: startDate ? '#0f172a' : '#94a3b8' }}>
                                                {startDate ? new Date(startDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Select date'}
                                            </span>
                                            <CalendarIcon style={{ width: 16, height: 16, color: '#94a3b8', flexShrink: 0 }} />
                                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
                                        </div>
                                    ) : (
                                        <DatePicker
                                            selected={parseDateStr(startDate)}
                                            onChange={(d: Date | null) => d && setStartDate(d.toISOString().split('T')[0])}
                                            dateFormat="dd MMM yyyy"
                                            placeholderText="Select date"
                                            customInput={<PickerTrigger icon={<CalendarIcon style={{ width: 16, height: 16, color: '#94a3b8', flexShrink: 0 }} />} placeholder="Select date" />}
                                        />
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label style={{ fontSize: 13 }} className="font-medium text-foreground">End Date</label>
                                    {isNative ? (
                                        <div style={{ ...fieldStyle, position: 'relative' }}>
                                            <span style={{ fontSize: 14, color: endDate ? '#0f172a' : '#94a3b8' }}>
                                                {endDate ? new Date(endDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Select date'}
                                            </span>
                                            <CalendarIcon style={{ width: 16, height: 16, color: '#94a3b8', flexShrink: 0 }} />
                                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
                                        </div>
                                    ) : (
                                        <DatePicker
                                            selected={parseDateStr(endDate)}
                                            onChange={(d: Date | null) => d && setEndDate(d.toISOString().split('T')[0])}
                                            dateFormat="dd MMM yyyy"
                                            placeholderText="Select date"
                                            customInput={<PickerTrigger icon={<CalendarIcon style={{ width: 16, height: 16, color: '#94a3b8', flexShrink: 0 }} />} placeholder="Select date" />}
                                        />
                                    )}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: watchType === 'dock' ? '1fr' : '1fr 1fr', gap: 16 }}>
                            {watchType !== 'dock' && (
                                <div className="space-y-2">
                                    <label style={{ fontSize: 13 }} className="font-medium text-foreground">Duration (Hours)</label>
                                    <div style={{ ...fieldStyle, position: 'relative' }}>
                                        <span style={{ fontSize: 14, color: '#0f172a' }}>{duration}h</span>
                                        <select value={duration} onChange={e => setDuration(Number(e.target.value))} style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}>
                                            {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}h</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}
                            {watchType !== 'dock' && (
                                <div className="space-y-2">
                                    <label style={{ fontSize: 13 }} className="font-medium text-foreground">Crew Per Watch</label>
                                    <div style={{ ...fieldStyle, position: 'relative' }}>
                                        <span style={{ fontSize: 14, color: '#0f172a' }}>{crewPerWatch}</span>
                                        <select value={crewPerWatch} onChange={e => setCrewPerWatch(Number(e.target.value))} style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}>
                                            {Array.from({ length: maxCrewPerWatch }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>

                        {crewPerWatch > 1 && (
                            <div className="flex items-center justify-between p-4 rounded-[10px] bg-white shadow-sm" style={{ border: '1.5px solid #e2ddd8' }}>
                                <div>
                                    <div className="font-medium text-sm">Staggered Watches</div>
                                    <div className="text-xs text-muted-foreground">Offset crew changes for smoother handover</div>
                                </div>
                                <input
                                    type="checkbox"
                                    className="h-5 w-5 rounded border-input text-primary focus:ring-primary accent-primary"
                                    checked={isStaggered}
                                    onChange={e => setIsStaggered(e.target.checked)}
                                />
                            </div>
                        )}

                        {/* Standing Orders */}
                        <div className="space-y-3">
                            <div>
                                <label style={{ fontSize: 13 }} className="font-medium text-foreground">Standing Orders</label>
                                <p className="text-xs text-muted-foreground mt-0.5">Crew must acknowledge these before starting their first watch.</p>
                            </div>

                            <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <SortableContext items={standingOrders.map(o => o.id)} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-2">
                                        {standingOrders.map(order => (
                                            <SortableOrderCard
                                                key={order.id}
                                                order={order}
                                                isExpanded={expandedOrderId === order.id}
                                                onToggleExpand={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                                                onRemove={() => removeOrder(order.id)}
                                                onUpdate={updates => updateOrder(order.id, updates)}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>

                            {/* Add order input */}
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Add a standing order…"
                                    value={newOrderText}
                                    onChange={e => setNewOrderText(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOrder())}
                                    className="rounded-[10px] flex-1"
                                    style={{ background: '#ffffff', border: '1.5px solid #e2ddd8', padding: '11px 14px', height: 'auto' }}
                                />
                                <button
                                    type="button"
                                    onClick={addOrder}
                                    disabled={!newOrderText.trim()}
                                    className="h-[46px] w-[46px] rounded-[10px] bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 flex-shrink-0"
                                >
                                    <Plus className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <Button
                            className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 mt-8"
                            onClick={() => {
                                if (!scheduleName.trim()) {
                                    setScheduleNameError('Please enter a schedule name before continuing.');
                                    return;
                                }
                                setStep(2);
                            }}
                        >
                            Next: Select Crew
                        </Button>
                    </div>
                )}

                {/* STEP 2: SELECT CREW */}
                {step === 2 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-muted-foreground">{selectedCrewIds.length} Selected</span>
                            <div className="flex gap-4">
                                <Button variant="ghost" size="sm" onClick={() => setSelectedCrewIds(availableCrew.map(u => u.id))} className="text-primary h-auto p-0 hover:bg-transparent text-xs hover:text-primary/80">
                                    Select All
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setSelectedCrewIds([])} className="text-destructive h-auto p-0 hover:bg-transparent text-xs hover:text-destructive">
                                    Deselect All
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {(() => {
                                // Build display labels: first name only, unless ambiguous
                                const getNames = (u: UserData) => {
                                    const isCap = u.id === currentUser?.id;
                                    const f = u.firstName?.trim() || (isCap ? currentUser?.firstName?.trim() : '') || 'Unknown';
                                    const l = u.lastName?.trim() || (isCap ? currentUser?.lastName?.trim() : '') || '';
                                    return { f, l };
                                };
                                const crewLabels: Record<string, string> = {};
                                availableCrew.forEach(u => {
                                    const { f, l } = getNames(u);
                                    // Find others with the same first name
                                    const sameFirst = availableCrew.filter(o => o.id !== u.id && getNames(o).f === f);
                                    if (sameFirst.length === 0) {
                                        crewLabels[u.id] = f;
                                    } else {
                                        // Same first name — check if first letter of surname also clashes
                                        const sameFirstAndInitial = sameFirst.filter(o => getNames(o).l.charAt(0).toLowerCase() === l.charAt(0).toLowerCase());
                                        if (sameFirstAndInitial.length === 0) {
                                            crewLabels[u.id] = l ? `${f} ${l.charAt(0).toUpperCase()}.` : f;
                                        } else {
                                            crewLabels[u.id] = l.length >= 2 ? `${f} ${l.slice(0, 2)}` : f;
                                        }
                                    }
                                });
                                return availableCrew.map(u => {
                                const rank = getSelectionOrder(u.id);
                                const isSelected = rank !== null;
                                const isCaptain = u.id === currentUser?.id;
                                const fName = u.firstName?.trim() || (isCaptain ? currentUser?.firstName?.trim() : '') || 'Unknown';
                                const displayName = crewLabels[u.id] ?? fName;

                                const restriction = restrictions[u.id];
                                const isExpanded = expandedRestriction === u.id;
                                const hasRestriction = restriction && (restriction.maxPerDay !== undefined || restriction.from || restriction.to);

                                return (
                                    <div
                                        key={u.id}
                                        className={cn(
                                            "rounded-xl border transition-all",
                                            isSelected
                                                ? "border-primary bg-primary/5 shadow-sm"
                                                : "border-border bg-card hover:border-primary/50"
                                        )}
                                    >
                                        {/* Main crew row */}
                                        <div
                                            className="p-4 flex items-center justify-between cursor-pointer"
                                            onClick={() => toggleCrewSelection(u.id)}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={cn("h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold border", isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-muted-foreground border-transparent")}>
                                                    {isSelected ? rank : fName.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-sm">{displayName}</div>
                                                    <div className="text-xs text-muted-foreground capitalize">{u.customRole || u.role}</div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                        <span className="text-xs font-medium text-muted-foreground cursor-default">Watch Leader</span>
                                                        <Switch
                                                            checked={u.isWatchLeader || false}
                                                            onCheckedChange={(checked) => currentUser?.vesselId && toggleWatchLeader(currentUser.vesselId, u.id, checked)}
                                                            className="data-[state=checked]:bg-primary"
                                                        />
                                                    </div>

                                                {/* Special case toggle — Nav Watch only, selected crew only */}
                                                {isSelected && watchType === 'Navigation' && (
                                                    <button
                                                        type="button"
                                                        onClick={e => { e.stopPropagation(); setExpandedRestriction(isExpanded ? null : u.id); }}
                                                        className={cn(
                                                            "h-7 w-7 rounded-full flex items-center justify-center border transition-all",
                                                            isExpanded || hasRestriction
                                                                ? "bg-primary text-primary-foreground border-primary"
                                                                : "bg-background text-muted-foreground border-border hover:border-primary/50"
                                                        )}
                                                        title="Special case"
                                                    >
                                                        <SlidersHorizontal className="h-3.5 w-3.5" />
                                                    </button>
                                                )}

                                            </div>
                                        </div>

                                        {/* Special case panel */}
                                        {isSelected && watchType === 'Navigation' && isExpanded && (
                                            <div className="px-4 pb-4 border-t border-primary/10" onClick={e => e.stopPropagation()}>
                                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-3 mb-3">Special Case</p>
                                                <div className="flex flex-wrap gap-3 items-end">
                                                    {/* Max watches per day */}
                                                    <div className="space-y-1.5">
                                                        <label style={{ fontSize: 12 }} className="font-medium text-foreground">Max watches per day</label>
                                                        <div style={{ ...fieldStyle, width: 110, padding: '10px 12px', position: 'relative' }}>
                                                            <span style={{ fontSize: 13, color: '#0f172a' }}>
                                                                {restriction?.maxPerDay !== undefined ? `${restriction.maxPerDay} watch${restriction.maxPerDay !== 1 ? 'es' : ''}` : 'No limit'}
                                                            </span>
                                                            <select
                                                                value={restriction?.maxPerDay ?? ''}
                                                                onChange={e => setRestrictionField(u.id, 'maxPerDay', e.target.value === '' ? undefined : Number(e.target.value))}
                                                                style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                                                            >
                                                                <option value="">No limit</option>
                                                                {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} watch{n !== 1 ? 'es' : ''}</option>)}
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {/* Available hours */}
                                                    <div className="space-y-1.5">
                                                        <label style={{ fontSize: 12 }} className="font-medium text-foreground">Available hours</label>
                                                        <div className="flex items-center gap-2">
                                                            <div style={{ ...fieldStyle, width: 90, padding: '10px 12px', position: 'relative' }}>
                                                                <span style={{ fontSize: 13, color: restriction?.from ? '#0f172a' : '#94a3b8' }}>{restriction?.from || 'From'}</span>
                                                                <input
                                                                    type="time"
                                                                    value={restriction?.from || ''}
                                                                    onChange={e => {
                                                                        const from = e.target.value || undefined;
                                                                        setRestrictionField(u.id, 'from', from);
                                                                        if (from) {
                                                                            const [h, m] = from.split(':').map(Number);
                                                                            const totalMins = h * 60 + m + duration * 60;
                                                                            const toH = Math.floor(totalMins / 60) % 24;
                                                                            const toM = totalMins % 60;
                                                                            setRestrictionField(u.id, 'to', `${String(toH).padStart(2, '0')}:${String(toM).padStart(2, '0')}`);
                                                                        }
                                                                    }}
                                                                    style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                                                                />
                                                            </div>
                                                            <span className="text-xs text-muted-foreground">–</span>
                                                            <div style={{ ...fieldStyle, width: 90, padding: '10px 12px', position: 'relative' }}>
                                                                <span style={{ fontSize: 13, color: restriction?.to ? '#0f172a' : '#94a3b8' }}>
                                                                    {restriction?.to || 'To'}
                                                                    {restriction?.from && restriction?.to && restriction.to <= restriction.from
                                                                        ? <sup style={{ fontSize: 9, marginLeft: 1 }}>+1</sup>
                                                                        : null}
                                                                </span>
                                                                <input
                                                                    type="time"
                                                                    value={restriction?.to || ''}
                                                                    onChange={e => setRestrictionField(u.id, 'to', e.target.value || undefined)}
                                                                    style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            });
                            })()}
                        </div>

                        <Button
                            className="w-full h-12 text-base font-semibold mt-8 shadow-lg"
                            disabled={selectedCrewIds.length === 0}
                            onClick={generateSchedule}
                        >
                            Create Schedule ({selectedCrewIds.length})
                        </Button>
                    </div>
                )}

                {/* STEP 3: PREVIEW */}
                {step === 3 && previewSchedule && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">

                        {scheduleViolations.length > 0 && (
                            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-2">
                                <p className="text-sm font-semibold text-amber-800">⚠ Special case adjustments</p>
                                <p className="text-xs text-amber-700">The following crew members could not be placed on every day due to their constraints. The schedule has been built around them as best as possible — review before publishing.</p>
                                <ul className="mt-2 space-y-1">
                                    {scheduleViolations.map((v, i) => (
                                        <li key={i} className="text-xs text-amber-800 flex gap-2">
                                            <span>•</span><span>{v}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="bg-card rounded-xl p-6 border shadow-sm">
                            <h2 className="font-bold text-lg mb-2 flex items-center gap-2">
                                <CalendarIcon className="h-5 w-5 text-primary" />
                                {scheduleName || "New Schedule"}
                            </h2>
                            <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                                <div>
                                    <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Duration</span>
                                    <span className="font-medium">{duration} hours</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Rotation</span>
                                    <span className="font-medium">{crewPerWatch} per watch</span>
                                </div>
                            </div>
                        </div>

                        <div className="border rounded-xl overflow-hidden shadow-sm">
                            <ScheduleMatrixView schedule={previewSchedule} />
                        </div>

                        <Button
                            className="w-full h-12 text-base font-bold bg-green-600 hover:bg-green-700 mt-8 shadow-lg"
                            onClick={handlePublish}
                        >
                            Publish Watch Schedule
                        </Button>
                    </div>
                )}
            </div>

            {showPaywall && (
                <CustomPaywall onClose={() => setShowPaywall(false)} />
            )}
        </div>
    );
}
