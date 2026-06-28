import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, UserData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/button';
import { ArrowLeft, Anchor } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ProfileDropdown } from '../../components/ui/ProfileDropdown';

// A4 landscape at 96 dpi
const A4_W = 1123;
const A4_H = 794;

function formatDMY(dateStr?: string): string {
    if (!dateStr) return '-';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
        return dateStr;
    }
}

export default function CrewExportWizard() {
    const { users, getVessel } = useData();
    const { user: currentUser } = useAuth();
    const navigate = useNavigate();

    const [step, setStep] = useState<1 | 2>(1);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [safeTop, setSafeTop] = useState(0);

    // Read safe-area-inset-top via JS — more reliable than CSS env() in Capacitor WebView
    useEffect(() => {
        const probe = document.createElement('div');
        probe.style.position = 'fixed';
        probe.style.top = '0';
        probe.style.paddingTop = 'env(safe-area-inset-top, 0px)';
        probe.style.visibility = 'hidden';
        document.body.appendChild(probe);
        const value = parseInt(window.getComputedStyle(probe).paddingTop || '0', 10);
        document.body.removeChild(probe);
        setSafeTop(value || 0);
    }, []);

    const wrapperRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    const vessel = currentUser?.vesselId ? getVessel(currentUser.vesselId) : undefined;
    const captainName = `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim();

    // Same crew logic as CaptainCrewView / ScheduleGeneratorWizard
    const availableCrew = useMemo(() => {
        if (!currentUser?.vesselId) return [];
        const vesselUsers = users.filter(
            u => u.id === currentUser.id || u.vesselId === currentUser.vesselId
        );
        if (!vesselUsers.some(u => u.id === currentUser.id)) {
            vesselUsers.unshift(currentUser as unknown as UserData);
        }
        return vesselUsers;
    }, [users, currentUser]);

    // Pre-select all crew on first load
    useEffect(() => {
        if (availableCrew.length > 0 && selectedIds.length === 0) {
            setSelectedIds(availableCrew.map(u => u.id));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [availableCrew]);

    const selectedCrew = useMemo(
        () => selectedIds.map(id => availableCrew.find(u => u.id === id)).filter(Boolean) as UserData[],
        [selectedIds, availableCrew]
    );

    // Step 2: temporarily allow native pinch-to-zoom for the preview
    useEffect(() => {
        if (step !== 2) return;
        const viewport = document.querySelector('meta[name="viewport"]');
        const original = viewport?.getAttribute('content') || '';
        viewport?.setAttribute('content', 'width=device-width, initial-scale=1.0');
        return () => { viewport?.setAttribute('content', original); };
    }, [step]);

    // Step 2: compute initial scale so the A4 page fits the screen width
    useEffect(() => {
        if (step !== 2) return;
        const measure = () => {
            const w = wrapperRef.current?.clientWidth ?? window.innerWidth;
            setScale((w - 32) / A4_W);
        };
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, [step]);

    const toggleId = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const vesselLabel = vessel
        ? `${vessel.type === 'motor' ? 'M/Y' : 'S/Y'} ${vessel.name}`
        : 'Vessel';

    const today = new Date().toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
    });

    // ─── STEP 1: Crew Selection ────────────────────────────────────────────────
    if (step === 1) {
        return (
            <div className="flex flex-col min-h-screen bg-background">
                {/* Top bar */}
                <div className="bg-card border-b shrink-0 sticky top-0 z-50" style={{ paddingTop: safeTop }}>
                    <div className="px-4 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-accent rounded-lg transition-colors">
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                            <div className="flex items-center gap-2 font-bold text-xl text-primary">
                                <Anchor className="h-6 w-6" />
                                <span>YachtWatch</span>
                            </div>
                        </div>
                        <ProfileDropdown />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4">
                    {/* Selection controls */}
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-sm font-medium text-muted-foreground">
                            {selectedIds.length} of {availableCrew.length} selected
                        </span>
                        <div className="flex gap-4">
                            <button
                                className="text-xs text-primary font-medium"
                                onClick={() => setSelectedIds(availableCrew.map(u => u.id))}
                            >
                                Select All
                            </button>
                            <button
                                className="text-xs text-destructive font-medium"
                                onClick={() => setSelectedIds([])}
                            >
                                Deselect All
                            </button>
                        </div>
                    </div>

                    {/* Crew list — exact same card UI as ScheduleGeneratorWizard step 2 */}
                    <div className="space-y-3">
                        {availableCrew.map(u => {
                            const isSelected = selectedIds.includes(u.id);
                            const isCaptain = u.id === currentUser?.id;
                            const fName = u.firstName?.trim() || (isCaptain ? currentUser?.firstName?.trim() : '') || 'Unknown';
                            const lName = u.lastName?.trim() || (isCaptain ? currentUser?.lastName?.trim() : '') || '';

                            return (
                                <div
                                    key={u.id}
                                    className={cn(
                                        'p-4 rounded-xl border transition-all flex items-center justify-between cursor-pointer',
                                        isSelected
                                            ? 'border-primary bg-primary/5 shadow-sm'
                                            : 'border-border bg-card hover:border-primary/50'
                                    )}
                                    onClick={() => toggleId(u.id)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            'h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold border',
                                            isSelected
                                                ? 'bg-background text-primary border-primary/20'
                                                : 'bg-secondary text-muted-foreground border-transparent'
                                        )}>
                                            {fName.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-sm">{fName} {lName}</div>
                                            <div className="text-xs text-muted-foreground capitalize">
                                                {u.customRole || u.role}
                                            </div>
                                        </div>
                                    </div>
                                    {isSelected && (
                                        <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-sm">
                                            ✓
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Confirm button */}
                <div
                    className="px-4 pt-3 bg-white border-t"
                    style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 20px) + 12px)' }}
                >
                    <Button
                        className="w-full h-12 text-base font-semibold shadow-lg"
                        disabled={selectedIds.length === 0}
                        onClick={() => setStep(2)}
                    >
                        Generate Crew List ({selectedIds.length})
                    </Button>
                </div>
            </div>
        );
    }

    // ─── STEP 2: A4 Landscape Preview ─────────────────────────────────────────
    const scaledH = A4_H * scale;

    return (
        <div className="flex flex-col bg-white" style={{ height: '100vh' }}>
            {/* Header — JS-measured safeTop is reliable here */}
            <div className="bg-card border-b shrink-0" style={{ paddingTop: safeTop }}>
                <div className="px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setStep(1)} className="p-2 -ml-2 hover:bg-accent rounded-lg transition-colors">
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <div className="flex items-center gap-2 font-bold text-xl text-primary">
                            <Anchor className="h-6 w-6" />
                            <span>YachtWatch</span>
                        </div>
                    </div>
                    <ProfileDropdown />
                </div>
            </div>

            {/* Grey canvas — scrollable, pinch-zoomable */}
            <div
                ref={wrapperRef}
                className="flex-1 overflow-auto p-4 flex flex-col items-center"
            >
                <div style={{ width: A4_W * scale, height: scaledH, position: 'relative', flexShrink: 0 }}>
                    <div
                        style={{
                            width: A4_W,
                            height: A4_H,
                            transform: `scale(${scale})`,
                            transformOrigin: 'top left',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            background: '#fff',
                            boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
                        }}
                    >
                        <A4CrewList
                            vesselLabel={vesselLabel}
                            captainName={captainName}
                            today={today}
                            crew={selectedCrew}
                        />
                    </div>
                </div>
                <div style={{ height: 16 }} />
            </div>

            {/* Bottom button — same container as Generate Crew List */}
            <div
                className="bg-white border-t px-4 pt-3 shrink-0"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 20px) + 47px)' }}
            >
                <Button className="w-full h-12 text-base font-semibold shadow-lg" onClick={() => window.print()}>
                    Print / Save as PDF
                </Button>
            </div>

            <style>{`
                @media print {
                    @page { size: A4 landscape; margin: 15mm; }
                    body { -webkit-print-color-adjust: exact; }
                }
            `}</style>
        </div>
    );
}

// ─── A4 Page Content ──────────────────────────────────────────────────────────
interface A4Props {
    vesselLabel: string;
    captainName: string;
    today: string;
    crew: UserData[];
}

function A4CrewList({ vesselLabel, captainName, today, crew }: A4Props) {
    // Column widths in px — total must fit A4_W minus padding (40px each side = 80px)
    // Usable width: 1043px shared across 7 columns
    const cols = [
        { label: 'Full Name',        width: 190 },
        { label: 'Position',         width: 130 },
        { label: 'Date of Birth',    width: 120 },
        { label: 'Nationality',      width: 120 },
        { label: 'Passport No.',     width: 150 },
        { label: 'Passport Expiry',  width: 140 },
        { label: 'Sign On Date',     width: 120 },
    ] as const;

    return (
        <div style={{ padding: '32px 40px', fontFamily: 'Georgia, serif', color: '#000', height: '100%', boxSizing: 'border-box' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 22, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 3, marginBottom: 4 }}>
                    Crew List
                </div>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{vesselLabel}</div>
                <div style={{ fontSize: 11, color: '#555' }}>Date: {today}</div>
            </div>

            {/* Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <colgroup>
                    {cols.map(c => <col key={c.label} style={{ width: c.width }} />)}
                </colgroup>
                <thead>
                    <tr style={{ borderBottom: '1.5px solid #000' }}>
                        {cols.map(c => (
                            <th
                                key={c.label}
                                style={{
                                    padding: '6px 8px 6px 0',
                                    fontFamily: 'Arial, sans-serif',
                                    fontSize: 9,
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.5,
                                    textAlign: 'left',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {c.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {crew.map((member, i) => (
                        <tr
                            key={member.id}
                            style={{
                                borderBottom: '1px solid #e5e7eb',
                                background: i % 2 === 0 ? '#fff' : '#f9fafb',
                            }}
                        >
                            <td style={cellStyle}>{member.firstName} {member.lastName}</td>
                            <td style={cellStyle}>{member.customRole || member.role}</td>
                            <td style={cellStyle}>{formatDMY(member.dateOfBirth)}</td>
                            <td style={cellStyle}>{member.nationality || '-'}</td>
                            <td style={{ ...cellStyle, fontFamily: 'monospace' }}>{member.passportNumber || '-'}</td>
                            <td style={cellStyle}>-</td>
                            <td style={cellStyle}>-</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Footer / Signature */}
            <div style={{ position: 'absolute', bottom: 32, left: 40, right: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Signed:</div>
                    <div style={{ width: 200, borderBottom: '1px solid #000', marginBottom: 6 }} />
                    <div style={{ fontSize: 11, fontWeight: 700 }}>({captainName})</div>
                    <div style={{ fontSize: 9, color: '#555' }}>Captain of {vesselLabel}</div>
                </div>
                <div style={{
                    width: 80, height: 80, border: '2px solid #ccc', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5,
                    color: '#ccc', transform: 'rotate(-15deg)', textAlign: 'center', lineHeight: 1.3,
                }}>
                    Ship's<br />Stamp
                </div>
            </div>
        </div>
    );
}

const cellStyle: React.CSSProperties = {
    padding: '7px 8px 7px 0',
    fontFamily: 'Arial, sans-serif',
    fontSize: 11,
    verticalAlign: 'top',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
};
