import { useNavigate } from 'react-router-dom';
import { useState, memo } from 'react';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import { Card } from '../../components/ui/card';
import { Clock, Users, Share2, ClipboardList, CheckCircle2, Circle } from 'lucide-react';
import { PrintService } from '../../services/PrintService';
import { WatchSchedule, JoinRequest, UserData } from '../../contexts/DataContext';
import { ScheduleMatrixView } from '../../components/ScheduleMatrixView';
import { useAuth } from '../../contexts/AuthContext';
import { NoScheduleState } from '../../components/NoScheduleState';


interface CaptainScheduleViewProps {
    schedule: WatchSchedule | null | undefined;
    approvedCrew: JoinRequest[];
    vessel: any;
    onGenerateSchedule: (options: any) => void;
    onUpdateScheduleSettings: (vesselId: string, settings: any) => void;
    onUpdateSlot: (vesselId: string, slotId: number, crewIds: string[]) => void;
    onClearSchedule: () => void;
    users?: UserData[];
}

export const CaptainScheduleView = memo(function CaptainScheduleView({
    schedule,
    vessel,
    // approvedCrew, // Unused while modal is disabled
    // onUpdateScheduleSettings,
    // onUpdateSlot, // Unused while modal is disabled
    onClearSchedule,
    users = [],
}: CaptainScheduleViewProps) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showMyWatches, setShowMyWatches] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const handleShare = async () => {
        console.log('1. Download button tapped');
        if (!schedule) {
            console.warn('Download aborted: schedule is null/undefined');
            return;
        }
        setIsDownloading(true);
        try {
            const options = {
                fileName:     `${(schedule.name || 'WatchSchedule').replace(/[^a-zA-Z0-9 ]/g, '')}.pdf`,
                scheduleName: schedule.name || 'Watch Schedule',
                watchType:    schedule.watchType,
                crewPerWatch: schedule.watchConfig.crewPerWatch || 0,
                vesselName:   vessel?.name || 'Vessel',
                vesselType:   vessel?.type || 'sail',
                slots: schedule.slots.map((s: any) => ({
                    start: s.start,
                    end:   s.end,
                    crew:  s.crew.map((c: any) => ({
                        firstName: c.firstName || '',
                        lastName:  c.lastName  || '',
                    })),
                })),
            };
            console.log('2. Starting PDF generation...', {
                fileName: options.fileName,
                slotCount: options.slots.length,
                vesselName: options.vesselName,
            });
            await PrintService.sharePDF(options);
            console.log('5. Share sheet presented successfully');
        } catch (err) {
            console.error('Download failed at:', err);
        } finally {
            setIsDownloading(false);
        }
    };

    // Logic for editing slots is currently disabled to simplify build
    // const [editingSlot, setEditingSlot] = useState<any>(null);


    if (!schedule) {
        return (
            <div className="py-8">
                <NoScheduleState onCreateSchedule={() => navigate('/dashboard/captain/generate-schedule')} />
            </div>
        );
    }

    const firstSlot = schedule.slots[0];
    const watchDurationHours = firstSlot
        ? (new Date(firstSlot.end).getTime() - new Date(firstSlot.start).getTime()) / (1000 * 60 * 60)
        : 0;

    const displayCrewPerWatch = schedule.watchConfig.crewPerWatch || (firstSlot ? firstSlot.crew.length : '-');

    const isDock = schedule.watchType === 'dock';
    const wdStart = schedule.watchConfig.weekdayStartHour ?? 8;
    const wdEnd   = schedule.watchConfig.weekdayEndHour   ?? 20;
    const weStart = schedule.watchConfig.weekendStartHour ?? 8;
    const weEnd   = schedule.watchConfig.weekendEndHour   ?? 20;
    const wdHours = ((wdEnd - wdStart) + 24) % 24 || 24;
    const weHours = ((weEnd - weStart) + 24) % 24 || 24;
    const wdCPW   = schedule.watchConfig.weekdayCrewPerWatch ?? 1;
    const weCPW   = schedule.watchConfig.weekendCrewPerWatch ?? 1;

    const handleDelete = () => {
        setShowDeleteConfirm(true);
    };

    const confirmDelete = () => {
        onClearSchedule();
        setShowDeleteConfirm(false);
    };

    return (
        <div className="space-y-6 relative">
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <Card className="w-[320px] shadow-xl border-destructive/20 scale-100 animate-in zoom-in-95 duration-200">
                        <div className="p-6 text-center space-y-4">
                            <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-semibold text-lg">Delete Schedule?</h3>
                                <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={confirmDelete}
                                >
                                    Delete
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            <div className="bg-background space-y-6">
                <Card className="schedule-meta-card p-5 shadow-sm bg-card text-card-foreground border dark:bg-[#1a1f2e] dark:text-white dark:border-none">
                    <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                            {/* Left: Type & Title */}
                            <div className="flex flex-col gap-1">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest text-left">
                                    {schedule.watchType === 'anchor' ? 'Anchor Watch' : 'Navigation'}
                                </p>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-3xl font-bold text-foreground leading-tight tracking-tight">
                                        {schedule.name || 'Current Schedule'}
                                    </h1>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                        </span>
                                        <span className="text-green-600 font-bold text-[10px] uppercase tracking-wider">Active</span>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Actions */}
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-3 gap-2 text-foreground font-medium"
                                    onClick={() => navigate('/dashboard/captain/generate-schedule', { state: { schedule } })}
                                >
                                    <img src="https://api.iconify.design/lucide:pencil.svg?color=%2364748b" className="h-3.5 w-3.5" alt="" />
                                    <span>Edit</span>
                                </Button>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    onClick={handleDelete}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                </Button>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled={isDownloading}
                                    className="h-8 w-8 text-muted-foreground"
                                    onClick={handleShare}
                                    title="Share / Save PDF"
                                >
                                    <Share2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-border/40 w-full" />

                        {/* Row 2: Stats Grid */}
                        <div className="flex items-start gap-8">
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2 text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
                                    <Clock className="h-3.5 w-3.5" />
                                    <span>Duration</span>
                                </div>
                                {isDock ? (
                                    <div className="flex flex-col gap-0.5">
                                        <div className="text-sm font-semibold text-foreground">Weekdays <span className="font-normal text-muted-foreground">·</span> {wdHours}h</div>
                                        <div className="text-sm font-semibold text-foreground">Weekends <span className="font-normal text-muted-foreground">·</span> {weHours}h</div>
                                    </div>
                                ) : (
                                    <div className="text-lg font-semibold text-foreground">
                                        {Number.isInteger(watchDurationHours) ? watchDurationHours : watchDurationHours.toFixed(1)}h <span className="text-sm font-normal text-muted-foreground">watches</span>
                                    </div>
                                )}
                            </div>

                            <div className="w-px self-stretch bg-border/40" />

                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2 text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
                                    <Users className="h-3.5 w-3.5" />
                                    <span>Crew</span>
                                </div>
                                {isDock ? (
                                    <div className="flex flex-col gap-0.5">
                                        <div className="text-sm font-semibold text-foreground">Weekdays <span className="font-normal text-muted-foreground">·</span> {wdCPW}</div>
                                        <div className="text-sm font-semibold text-foreground">Weekends <span className="font-normal text-muted-foreground">·</span> {weCPW}</div>
                                    </div>
                                ) : (
                                    <div className="text-lg font-semibold text-foreground">
                                        {displayCrewPerWatch} <span className="text-sm font-normal text-muted-foreground">per watch</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Row 3: Toggle */}
                        <div>
                            <div className="inline-flex items-center gap-3 px-1.5 pr-4 py-1.5 rounded-full border bg-background hover:bg-accent/50 transition-colors cursor-pointer w-auto" onClick={() => setShowMyWatches(!showMyWatches)}>
                                <Switch
                                    checked={showMyWatches}
                                    onCheckedChange={setShowMyWatches}
                                    className="scale-90 data-[state=checked]:bg-primary"
                                />
                                <span className="text-sm text-muted-foreground font-medium select-none">
                                    My Watch Only
                                </span>
                            </div>
                        </div>
                    </div>
                </Card>

                <div className="min-h-[300px]">
                    <ScheduleMatrixView
                        schedule={schedule}
                        currentUserId={user?.id}
                        showOnlyUserId={showMyWatches ? user?.id : undefined}
                    />
                </div>

                {/* Standing Orders */}
                {(schedule.standingOrders || []).length > 0 && (
                    <Card className="p-5 shadow-sm bg-card border">
                        <div className="flex items-center gap-2 mb-4">
                            <ClipboardList className="h-4 w-4 text-primary" />
                            <h3 className="font-semibold text-sm">Standing Orders</h3>
                            <span className="ml-auto text-xs text-muted-foreground">
                                {Object.keys(schedule.acknowledgments || {}).length}/{users.filter(u => u.role === 'crew').length} acknowledged
                            </span>
                        </div>

                        <div className="space-y-4">
                            {(schedule.standingOrders || []).map((order, i) => {
                                const ackedUserIds = Object.keys(schedule.acknowledgments || {});
                                const completedBy = order.requiresCompletion
                                    ? Object.entries(schedule.orderCompletions || {})
                                        .filter(([, ids]) => ids.includes(order.id))
                                        .map(([uid]) => uid)
                                    : [];

                                return (
                                    <div key={order.id} className="space-y-2">
                                        {/* Order header */}
                                        <div className="flex gap-2 items-start">
                                            <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-foreground leading-snug">{order.text}</p>
                                                <div className="flex gap-3 mt-1">
                                                    {order.time && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{order.time} daily</span>}
                                                    {order.requiresCompletion && <span className="text-xs text-primary font-medium">● Requires completion</span>}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Ack status pills */}
                                        <div className="flex flex-wrap gap-1.5 pl-7">
                                            {users.filter(u => u.role === 'crew').map(u => {
                                                const acked = ackedUserIds.includes(u.id);
                                                const completed = completedBy.includes(u.id);
                                                return (
                                                    <span
                                                        key={u.id}
                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${acked ? 'bg-green-50 border-green-200 text-green-700' : 'bg-muted border-border text-muted-foreground'}`}
                                                    >
                                                        {acked
                                                            ? <CheckCircle2 className="h-3 w-3" />
                                                            : <Circle className="h-3 w-3" />}
                                                        {u.firstName}
                                                        {order.requiresCompletion && acked && (
                                                            <span className={completed ? 'text-green-600' : 'text-amber-500'}>{completed ? ' ✓' : ' …'}</span>
                                                        )}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                )}
            </div >

            {/* Edit Slot Modal - Disabled for now */}
        </div >
    );
});
