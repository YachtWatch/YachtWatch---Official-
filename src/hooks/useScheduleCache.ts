import { useEffect } from 'react';
import type { Vessel, WatchSchedule } from '../contexts/DataContext';

const VESSEL_KEY = 'yw_cached_vessel';
const SCHEDULE_KEY = 'yw_cached_schedule';
const SYNCED_AT_KEY = 'yw_cached_synced_at';

export function saveScheduleCache(vessel: Vessel, schedule: WatchSchedule) {
    try {
        localStorage.setItem(VESSEL_KEY, JSON.stringify(vessel));
        localStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedule));
        localStorage.setItem(SYNCED_AT_KEY, Date.now().toString());
    } catch {
        // localStorage full — not critical
    }
}

export function loadScheduleCache(): {
    vessel: Vessel | null;
    schedule: WatchSchedule | null;
    syncedAt: number | null;
} {
    try {
        const vessel = localStorage.getItem(VESSEL_KEY);
        const schedule = localStorage.getItem(SCHEDULE_KEY);
        const syncedAt = localStorage.getItem(SYNCED_AT_KEY);
        return {
            vessel: vessel ? JSON.parse(vessel) : null,
            schedule: schedule ? JSON.parse(schedule) : null,
            syncedAt: syncedAt ? parseInt(syncedAt, 10) : null,
        };
    } catch {
        return { vessel: null, schedule: null, syncedAt: null };
    }
}

export function formatSyncAge(syncedAt: number): string {
    const mins = Math.floor((Date.now() - syncedAt) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

// Saves live data to cache whenever it changes
export function useScheduleCache(vessel: Vessel | undefined, schedule: WatchSchedule | undefined) {
    useEffect(() => {
        if (vessel && schedule) {
            saveScheduleCache(vessel, schedule);
        }
    }, [vessel?.id, schedule?.id]); // eslint-disable-line react-hooks/exhaustive-deps
}
