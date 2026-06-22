import { TimezoneWarningBanner } from '../../components/TimezoneWarningBanner';
import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { BottomTabs } from '../../components/ui/BottomTabs';
import { ProfileDropdown } from '../../components/ui/ProfileDropdown';
import { Anchor, Clock, Ship, CheckCircle, Sailboat, Users, ClipboardList, CheckSquare, Square, Camera, X } from 'lucide-react';
import { SailboatLoader } from '../../components/SailboatLoader';
import { CrewScheduleView } from './CrewScheduleView';
import { CrewListView } from './CrewListView';
import { useWatchLogic } from '../../hooks/useWatchLogic';
import { App as CapApp } from '@capacitor/app';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import jsQR from 'jsqr';

function extractJoinCode(raw: string): string {
    let code = raw;
    if (code.includes('join.yachtwatch.co/')) code = code.split('join.yachtwatch.co/').pop() || code;
    else if (code.includes('yachtwatch://join/')) code = code.split('yachtwatch://join/').pop() || code;
    return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

async function decodeQRFromDataUrl(dataUrl: string): Promise<string | null> {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(null);
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const result = jsQR(imageData.data, imageData.width, imageData.height);
            resolve(result?.data || null);
        };
        img.onerror = () => resolve(null);
        img.src = dataUrl;
    });
}

