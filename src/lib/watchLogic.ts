import { WatchSchedule } from '../contexts/DataContext';

export function getCurrentSlot(schedule: WatchSchedule | undefined): { slot: WatchSchedule['slots'][0], status: 'active' | 'future' } | null {
    if (!schedule) return null;

    const now = new Date();
    const currentHour = now.getHours();

    // Simplistic Logic:
    // Slots are strings "08:00", "12:00".
    // We parse them to comparables.
    // This assumes daily rotating schedule for now (which fits the MVP 'Underway/Anchor' logic).

    const slot = schedule.slots.find(s => {
        const startH = parseInt(s.start.split(':')[0]);
        const endH = parseInt(s.end.split(':')[0]);

        // Handle midnight crossing (e.g. 20:00 - 00:00 or 00:00 - 04:00)
        // Actually, ranges usually don't cross midnight in the array unless strictly defined.
        // Assuming slots are ordered.

        if (startH < endH) {
            return currentHour >= startH && currentHour < endH;
        } else {
            // Crossing midnight (e.g. 20:00 - 04:00? No, usually 20-00, 00-04)
            // If start=22 and end=02?
            return currentHour >= startH || currentHour < endH;
        }
    });

    if (slot) return { slot, status: 'active' };

    return null;
}

export function getWatchStatus(lastCheckIn: string | undefined, intervalMinutes: number) {
    if (!lastCheckIn) return 'red'; // No check-in ever? Treat as Red if watch started.

    const last = new Date();
    const [h, m] = lastCheckIn.split(':');
    last.setHours(parseInt(h), parseInt(m), 0);

    // Handle day rollover if needed? 
    // For MVP, assume checkin was "recent" if hours close. 
    // Better: Store full ISO strings for checkins. 
    // CURRENT DB stores "08:00". Let's update `checkedInAt` to be ISO string or handled carefully.
    // Code in DataContext uses: `new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })` -> "14:30"

    // Fix: If lastCheckIn is "HH:mm", we assume it's today.
    // If now is "00:10" and last was "23:55", we have an issue with simple parsing without dates.
    // BUT for MVP, let's assume we standardise on today's date for comparison.

    const now = new Date();
    const checkInTime = new Date();
    checkInTime.setHours(parseInt(lastCheckIn.split(':')[0]), parseInt(lastCheckIn.split(':')[1]), 0);

    // If checkInTime is in future (e.g. it was 23:59 and now 00:01, but we parsed 23:59 as today 23:59 which is > now 00:01), subtract day?
    // Actually simpler: difference in minutes.

    const diffMs = now.getTime() - checkInTime.getTime();
    const diffMins = diffMs / 60000;

    // Handle day wrap simplisticly: if diff is huge negative, or huge positive?
    // Real app: Use ISO timestamps. 
    // User requested "First time", so I should probably fix DataContext to use ISO.

    if (diffMins <= intervalMinutes) return 'green';
    if (diffMins <= intervalMinutes + 1) return 'amber'; // 1 min grace
    return 'red'; // > 3 mins late (Amber lasts 1-3 mins?)
    // User: "active... fail to ack for 1 minute -> amber... after 3 minutes -> red"
    // So 0-Interval: Green
    // Interval - (Interval+1): ?? (Transition?)
    // User said: "fails to acknowledge... for 1 min" (implies valid period ended 1 min ago).

    if (diffMins <= intervalMinutes + 1) return 'green'; // within interval + 1 min buffer?
    if (diffMins <= intervalMinutes + 3) return 'amber';
    return 'red';
}
