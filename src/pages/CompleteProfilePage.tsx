import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { User, ChevronDown, Search, X } from 'lucide-react';
import { COUNTRIES } from '../lib/countries';

function CountryPickerModal({
    open,
    selected,
    onSelect,
    onClose,
}: {
    open: boolean;
    selected: string;
    onSelect: (country: string) => void;
    onClose: () => void;
}) {
    const [search, setSearch] = useState('');

    const filtered = useMemo(
        () => COUNTRIES.filter(c => c.toLowerCase().includes(search.toLowerCase())),
        [search]
    );

    useEffect(() => {
        if (!open) setSearch('');
    }, [open]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50"
            onClick={onClose}
        >
            <div
                className="bg-background rounded-t-2xl flex flex-col"
                style={{ maxHeight: '75vh' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2 border-b">
                    <span className="text-base font-semibold">Select Nationality</span>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-muted">
                        <X className="h-5 w-5 text-muted-foreground" />
                    </button>
                </div>

                {/* Search */}
                <div className="px-4 py-2 border-b">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            autoFocus
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search countries…"
                            className="pl-9"
                        />
                    </div>
                </div>

                {/* Scrollable list */}
                <div className="overflow-y-auto flex-1 py-1">
                    {filtered.length === 0 && (
                        <p className="text-center text-muted-foreground text-sm py-6">No countries found</p>
                    )}
                    {filtered.map(country => (
                        <button
                            key={country}
                            type="button"
                            onClick={() => { onSelect(country); onClose(); }}
                            className={`w-full text-left px-4 py-3 text-sm hover:bg-muted transition-colors ${country === selected ? 'font-semibold text-primary bg-primary/5' : ''}`}
                        >
                            {country}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function CompleteProfilePage() {
    const { user, updateUser } = useAuth();
    const { updateUserInStore } = useData();
    const navigate = useNavigate();
    const location = useLocation();
    const initialData = location.state?.initialData;

    const [nationality, setNationality] = useState('');
    const [passportNumber, setPassportNumber] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [countryPickerOpen, setCountryPickerOpen] = useState(false);

    const [saving, setSaving] = useState(false);

    // Pre-fill if data exists (e.g. coming back to this page)
    useEffect(() => {
        if (user) {
            if (user.nationality) setNationality(user.nationality);
            if (user.passportNumber) setPassportNumber(user.passportNumber);
            if (user.dateOfBirth) setDateOfBirth(user.dateOfBirth);
        }
    }, [user]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setSaving(true);

        const updates = {
            nationality,
            passportNumber,
            dateOfBirth,
            // If we have initialData from signup, use it to populate the profile
            firstName: initialData?.firstName || user.firstName,
            lastName: initialData?.lastName || user.lastName,
            role: initialData?.role || user.role,
            customRole: initialData?.customRole || user.customRole,
        };

        // Update local auth context
        updateUser(updates);

        // Update in database
        await updateUserInStore(user.id, updates);

        setSaving(false);
        // Fix: Use the role we just saved/updated, not the possibly stale one from user context
        navigate(`/dashboard/${updates.role}`);
    };

    const handleSkip = async () => {
        if (!user) return;

        // Critical Fix: If we have an intended role from signup (initialData), 
        // we must ensure it's respected even if 'skipping', because AuthContext might have 
        // auto-healed as 'crew' by default.
        const intendedRole = initialData?.role || user.role;
        console.log(`⏩ Skipping profile, but enforcing role: ${intendedRole}`);

        if (intendedRole !== user.role) {
            console.log("Updating role in store to match intended role...");
            await updateUserInStore(user.id, { role: intendedRole });

            // Also update local state to avoid race condition on redirect
            updateUser({ role: intendedRole });
        }

        navigate(intendedRole === 'captain' ? '/dashboard/captain' : '/dashboard/crew', { replace: true });
    };

    return (
        <>
        <CountryPickerModal
            open={countryPickerOpen}
            selected={nationality}
            onSelect={setNationality}
            onClose={() => setCountryPickerOpen(false)}
        />
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                            <User className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle>Set up your profile</CardTitle>
                            <CardDescription>One last step to get you ready.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-6 bg-secondary/50 p-3 rounded-md border text-center">
                        This information is used to populate the crew list that is printable by the captain.
                    </p>

                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="flex gap-3 items-end">
                            <div className="flex-1 min-w-0 overflow-hidden space-y-2">
                                <label className="text-sm font-medium">Date of Birth</label>
                                <Input
                                    type="date"
                                    value={dateOfBirth}
                                    onChange={e => setDateOfBirth(e.target.value)}
                                    className="w-full h-10"
                                    required
                                />
                            </div>
                            <div className="flex-1 min-w-0 overflow-hidden space-y-2">
                                <label className="text-sm font-medium">Nationality</label>
                                <button
                                    type="button"
                                    onClick={() => setCountryPickerOpen(true)}
                                    className="flex items-center justify-between w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring h-10"
                                >
                                    <span className={`truncate ${nationality ? 'text-foreground' : 'text-muted-foreground'}`}>
                                        {nationality || 'Nationality'}
                                    </span>
                                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-1" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Passport Number</label>
                            <Input
                                value={passportNumber}
                                onChange={e => setPassportNumber(e.target.value)}
                                placeholder="Passport No."
                                required
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={saving}>
                            {saving ? 'Saving...' : 'Save & Continue'}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center border-t pt-4">
                    <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground">
                        Skip and do later
                    </Button>
                </CardFooter>
            </Card>
        </div>
        </>
    );
}
