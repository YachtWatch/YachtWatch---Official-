
export interface SchedulerOptions {
    duration: number; // Watch duration in hours (e.g. 4)
    crewPerWatch: number;
    watchType: 'Navigation' | 'anchor' | 'dock';
    startDate?: Date; // Start date for schedule (defaults to today)
    // Timezone for the captain (ISO string like 'America/New_York')
    timezone?: string;
    // Custom watch hours for Anchor/Dock modes
    startHour?: number; // e.g. 20 (8 PM) for anchor
    endHour?: number;   // e.g. 8 (8 AM) for anchor
    // Legacy support for night hours
    nightStart?: number; // e.g. 20 (8 PM) - deprecated, use startHour
    nightEnd?: number;   // e.g. 8 (8 AM) - deprecated, use endHour
}

export interface CrewMember {
    userId: string;
    userFirstName: string;
    userLastName: string;
    isWatchLeader?: boolean;
    checkedInAt?: string;
}

export interface Slot {
    id: number;
    start: string;
    end: string;
    crew: CrewMember[];
    condition?: 'always' | 'weekend-only' | 'outside-watch-hours';
}

export function generateSchedule(crew: CrewMember[], options: SchedulerOptions): Slot[] {
    if (crew.length === 0) return [];

    const duration = Number(options.duration);
    const slotsCount = 24 / duration;
    const slots: Slot[] = [];

    // Separate crew into leaders and keepers
    const leaders = crew.filter(c => c.isWatchLeader);
    const keepers = crew.filter(c => !c.isWatchLeader);

    // If there ARE designated leaders, ensure mathematically we have enough to cover the watch slots.
    // If the Captain hasn't designated ANY leaders, ignore this check and use standard cycle logic.
    if (leaders.length > 0 && leaders.length < slotsCount && options.watchType !== 'dock') {
        throw new Error(`Invalid configuration: You have ${slotsCount} watch slots in an active schedule but only ${leaders.length} Watch Leaders. You must designate more Watch Leaders or reduce the number of slots.`);
    }

    let leaderIndex = 0;
    let keeperIndex = 0;
    let standardIndex = 0;

    const watchType = options.watchType;
    const startDate = options.startDate || new Date();
    
    // Support new startHour/endHour parameters, with fallback to legacy nightStart/nightEnd
    let configuredStartHour: number;
    let configuredEndHour: number;
    
    if (watchType === 'anchor') {
        configuredStartHour = options.startHour ?? options.nightStart ?? 20;
        configuredEndHour = options.endHour ?? options.nightEnd ?? 8;
    } else if (watchType === 'dock') {
        configuredStartHour = options.startHour ?? options.nightStart ?? 20;
        configuredEndHour = options.endHour ?? options.nightEnd ?? 8;
    } else {
        // Navigation: uses full 24h, these are ignored
        configuredStartHour = 0;
        configuredEndHour = 24;
    }

    const isWithinConfiguredHours = (h: number, start: number, end: number): boolean => {
        if (start > end) {
            // e.g. 20 to 8 (spans midnight)
            return h >= start || h < end;
        } else {
            // e.g. 8 to 20
            return h >= start && h < end;
        }
    };

    for (let i = 0; i < slotsCount; i++) {
        const startTime = i * duration;
        const endTime = (i + 1) * duration;

        // Determine if we should generate this slot and what its condition is
        let shouldGenerate = true;
        let condition: 'always' | 'weekend-only' | 'outside-watch-hours' = 'always';

        const isWithinWatchHours = isWithinConfiguredHours(startTime, configuredStartHour, configuredEndHour);

        // Anchor mode: only generate slots within configured watch hours
        if (watchType === 'anchor') {
            if (!isWithinWatchHours) {
                shouldGenerate = false;
            }
        }

        // Dock mode: all slots generated, but those outside watch hours are marked as 'outside-watch-hours'
        if (watchType === 'dock') {
            if (!isWithinWatchHours) {
                condition = 'outside-watch-hours';
            }
        }

        if (!shouldGenerate) continue;

        const assigned = [];
        const requiredCrew = Number(options.crewPerWatch);

        if (leaders.length > 0) {
            // Staggered Mode: Leaders + Keepers
            // 1. Assign exactly one watch leader
            assigned.push(leaders[leaderIndex % leaders.length]);
            leaderIndex++;

            // 2. Fill the rest of the required crew with keepers
            let keepersNeeded = requiredCrew - 1;
            for (let c = 0; c < keepersNeeded; c++) {
                if (keepers.length > 0) {
                    assigned.push(keepers[keeperIndex % keepers.length]);
                    keeperIndex++;
                } else {
                    // Fallback if there are zero non-leaders (all crew are leaders)
                    assigned.push(leaders[leaderIndex % leaders.length]);
                    leaderIndex++;
                }
            }
        } else {
            // Standard Mode: No designated leaders, cycle normally
            for (let c = 0; c < requiredCrew; c++) {
                assigned.push(crew[standardIndex % crew.length]);
                standardIndex++;
            }
        }

        // Generate ISO string timestamps
        const slotStartDate = new Date(startDate);
        slotStartDate.setHours(startTime, 0, 0, 0);
        
        const slotEndDate = new Date(startDate);
        slotEndDate.setHours(endTime, 0, 0, 0);

        slots.push({
            id: i,
            start: slotStartDate.toISOString(),
            end: slotEndDate.toISOString(),
            crew: assigned,
            condition
        });
    }

    return slots;
}
