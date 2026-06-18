import { useState } from 'react';
import { ScheduleMatrixView } from '../../components/ScheduleMatrixView';
import { WatchSchedule } from '../../contexts/DataContext';
import { Clock, Users, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Switch } from '../../components/ui/switch';


interface CrewScheduleViewProps {
    schedule: WatchSchedule | undefined;
    user: any;
}

export function CrewScheduleView({ schedule, user }: CrewScheduleViewProps) {
    const [showMyWatches, setShowMyWatches] = useState(false);

    if (!schedule) {
        return (
            <Card className="max-w-md mx-auto text-center border shadow-sm">
                <CardContent className="pt-10 pb-8 px-8 flex flex-col items-center gap-6">
                    <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2">
                        <Clock className="h-10 w-10 stroke-[1.5]" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-2xl font-bold text-foreground">Standby for Orders</h3>
                        <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
                            Sit tight — your Captain is working on the next watch schedule. You'll be notified as soon as it's ready.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-accent/30 px-4 py-3 rounded-lg w-full max-w-xs justify-center">
                        <CheckCircle className="h-4 w-4 text-primary/70 shrink-0" />
                        <span>Push notifications are enabled for schedule updates</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Calculate generic watch duration from the first slot (approximate)
    const firstSlot = schedule.slots[0];
    const watchDurationHours = firstSlot
        ? (new Date(firstSlot.end).getTime() - new Date(firstSlot.start).getTime()) / (1000 * 60 * 60)
        : 0;

    const displayCrewPerWatch = schedule.watchConfig.crewPerWatch || (firstSlot ? firstSlot.crew.length : '-');

    return (
        <div className="space-y-6">
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
                            <div className="text-lg font-semibold text-foreground">
                                {Number.isInteger(watchDurationHours) ? watchDurationHours : watchDurationHours.toFixed(1)}h <span className="text-sm font-normal text-muted-foreground">watches</span>
                            </div>
                        </div>

                        <div className="w-px self-stretch bg-border/40" />

                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
                                <Users className="h-3.5 w-3.5" />
                                <span>Crew</span>
                            </div>
                            <div className="text-lg font-semibold text-foreground">
                                {displayCrewPerWatch} <span className="text-sm font-normal text-muted-foreground">per watch</span>
                            </div>
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
        </div>
    );
}
