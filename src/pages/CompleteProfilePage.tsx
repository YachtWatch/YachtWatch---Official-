import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { User } from 'lucide-react';

export default function CompleteProfilePage() {
    const { user, updateUser } = useAuth();
    const { updateUserInStore } = useData();
    const navigate = useNavigate();
    const location = useLocation();
    const initialData = location.state?.initialData;

    const [nationality, setNationality] = useState('');
    const [passportNumber, setPassportNumber] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');

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
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 min-w-0 overflow-hidden">
                                <label className="text-sm font-medium">Date of Birth</label>
                                <Input
                                    type="date"
                                    value={dateOfBirth}
                                    onChange={e => setDateOfBirth(e.target.value)}
                                    className="w-full max-w-full h-10"
                                    required // Encourage filling it out, but skip button exists
                                />
                            </div>
                            <div className="space-y-2 min-w-0">
                                <label className="text-sm font-medium">Nationality</label>
                                <Input
                                    value={nationality}
                                    onChange={e => setNationality(e.target.value)}
                                    placeholder="Nationality"
                                    required
                                />
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
    );
}
