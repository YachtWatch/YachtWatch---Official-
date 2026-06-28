import { useState, useEffect, useMemo, useRef } from 'react';
import { playAlarm } from '../lib/audio-utils';

interface WatchLogicProps {
    vessel: any;
    schedule: any;
    user: any;
}

export const useWatchLogic = ({ vessel, schedule, user }: WatchLogicProps) => {
    const [timeLeft, setTimeLeft] = useState('');
    const [watchStatus, setWatchStatus] = useState<'normal' | 'green' | 'orange' | 'red'>('normal');

    // Drives slot re-evaluation at watch-slot boundaries without touching the timer interval.
    const [minuteTick, setMinuteTick] = useState(0);
    useEffect(() => {
        const timer = setInterval(() => setMinuteTick((t: number) => t + 1), 60_000);
        return () => clearInterval(timer);
    }, []);

    // Memoize all slot computations. Re-runs only when the schedule, user, or the
    // current minute changes — not on every setTimeLeft tick.
    const {
        currentGlobalSlot,
        isUserOnWatch,
        myNextSlot,
        nextGlobalSlot,
        displaySlot,
        myCrewEntry,
        isCheckedIn,
    } = useMemo(() => {
        const now = new Date();

        const currentGlobalSlot = schedule?.slots.find((slot: any) => {
            const start = new Date(slot.start);
            const end = new Date(slot.end);
            return now >= start && now < end;
        }) ?? null;

        const isUserOnWatch = !!(currentGlobalSlot?.crew.some((c: any) => c.userId === user?.id));

        const myNextSlot = schedule?.slots
            ?.filter((slot: any) => new Date(slot.start) > now && slot.crew.some((c: any) => c.userId === user?.id))
            .sort((a: any, b: any) => new Date(a.start).getTime() - new Date(b.start).getTime())[0] ?? null;

        const nextGlobalSlot = schedule?.slots
            ?.filter((slot: any) => new Date(slot.start) > now)
            .sort((a: any, b: any) => new Date(a.start).getTime() - new Date(b.start).getTime())[0] ?? null;

        const displaySlot = isUserOnWatch ? currentGlobalSlot : myNextSlot;
        const myCrewEntry = displaySlot?.crew.find((c: any) => c.userId === user?.id) ?? null;
        const isCheckedIn = !!myCrewEntry?.checkedInAt;

        return { currentGlobalSlot, isUserOnWatch, myNextSlot, nextGlobalSlot, displaySlot, myCrewEntry, isCheckedIn };
    }, [schedule?.slots, user?.id, minuteTick]); // eslint-disable-line react-hooks/exhaustive-deps

    // Keep a ref so the interval callback always reads the latest values without
    // being torn down and re-created on every state change.
    const latestRef = useRef({ isUserOnWatch, currentGlobalSlot, myNextSlot, isCheckedIn, myCrewEntry, vessel });
    useEffect(() => {
        latestRef.current = { isUserOnWatch, currentGlobalSlot, myNextSlot, isCheckedIn, myCrewEntry, vessel };
    });

    // Single stable interval — created once on mount, never re-created.
    useEffect(() => {
        const updateTimer = () => {
            const { isUserOnWatch, currentGlobalSlot, myNextSlot, isCheckedIn, myCrewEntry, vessel } = latestRef.current;

            if (isUserOnWatch && currentGlobalSlot) {
                // CASE 1: ON WATCH — count down to end of watch
                const end = new Date(currentGlobalSlot.end).getTime();
                const nowTime = Date.now();
                const diff = end - nowTime;

                if (diff <= 0) {
                    setTimeLeft('00:00:00');
                } else {
                    const h = Math.floor(diff / (1000 * 60 * 60));
                    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const s = Math.floor((diff % (1000 * 60)) / 1000);
                    setTimeLeft(`${h}h ${m}m ${s}s`);
                }

                // ALERT LOGIC (only when on watch)
                if (isCheckedIn && myCrewEntry && vessel) {
                    let lastActiveTime = 0;
                    const entry = myCrewEntry as any;
                    if (entry.lastActiveAt) {
                        lastActiveTime = new Date(entry.lastActiveAt).getTime();
                    } else if (entry.checkedInAt) {
                        // checkedInAt may be a full ISO timestamp or a legacy "HH:MM" string
                        if (entry.checkedInAt.includes('T') || entry.checkedInAt.includes('Z') || entry.checkedInAt.length > 5) {
                            lastActiveTime = new Date(entry.checkedInAt).getTime();
                        } else {
                            const [hh, mm] = entry.checkedInAt.split(':');
                            const d = new Date();
                            d.setHours(Number(hh), Number(mm), 0, 0);
                            if (d.getTime() > Date.now() + 1000 * 60 * 60) {
                                d.setDate(d.getDate() - 1);
                            }
                            lastActiveTime = d.getTime();
                        }
                    }

                    if (lastActiveTime > 0) {
                        const diffMinutes = (Date.now() - lastActiveTime) / 1000 / 60;
                        const interval = vessel.checkInInterval || 15;

                        let newStatus: 'green' | 'orange' | 'red' = 'green';
                        if (diffMinutes <= interval) newStatus = 'green';
                        else if (diffMinutes <= interval + 1) newStatus = 'orange';
                        else newStatus = 'red';

                        setWatchStatus(newStatus);

                        const seconds = Math.floor(Date.now() / 1000);
                        if (newStatus === 'orange') {
                            if (seconds % 15 === 0) playAlarm('gentle');
                        } else if (newStatus === 'red') {
                            if (seconds % 5 === 0) playAlarm('loud');
                        }
                    }
                } else {
                    setWatchStatus('normal');
                }

            } else if (myNextSlot) {
                // CASE 2: OFF WATCH — count down to start of next watch
                const start = new Date(myNextSlot.start).getTime();
                const diff = start - Date.now();

                if (diff <= 0) {
                    setTimeLeft('Starting...');
                } else {
                    const h = Math.floor(diff / (1000 * 60 * 60));
                    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    setTimeLeft(`${h}h ${m}m`);
                }
                setWatchStatus('normal');
            } else {
                // CASE 3: NO UPCOMING WATCH
                setTimeLeft('');
                setWatchStatus('normal');
            }
        };

        const timer = setInterval(updateTimer, 1000);
        updateTimer();
        return () => clearInterval(timer);
    }, []);

    return {
        currentGlobalSlot,
        isUserOnWatch,
        myNextSlot,
        displaySlot,
        timeLeft,
        watchStatus,
        isCheckedIn,
        myCrewEntry,
        nextGlobalSlot,
    };
};
