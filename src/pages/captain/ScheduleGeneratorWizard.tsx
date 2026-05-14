import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useData, UserData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { ScheduleMatrixView } from '../../components/ScheduleMatrixView';
import { ArrowLeft, Anchor, Calendar as CalendarIcon, Clock } from 'lucide-react';
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

// eslint-disable-next-line react/display-name
const PickerTrigger = React.forwardRef<HTMLDivElement, { value?: string; onClick?: () => void; icon: React.ReactNode; placeholder: string }>(
    ({ value, onClick, icon, placeholder }, ref) => (
        <div ref={ref} style={fieldStyle} onClick={onClick}>
            <span style={{ fontSize: 14, color: value ? '#0f172a' : '#94a3b8' }}>{value || placeholder}</span>
            {icon}
        </div>
    )
);

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

    const [watchType] = useState<WatchSchedule['watchType']>(existingSchedule?.watchType || 'Navigation');
    const [scheduleName, setScheduleName] = useState(existingSchedule?.name || '');

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
        return "12:00";
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

    // -- Step 2: Crew State --
    const [selectedCrewIds, setSelectedCrewIds] = useState<string[]>(() => {
        if (existingSchedule) {
            const ids = new Set<string>();
            existingSchedule.slots.forEach(s => s.crew.forEach(c => ids.add(c.userId)));
            return Array.from(ids);
        }
        return [];
    });

    // -- Step 3: Preview and Paywall State --
    const [previewSchedule, setPreviewSchedule] = useState<WatchSchedule | null>(null);
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
            if (prev.includes(userId)) return prev.filter(id => id !== userId);
            return [...prev, userId];
        });
    };

    const getSelectionOrder = (userId: string) => {
        const index = selectedCrewIds.indexOf(userId);
        return index === -1 ? null : index + 1;
    };

    const generateSchedule = () => {
        const startDateTime = new Date(startDate);
        const [startH, startM] = startTime.split(':').map(Number);
        startDateTime.setHours(startH, startM, 0, 0);

        const endDateTime = new Date(endDate);
        const [endH, endM] = endTime.split(':').map(Number);
        endDateTime.setHours(endH, endM, 0, 0);

        const slots = [];
        let currentTime = new Date(startDateTime);
        let slotId = 1;

        // Logic adaption for offsets (Same basic logic, just ensuring types match)
        const offsetHours = isStaggered && crewPerWatch > 1 ? (duration / crewPerWatch) : duration;
        const loopIncrement = offsetHours * 60 * 60 * 1000;

        const orderedCrew = selectedCrewIds.map(id => availableCrew.find(u => u.id === id)).filter(Boolean) as UserData[];
        if (orderedCrew.length === 0) return;

        let iter = 0;
        const totalCrew = orderedCrew.length;

        while (currentTime < endDateTime) {
            const chunkStart = new Date(currentTime);
            const chunkEnd = new Date(currentTime.getTime() + loopIncrement);
            const activeCrewInChunk = [];

            for (let i = 0; i < crewPerWatch; i++) {
                let crewIndex = (iter - i) % totalCrew;
                if (crewIndex < 0) crewIndex += totalCrew;

                const u = orderedCrew[crewIndex];
                const isCaptain = u.id === currentUser?.id;
                const fName = u.firstName?.trim() || (isCaptain ? currentUser?.firstName?.trim() : '') || 'Unknown';
                const lName = u.lastName?.trim() || (isCaptain ? currentUser?.lastName?.trim() : '') || 'Crew';

                activeCrewInChunk.push({
                    userId: u.id,
                    userFirstName: fName,
                    userLastName: lName
                });
            }

            slots.push({
                id: slotId++,
                start: chunkStart.toISOString(),
                end: chunkEnd.toISOString(),
                crew: activeCrewInChunk
            });

            currentTime = chunkEnd;
            iter++;
        }

        const newSchedule: WatchSchedule = {
            id: 'preview-id',
            vesselId: 'current-vessel',
            name: scheduleName,
            watchType: watchType,
            createdAt: new Date().toISOString(),
            timezone: currentVessel?.timezone || 'UTC',
            watchConfig: {
                crewPerWatch,
                duration,
                isStaggered,
                watchLeaderCount: 0,
            },
            slots
        };

        setPreviewSchedule(newSchedule);
        setStep(3);
    };

    const handlePublish = async () => {
        if (!isSubscribed) {
            setShowPaywall(true);
            return;
        }

        if (!previewSchedule) return;
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
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
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
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">

                        <div className="space-y-2">
                            <label style={{ fontSize: 13 }} className="font-medium text-foreground">Schedule Name</label>
                            <Input
                                placeholder="e.g. Atlantic Crossing 2026"
                                value={scheduleName}
                                onChange={e => setScheduleName(e.target.value)}
                                className="rounded-[10px]"
                                style={{ background: '#ffffff', border: '1.5px solid #e2ddd8', padding: '13px 14px', height: 'auto', textAlign: 'left', width: '100%', boxSizing: 'border-box' }}
                            />
                        </div>

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

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div className="space-y-2">
                                <label style={{ fontSize: 13 }} className="font-medium text-foreground">Duration (Hours)</label>
                                <div style={{ ...fieldStyle, position: 'relative' }}>
                                    <span style={{ fontSize: 14, color: '#0f172a' }}>{duration}h</span>
                                    <select value={duration} onChange={e => setDuration(Number(e.target.value))} style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}>
                                        {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}h</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label style={{ fontSize: 13 }} className="font-medium text-foreground">Crew Per Watch</label>
                                <div style={{ ...fieldStyle, position: 'relative' }}>
                                    <span style={{ fontSize: 14, color: '#0f172a' }}>{crewPerWatch}</span>
                                    <select value={crewPerWatch} onChange={e => setCrewPerWatch(Number(e.target.value))} style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}>
                                        {Array.from({ length: maxCrewPerWatch }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                </div>
                            </div>
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

                        <Button
                            className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 mt-8"
                            onClick={() => setStep(2)}
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
                            {availableCrew.map(u => {
                                const rank = getSelectionOrder(u.id);
                                const isSelected = rank !== null;
                                const isCaptain = u.id === currentUser?.id;
                                const fName = u.firstName?.trim() || (isCaptain ? currentUser?.firstName?.trim() : '') || 'Unknown';
                                const lName = u.lastName?.trim() || (isCaptain ? currentUser?.lastName?.trim() : '') || 'Crew';

                                return (
                                    <div
                                        key={u.id}
                                        className={cn(
                                            "p-4 rounded-xl border transition-all flex items-center justify-between cursor-pointer",
                                            isSelected
                                                ? "border-primary bg-primary/5 shadow-sm"
                                                : "border-border bg-card hover:border-primary/50"
                                        )}
                                        onClick={() => toggleCrewSelection(u.id)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={cn("h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold border", isSelected ? "bg-background text-primary border-primary/20" : "bg-secondary text-muted-foreground border-transparent")}>
                                                {fName.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-sm">{fName} {lName}</div>
                                                <div className="text-xs text-muted-foreground capitalize">{u.customRole || u.role}</div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            {crewPerWatch >= 2 && (
                                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                    <span className="text-xs font-medium text-muted-foreground cursor-default">Watch Leader</span>
                                                    <Switch
                                                        checked={u.isWatchLeader || false}
                                                        onCheckedChange={(checked) => currentUser?.vesselId && toggleWatchLeader(currentUser.vesselId, u.id, checked)}
                                                        className="data-[state=checked]:bg-primary"
                                                    />
                                                </div>
                                            )}

                                            {isSelected && (
                                                <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-sm">
                                                    {rank}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
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
