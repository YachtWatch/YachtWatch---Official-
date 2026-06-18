
import { describe, it, expect } from 'vitest';
import { generateSchedule, CrewMember } from './scheduler';

const mockCrew: CrewMember[] = [
    { userId: '1', userFirstName: 'Alice', userLastName: 'Smith' },
    { userId: '2', userFirstName: 'Bob', userLastName: 'Jones' },
    { userId: '3', userFirstName: 'Charlie', userLastName: 'Brown' },
    { userId: '4', userFirstName: 'Dave', userLastName: 'Williams' },
];

describe('Scheduler - Navigation (24h coverage)', () => {
    it('should generate 24h schedule for navigation mode', () => {
        const baseDate = new Date('2026-05-15T00:00:00Z');
        const slots = generateSchedule(mockCrew, {
            duration: 4,
            crewPerWatch: 2,
            watchType: 'Navigation',
            startDate: baseDate
        });
        expect(slots.length).toBe(6); // 24 / 4 = 6 slots
        expect(slots[0].condition).toBe('always');
        expect(slots[0].start).toBe(baseDate.toISOString());
    });

    it('should rotate crew correctly in navigation mode', () => {
        const slots = generateSchedule(mockCrew, {
            duration: 4,
            crewPerWatch: 2,
            watchType: 'Navigation',
            startDate: new Date('2026-05-15T00:00:00Z')
        });

        // Slot 0: Alice, Bob
        expect(slots[0].crew[0].userFirstName).toBe('Alice');
        expect(slots[0].crew[1].userFirstName).toBe('Bob');
        // Slot 1: Charlie, Dave
        expect(slots[1].crew[0].userFirstName).toBe('Charlie');
        expect(slots[1].crew[1].userFirstName).toBe('Dave');
        // Slot 2: Alice, Bob (Wrap around)
        expect(slots[2].crew[0].userFirstName).toBe('Alice');
    });
});

describe('Scheduler - Anchor (night-only or custom hours)', () => {
    it('should generate night-only schedule with default anchor hours (20:00-08:00)', () => {
        const baseDate = new Date('2026-05-15T00:00:00Z');
        const slots = generateSchedule(mockCrew, {
            duration: 1,
            crewPerWatch: 1,
            watchType: 'anchor',
            startDate: baseDate
        });

        // Night is 20, 21, 22, 23, 00, 01, 02, 03, 04, 05, 06, 07 (12 hours with 1h slots = 12 slots)
        expect(slots.length).toBe(12);

        // Verify all slots start within night hours
        slots.forEach((slot) => {
            const slotStartHour = new Date(slot.start).getUTCHours();
            const isNight = slotStartHour >= 20 || slotStartHour < 8;
            expect(isNight).toBe(true);
        });
    });

    it('should generate custom hour schedule for anchor mode', () => {
        const baseDate = new Date('2026-05-15T00:00:00Z');
        const slots = generateSchedule(mockCrew, {
            duration: 1,
            crewPerWatch: 1,
            watchType: 'anchor',
            startHour: 18,
            endHour: 22,
            startDate: baseDate
        });

        // Custom window: 18, 19, 20, 21 (4 hours)
        expect(slots.length).toBe(4);
    });

    it('should support single crew per watch for anchor mode', () => {
        const slots = generateSchedule(mockCrew, {
            duration: 4,
            crewPerWatch: 1,
            watchType: 'anchor',
            startDate: new Date('2026-05-15T00:00:00Z')
        });

        // 12 night hours / 4h duration = 3 slots
        expect(slots.length).toBe(3);
        slots.forEach(slot => {
            expect(slot.crew.length).toBe(1);
        });
    });
});

describe('Scheduler - Dock (all 24h with conditional outside-watch-hours)', () => {
    it('should generate 24h schedule with outside-watch-hours condition for dock mode', () => {
        const baseDate = new Date('2026-05-15T00:00:00Z');
        const slots = generateSchedule(mockCrew, {
            duration: 4,
            crewPerWatch: 1,
            watchType: 'dock',
            startHour: 8,   // 8 AM
            endHour: 20,    // 8 PM (watch hours)
            startDate: baseDate
        });

        // 6 slots total (24 / 4)
        expect(slots.length).toBe(6);

        // Expected: 
        // 00:00-04:00 (slot 0) -> outside watch hours (0 < 8) -> outside-watch-hours
        // 04:00-08:00 (slot 1) -> outside watch hours (4 < 8) -> outside-watch-hours
        // 08:00-12:00 (slot 2) -> within watch hours (8 >= 8 && 8 < 20) -> always
        // 12:00-16:00 (slot 3) -> within watch hours -> always
        // 16:00-20:00 (slot 4) -> within watch hours -> always
        // 20:00-24:00 (slot 5) -> outside watch hours (20 >= 20) -> outside-watch-hours

        const outsideSlots = slots.filter(s => s.condition === 'outside-watch-hours');
        const alwaysSlots = slots.filter(s => s.condition === 'always');

        expect(outsideSlots.length).toBe(3);
        expect(alwaysSlots.length).toBe(3);
    });

    it('should generate dock schedule with default hours (20:00-08:00)', () => {
        const slots = generateSchedule(mockCrew, {
            duration: 2,
            crewPerWatch: 1,
            watchType: 'dock',
            startDate: new Date('2026-05-15T00:00:00Z')
        });

        // 24 / 2 = 12 slots
        expect(slots.length).toBe(12);
        // All should have conditions
        slots.forEach(slot => {
            expect(['always', 'outside-watch-hours']).toContain(slot.condition);
        });
    });

    it('should support 2 crew per watch for dock mode', () => {
        const slots = generateSchedule(mockCrew, {
            duration: 4,
            crewPerWatch: 2,
            watchType: 'dock',
            startDate: new Date('2026-05-15T00:00:00Z')
        });

        slots.forEach(slot => {
            expect(slot.crew.length).toBe(2);
        });
    });
});