function QRScanner({ onScan, onClose }: { onScan: (code: string) => void; onClose: () => void }) {
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState('');

    const handleScan = async () => {
        setError('');
        setScanning(true);
        try {
            const photo = await CapCamera.getPhoto({
                quality: 90,
                resultType: CameraResultType.DataUrl,
                source: CameraSource.Camera,
                promptLabelHeader: 'Scan QR Code',
                promptLabelCancel: 'Cancel',
            });
            if (!photo.dataUrl) { setError('No image captured.'); setScanning(false); return; }
            const raw = await decodeQRFromDataUrl(photo.dataUrl);
            if (!raw) { setError('No QR code found. Try again with better lighting.'); setScanning(false); return; }
            const code = extractJoinCode(raw);
            if (code.length === 0) { setError('QR code not recognised. Please try again.'); setScanning(false); return; }
            onScan(code);
        } catch (err: any) {
            // User cancelled — just close
            if (err?.message?.includes('cancelled') || err?.message?.includes('cancel')) {
                onClose();
            } else {
                setError('Camera error. Please allow camera access in Settings.');
            }
            setScanning(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
            <div className="flex items-center justify-between px-4 py-3">
                <h3 className="font-semibold text-lg text-white">Scan QR Code</h3>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10">
                    <X className="h-6 w-6 text-white" />
                </button>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">
                <div className="relative w-64 h-64">
                    <div className="absolute inset-0 border-2 border-white/30 rounded-2xl" />
                    <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-white rounded-tl-2xl" />
                    <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-white rounded-tr-2xl" />
                    <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-white rounded-bl-2xl" />
                    <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-white rounded-br-2xl" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Camera className="h-16 w-16 text-white/30" />
                    </div>
                </div>
                {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                <p className="text-white/60 text-sm text-center">Take a photo of the captain's QR code</p>
                <button
                    onClick={handleScan}
                    disabled={scanning}
                    className="px-8 py-3 bg-white text-black font-semibold rounded-full disabled:opacity-50"
                >
                    {scanning ? 'Opening camera…' : error ? 'Try Again' : 'Open Camera'}
                </button>
            </div>
        </div>
    );
}
// import { getCurrentSlot, getTimeRemaining } from '../../lib/time-utils'; // Not used with new local logic

const formatTime = (isoString: string) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
};

// const CREW_POSITIONS = { // Removed unused constant
//     bridge: ['Captain', 'Chief Officer', 'Second Officer', 'Third Officer', 'Mate'],
//     deck: ['Bosun', 'Lead Deckhand', 'Deckhand', 'Delivery Crew'],
//     interior: ['Chief Steward/ess', 'Second Steward/ess', 'Steward/ess', 'Laundry'],
//     galley: ['Head Chef', 'Sous Chef', 'Cook'],
//     engineering: ['Chief Engineer', 'Second Engineer', 'Third Engineer', 'ETO']
// };



export default function CrewDashboard() {
    const { user, logout } = useAuth();
    const { requestJoin, getCrewVessel, getPendingRequest, getVessel, getSchedule, checkInToWatch, users, requests, refreshData, loading, initialLoadComplete, acknowledgeStandingOrders, completeStandingOrder } = useData();
    const [joinCode, setJoinCode] = useState('');
    // const [selectedPosition, setSelectedPosition] = useState(''); // Removed per user request
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'schedule' | 'crew'>('dashboard');
    const [showStandingOrdersModal, setShowStandingOrdersModal] = useState(false);
    const [ackSubmitting, setAckSubmitting] = useState(false);
    useEffect(() => {
  const path = window.location.pathname;
  const match = path.match(/\/join\/([A-Z0-9]+)/i);
  if (match) setJoinCode(match[1].toUpperCase());

  const listener = CapApp.addListener('appUrlOpen', (event) => {
    const url = new URL(event.url);
    const code = url.pathname.replace('/join/', '').toUpperCase();
    if (code) setJoinCode(code);
  });

  return () => { listener.then(l => l.remove()); };
}, []);

    const approvedVessel = user ? getCrewVessel(user.id) : undefined;
    const pendingRequest = user ? getPendingRequest(user.id) : undefined;
    // True if the user has an approved request but the vessel isn't readable yet
    // (happens when vessel_members is missing → RLS blocks vessel read)
    const approvedButVesselMissing = !approvedVessel && !pendingRequest
        && requests.some(r => r.userId === user?.id && r.status === 'approved');

    const activeVessel = approvedVessel;
    const schedule = activeVessel ? getSchedule(activeVessel.id) : undefined;

    // Show standing orders modal if crew hasn't acknowledged yet
    useEffect(() => {
        if (!schedule || !user) return;
        const orders = schedule.standingOrders || [];
        if (orders.length === 0) return;
        const hasAcked = schedule.acknowledgments?.[user.id];
        if (!hasAcked) setShowStandingOrdersModal(true);
    }, [schedule?.id, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleAcknowledge = async () => {
        if (!activeVessel || !user) return;
        setAckSubmitting(true);
        await acknowledgeStandingOrders(activeVessel.id, user.id);
        setAckSubmitting(false);
        setShowStandingOrdersModal(false);
    };

    // Robustly get all approved crew:
    // DataContext already fetches exactly the Captain + Approved Crew for this specific vessel via RLS-safe queries.
    const approvedCrew = users;

    // O(1) user lookup — avoids nested .find() calls inside crew-list renders.
    const userById = useMemo(
        () => Object.fromEntries(users.map(u => [u.id, u])),
        [users]
    );

    // -- OPTIMIZED SLOT LOGIC --
    const {
        currentGlobalSlot,
        isUserOnWatch: isCurrentlyOnWatch,
        myNextSlot,
        displaySlot,
        timeLeft,
        watchStatus,
        isCheckedIn,
        myCrewEntry,
        nextGlobalSlot
    } = useWatchLogic({ vessel: activeVessel, schedule, user });

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || submitting) return;
        setError('');
        setSuccess('');
        setSubmitting(true);

        // Removed position validation per user request

        // Validate request
        const result = await requestJoin(user.id, user.firstName || '', user.lastName || '', joinCode.trim().toUpperCase());
        if (result.success) {
            setSuccess(result.message);
            setJoinCode('');
        } else {
            setError(result.message);
        }
        setSubmitting(false);
    };

    const handleCheckIn = () => {
        if (!activeVessel || !displaySlot || !user) return;
        checkInToWatch(activeVessel.id, displaySlot.id, user.id);
    };

    // Show spinner on first load OR during a background refresh if we haven't resolved a vessel yet.
    // Without this guard, a background data refresh can briefly show "Join a Vessel" before the
    // requests/vessels data repopulates, creating a false redirect.
    if (loading && (!initialLoadComplete || !activeVessel)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <SailboatLoader />
            </div>
        );
    }

    // Approved but vessel not readable (vessel_members entry missing → RLS blocks vessel).
    // Trigger a refresh to self-heal once the DB is fixed, rather than showing the join page.
    if (approvedButVesselMissing) {
        refreshData();
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <SailboatLoader />
            </div>
        );
    }

    if (!activeVessel) {
        return (
            <div className="container max-w-md mx-auto py-20 px-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Join a Vessel</CardTitle>
                        <CardDescription>Enter the unique Join Code provided by your Captain.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {pendingRequest ? (
                            <div className="text-center space-y-4 py-4">
                                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                                    <SailboatLoader compact />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">Request Sent</h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Waiting for approval from <strong>{getVessel(pendingRequest.vesselId)?.name || 'Vessel'}</strong>
                                    </p>
                                </div>
                                <div className="p-3 bg-secondary/50 rounded-lg text-xs text-muted-foreground">
                                    The Captain needs to accept your request before you can see the dashboard.
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                        setSuccess("Refreshing...");
                                        await refreshData();
                                        setSuccess("");
                                    }}
                                    className="gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" /></svg>
                                    Check Status
                                </Button>
                            </div>
                        ) : (
                            <>
                            <form onSubmit={handleJoin} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Join Code</label>
                                    <Input
                                        value={joinCode}
                                        onChange={e => setJoinCode(e.target.value)}
                                        placeholder="e.g. A1B2C3"
                                        className="uppercase font-mono tracking-widest text-center text-lg"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowScanner(true)}
                                        className="w-full flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        <Camera className="h-4 w-4" />
                                        Scan QR Code instead
                                    </button>
                                </div>
                                {error && <p className="text-sm text-destructive">{error}</p>}
                                {success && <p className="text-sm text-green-600 font-medium">{success}</p>}
                                <Button type="submit" className="w-full" disabled={submitting}>
                                    {submitting ? 'Sending...' : 'Request to Join'}
                                </Button>
                            </form>
                            {showScanner && (
                                <QRScanner
                                    onScan={code => { setJoinCode(code); setShowScanner(false); }}
                                    onClose={() => setShowScanner(false)}
                                />
                            )}
                            </>
                        )}
                    </CardContent>
                </Card>
                <div className="mt-6 text-center">
                    <p style={{ fontSize: '13px', color: '#9CA3AF' }} className="mb-1">Wrong account?</p>
                    <button
                        onClick={logout}
                        style={{ color: '#6B7280', fontSize: '13px', minHeight: '44px' }}
                        className="bg-transparent border-none cursor-pointer px-4"
                    >
                        Sign out
                    </button>
                </div>
            </div>
        );
    }

    // Status colors
    const getCardColor = () => {
        if (!isCurrentlyOnWatch) return 'bg-primary/5 border-primary/20'; // Normal / Next Watch

        switch (watchStatus) {
            case 'green': return 'bg-green-100 border-green-300'; // Subtle green
            case 'orange': return 'bg-orange-100 border-orange-300 animate-pulse-slow'; // Orange
            case 'red': return 'bg-red-100 border-red-500 animate-pulse'; // Red
            default: return 'bg-primary/5 border-primary/20';
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="border-b bg-card relative z-50 safe-area-pt">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xl text-primary">
                        <Anchor className="h-6 w-6" />
                        <span>YachtWatch</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-sm text-muted-foreground hidden sm:block">
                            {users.find(u => u.id === user?.id)?.customRole || 'Crew'} on <span className="font-semibold text-foreground">{activeVessel.type === 'sail' ? 'S/Y' : 'M/Y'} {activeVessel.name}</span>
                        </div>
                        <ProfileDropdown />
                    </div>
                </div>
            </header>
            <TimezoneWarningBanner />

            <main className="container mx-auto px-4 py-6 pb-24">

                {activeTab === 'dashboard' && (
                    <div className="flex flex-col gap-6">
                        <div className="flex justify-between items-center">
                            <h1 className="text-3xl font-bold capitalize">{user?.firstName ? `${user.firstName}'s Dashboard` : 'Dashboard'}</h1>
                        </div>

                        {/* 3-Card Vessel Stats (Moved to Top) */}
                        <div className="grid grid-cols-3 gap-4">
                            {/* Vessel Name */}
                            <Card className="flex flex-col items-center justify-start py-6 px-4 bg-card text-center hover:shadow-md transition-shadow">
                                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 text-primary shrink-0">
                                    <Ship className="h-6 w-6" />
                                </div>
                                <div className="text-sm text-muted-foreground font-medium mb-1">Vessel</div>
                                <div className="font-bold text-lg leading-tight px-2 break-words">{activeVessel.name}</div>
                            </Card>

                            {/* Vessel Length */}
                            <Card className="flex flex-col items-center justify-start py-6 px-4 bg-card text-center hover:shadow-md transition-shadow">
                                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 text-primary shrink-0">
                                    <Sailboat className="h-6 w-6" />
                                </div>
                                <div className="text-sm text-muted-foreground font-medium mb-1">Length</div>
                                <div className="font-bold text-lg leading-tight">{activeVessel.length}m</div>
                            </Card>

                            {/* Crew Size */}
                            <Card className="flex flex-col items-center justify-start py-6 px-4 bg-card text-center hover:shadow-md transition-shadow">
                                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 text-primary shrink-0">
                                    <Users className="h-6 w-6" />
                                </div>
                                <div className="text-sm text-muted-foreground font-medium mb-1">Crew</div>
                                <div className="font-bold text-lg leading-tight">{approvedCrew.length}</div>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Next Watch Card */}
                            <Card className={`transition-colors duration-500 flex flex-col justify-center border ${getCardColor()}`}>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Clock className={`h-5 w-5 ${isCurrentlyOnWatch && watchStatus === 'red' ? 'text-red-600' : 'text-primary'}`} />
                                        Current Watch Status: <span className={(() => {
                                            if (isCurrentlyOnWatch) return "text-green-600 font-bold";
                                            // Check if next slot starts within 1 hour
                                            if (myNextSlot) {
                                                const diffHours = (new Date(myNextSlot.start).getTime() - new Date().getTime()) / (1000 * 60 * 60);
                                                if (diffHours <= 1) return "text-orange-500 font-bold";
                                            }
                                            return "text-blue-500 font-bold";
                                        })()}>
                                            {isCurrentlyOnWatch ? 'ON WATCH' : (myNextSlot && (new Date(myNextSlot.start).getTime() - new Date().getTime()) / (1000 * 60 * 60) <= 1 ? 'UP NEXT' : 'OFF')}
                                        </span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {displaySlot ? (
                                        <div className="space-y-4">
                                            <div className="flex flex-col">
                                                <div className="text-2xl font-bold">{formatTime(displaySlot.start)} - {formatTime(displaySlot.end)}</div>
                                                <div className="text-sm text-muted-foreground capitalize">
                                                    {schedule?.watchType === 'anchor' ? 'Anchor Watch' : 'Navigation Watch'}
                                                </div>

                                                {/* Timer for Crew */}
                                                {(isCurrentlyOnWatch || myNextSlot) && timeLeft && (
                                                    <div className="mt-2 text-right">
                                                        <div className="text-xs uppercase text-muted-foreground font-bold">
                                                            {isCurrentlyOnWatch ? 'Remaining' : 'Off Time Remaining'}
                                                        </div>
                                                        <div className="font-mono text-xl font-bold">{timeLeft}</div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Check In Action */}
                                            {/* Check In Action */}
                                            {isCurrentlyOnWatch && activeVessel?.checkInEnabled && (
                                                <div className="pt-2">
                                                    {(() => {
                                                        let showCheckInButton = !isCheckedIn;
                                                        let buttonText = "Check In Now";

                                                        if (isCheckedIn && myCrewEntry && activeVessel) {
                                                            let lastActiveTime = 0;
                                                            const entry = myCrewEntry as any;
                                                            if (entry.lastActiveAt) {
                                                                lastActiveTime = new Date(entry.lastActiveAt).getTime();
                                                            } else if (entry.checkedInAt) {
                                                                const [hh, mm] = entry.checkedInAt.split(':');
                                                                const d = new Date();
                                                                d.setHours(Number(hh), Number(mm), 0, 0);
                                                                lastActiveTime = d.getTime();
                                                            }

                                                            const diffMinutes = (new Date().getTime() - lastActiveTime) / 1000 / 60;
                                                            const interval = activeVessel.checkInInterval || 15;
                                                            // Enable re-check in if within 30 seconds of expiration (e.g. > 14.5m for 15m interval)
                                                            if (diffMinutes >= interval - 0.5) {
                                                                showCheckInButton = true;
                                                                buttonText = "Check In";
                                                            }
                                                        }

                                                        return showCheckInButton ? (
                                                            <Button variant="destructive" size="sm" className="w-full font-bold animate-pulse shadow-lg" onClick={handleCheckIn}>
                                                                {buttonText}
                                                            </Button>
                                                        ) : (
                                                            <div className="flex items-center justify-center gap-2 text-green-600 font-bold bg-green-500/10 rounded py-2 border border-green-500/20">
                                                                <CheckCircle className="h-4 w-4" />
                                                                <span>Checked In at {myCrewEntry?.checkedInAt}</span>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    ) : ( // No active/next slot
                                        <div className="py-4 text-center text-muted-foreground">
                                            {schedule?.slots.some(s => s.crew.some(c => c.userId === user?.id)) ? "No upcoming watches." : "No watch assigned."}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Global Watch Status Card */}
                            <Card className="bg-card border-border flex flex-col justify-center">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Users className="h-5 w-5 text-primary" />
                                        On Watch Now
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {currentGlobalSlot ? (
                                        <div className="flex flex-col gap-3">
                                            <div className="flex flex-col gap-2">
                                                {currentGlobalSlot.crew.map((c: any) => {
                                                    const u = userById[c.userId] || (user?.id === c.userId ? user : null);
                                                    const fname = u?.firstName?.trim() || c.userFirstName?.trim() || 'Unknown';
                                                    const lname = u?.lastName?.trim() || c.userLastName?.trim() || 'Crew';
                                                    return (
                                                        <div key={c.userId} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                                                            <div className="h-8 w-8 rounded-full bg-secondary border flex items-center justify-center font-bold text-sm shadow-sm">
                                                                {fname.charAt(0).toUpperCase()}
                                                            </div>
                                                            <span className="font-medium text-sm">{fname} {lname}</span>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-muted-foreground">No active watch.</div>
                                    )}

                                    {/* Up Next Section */}
                                    {nextGlobalSlot && (
                                        <div className="mt-6 pt-6 border-t">
                                            <div className="text-xs uppercase text-muted-foreground font-bold mb-3 flex justify-between items-center">
                                                <span>Up Next</span>
                                                <span>{formatTime(nextGlobalSlot.start)}</span>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                {nextGlobalSlot.crew.map((c: any) => {
                                                    const u = userById[c.userId] || (user?.id === c.userId ? user : null);
                                                    const fname = u?.firstName?.trim() || c.userFirstName?.trim() || 'Unknown';
                                                    const lname = u?.lastName?.trim() || c.userLastName?.trim() || 'Crew';
                                                    return (
                                                        <div key={c.userId} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/30">
                                                            <div className="h-6 w-6 rounded-full bg-secondary border flex items-center justify-center font-bold text-xs shadow-sm">
                                                                {fname.charAt(0).toUpperCase()}
                                                            </div>
                                                            <span className="font-medium text-sm text-muted-foreground">{fname} {lname}</span>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}

                {activeTab === 'schedule' && (
                    <CrewScheduleView schedule={schedule} user={user} />
                )}

                {activeTab === 'crew' && (
                    <CrewListView approvedCrew={approvedCrew} schedule={schedule} vesselName={activeVessel.name} />
                )}



            </main>
            <BottomTabs activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Standing Orders Acknowledgment Modal */}
            {showStandingOrdersModal && schedule && (
                <div className="fixed inset-0 z-50 flex flex-col bg-background safe-area-pt">
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <ClipboardList className="h-6 w-6 text-primary flex-shrink-0" />
                            <h1 className="text-2xl font-bold tracking-tight">Standing Orders</h1>
                        </div>
                        <p className="text-sm text-muted-foreground mb-6">
                            Read the standing orders for <span className="font-semibold text-foreground">{schedule.name}</span> and acknowledge below before starting your first watch.
                        </p>

                        <div className="space-y-3 mb-8">
                            {(schedule.standingOrders || []).map((order, i) => (
                                <div key={order.id} className="rounded-xl border bg-card p-4">
                                    <div className="flex gap-3">
                                        <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-foreground leading-snug">{order.text}</p>
                                            <div className="flex gap-3 mt-1.5">
                                                {order.time && (
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />{order.time} daily
                                                    </span>
                                                )}
                                                {order.requiresCompletion && (
                                                    <span className="text-xs text-primary font-medium">● Requires completion</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-6 border-t bg-background safe-area-pb">
                        <Button
                            className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90"
                            onClick={handleAcknowledge}
                            disabled={ackSubmitting}
                        >
                            {ackSubmitting ? 'Saving…' : 'I have read and acknowledge these orders'}
                        </Button>
                    </div>
                </div>
            )}

            {/* Standing Orders completion section — shown on dashboard tab if orders require completion */}
            {activeTab === 'dashboard' && schedule && (schedule.standingOrders || []).some(o => o.requiresCompletion) && schedule.acknowledgments?.[user?.id || ''] && (
                <div className="fixed bottom-[80px] left-0 right-0 px-4">
                    <div className="max-w-lg mx-auto">
                        <Card className="shadow-lg border">
                            <CardHeader className="pb-2 pt-4 px-4">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <ClipboardList className="h-4 w-4 text-primary" />
                                    Standing Orders
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-4 pb-4 space-y-2">
                                {(schedule.standingOrders || []).filter(o => o.requiresCompletion).map(order => {
                                    const done = (schedule.orderCompletions?.[user?.id || ''] || []).includes(order.id);
                                    return (
                                        <button
                                            key={order.id}
                                            type="button"
                                            onClick={() => activeVessel && user && !done && completeStandingOrder(activeVessel.id, user.id, order.id)}
                                            className="w-full flex items-start gap-3 text-left"
                                        >
                                            {done
                                                ? <CheckSquare className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                                                : <Square className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />}
                                            <span className={`text-sm ${done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{order.text}</span>
                                        </button>
                                    );
                                })}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