describe('Scheduler - ISO String Timestamps', () => {
    it('should generate proper ISO string timestamps', () => {
        const baseDate = new Date('2026-05-15T12:00:00Z');
        const slots = generateSchedule(mockCrew, {
            duration: 4,
            crewPerWatch: 1,
            watchType: 'Navigation',
            startDate: baseDate
        });

        slots.forEach(slot => {
            // Should be valid ISO strings
            expect(new Date(slot.start).toISOString()).toBe(slot.start);
            expect(new Date(slot.end).toISOString()).toBe(slot.end);
            
            // End should be after start
            expect(new Date(slot.end).getTime()).toBeGreaterThan(new Date(slot.start).getTime());
        });
    });

    it('should preserve date across 24h cycle', () => {
        const baseDate = new Date('2026-05-15T00:00:00Z');
        const slots = generateSchedule(mockCrew, {
            duration: 4,
            crewPerWatch: 1,
            watchType: 'Navigation',
            startDate: baseDate
        });

        // Check start and end dates match the base date (in UTC)
        const firstSlotStart = new Date(slots[0].start);
        const lastSlotEnd = new Date(slots[slots.length - 1].end);

        expect(firstSlotStart.getUTCFullYear()).toBe(2026);
        expect(firstSlotStart.getUTCMonth()).toBe(4); // May is 4 (0-indexed)
        expect(firstSlotStart.getUTCDate()).toBe(15);

        expect(lastSlotEnd.getUTCFullYear()).toBe(2026);
        expect(lastSlotEnd.getUTCMonth()).toBe(4);
        expect(lastSlotEnd.getUTCDate()).toBe(16);
    });
});

describe('Scheduler - Watch Leaders (Staggered Mode)', () => {
    it('should designate watch leaders in staggered mode', () => {
        const crewWithLeaders: CrewMember[] = [
            { userId: '1', userFirstName: 'Alice', userLastName: 'Smith', isWatchLeader: true },
            { userId: '2', userFirstName: 'Bob', userLastName: 'Jones', isWatchLeader: true },
            { userId: '3', userFirstName: 'Charlie', userLastName: 'Brown', isWatchLeader: true },
            { userId: '4', userFirstName: 'Dave', userLastName: 'Williams', isWatchLeader: true },
            { userId: '5', userFirstName: 'Eve', userLastName: 'Wilson', isWatchLeader: true },
            { userId: '6', userFirstName: 'Frank', userLastName: 'Miller', isWatchLeader: true },
            { userId: '7', userFirstName: 'Grace', userLastName: 'Davis' },
            { userId: '8', userFirstName: 'Henry', userLastName: 'Moore' },
        ];

        const slots = generateSchedule(crewWithLeaders, {
            duration: 4,
            crewPerWatch: 2,
            watchType: 'Navigation',
            startDate: new Date('2026-05-15T00:00:00Z')
        });

        // First slot should have Alice (first leader) and a keeper
        expect(slots[0].crew[0].userId).toBe('1'); // Alice (leader)
        expect(['7', '8']).toContain(slots[0].crew[1].userId); // Grace or Henry (keeper)
    });

    it('should validate leader count in anchor mode', () => {
        const crewWithOneLeader: CrewMember[] = [
            { userId: '1', userFirstName: 'Alice', userLastName: 'Smith', isWatchLeader: true },
            { userId: '2', userFirstName: 'Bob', userLastName: 'Jones' },
            { userId: '3', userFirstName: 'Charlie', userLastName: 'Brown' },
        ];

        // Anchor with 4h duration = 3 slots per night, need 3 leaders but only have 1
        expect(() => {
            generateSchedule(crewWithOneLeader, {
                duration: 4,
                crewPerWatch: 1,
                watchType: 'anchor',
                startDate: new Date('2026-05-15T00:00:00Z')
            });
        }).toThrow();
    });
});

describe('Scheduler - Backward Compatibility', () => {
    it('should accept legacy nightStart/nightEnd parameters', () => {
        const slots = generateSchedule(mockCrew, {
            duration: 1,
            crewPerWatch: 1,
            watchType: 'anchor',
            nightStart: 22,
            nightEnd: 6,
            startDate: new Date('2026-05-15T00:00:00Z')
        });

        // 22, 23, 00, 01, 02, 03, 04, 05 = 8 slots
        expect(slots.length).toBe(8);
    });

    it('should prefer new startHour/endHour over legacy nightStart/nightEnd', () => {
        const slots1 = generateSchedule(mockCrew, {
            duration: 1,
            crewPerWatch: 1,
            watchType: 'anchor',
            startHour: 18,
            endHour: 22,
            nightStart: 20,
            nightEnd: 8,
            startDate: new Date('2026-05-15T00:00:00Z')
        });

        // Should use 18-22 (4 slots), not 20-8 (12 slots)
        expect(slots1.length).toBe(4);
    });
});

