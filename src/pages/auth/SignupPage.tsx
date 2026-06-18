import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserRole } from '../../contexts/AuthContext';

import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Anchor, Ship, Users, Eye, EyeOff } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function SignupPage() {
    // const { refreshUser } = useAuth(); // Unused
    const [role, setRole] = useState<UserRole>('captain');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [position, setPosition] = useState('');

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    const handleSignup = async () => {
        setError('');
        setLoading(true);

        try {
            // 1. Sign up with Supabase Auth


            const signUpPromise = supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        role: role,
                        name: `${firstName} ${lastName}`.trim(),
                        first_name: firstName,
                        last_name: lastName,
                        custom_role: position
                    }
                }
            });

            // Timeout after 60 seconds to prevent indefinite hanging (extended for testing cold starts)
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Request timed out. Please check your internet connection.")), 60000)
            );

            const { data: authData, error: authError } = await Promise.race([signUpPromise, timeoutPromise]) as any;



            if (authError) throw authError;
            if (!authData.user) throw new Error("No user created - check email confirmation settings?");

            if (authData.user && !authData.session) {

                setLoading(false);
                setError("Account created! Please check your email to confirm your account before logging in.");
                return;
            }

            // 2. Navigate immediately to Complete Profile


            navigate('/complete-profile', {
                state: {
                    initialData: {
                        firstName,
                        lastName,
                        role,
                        customRole: position,
                        email
                    }
                }
            });

        } catch (err: any) {
            console.error("💥 CAUGHT ERROR:", err);

            if (err.message?.includes('already registered') || err.message?.includes('database error') || err.message?.includes('User already registered')) {
                console.log("⚠️ User exists, attempting auto-login fallback...");

                // Create a timeout promise for the fallback login too
                const loginTimeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Fallback login timed out (>30s)')), 30000)
                );

                try {
                    // Attempt to log in dynamically with race
                    const authResponse = await Promise.race([
                        supabase.auth.signInWithPassword({ email, password }),
                        loginTimeoutPromise
                    ]) as any;

                    const { data: loginData, error: loginError } = authResponse;

                    if (loginError) {
                        console.error("Auto-login failed:", loginError);
                        setError("Account already exists, and the provided password was incorrect. Please log in.");
                    } else if (loginData.user) {
                        console.log("✅ Auto-login successful, redirecting...");
                        navigate('/complete-profile', {
                            state: {
                                initialData: {
                                    firstName,
                                    lastName,
                                    role,
                                    customRole: position,
                                    email
                                }
                            }
                        });
                    }
                } catch (loginErr: any) {
                    console.error("❌ Fallback login EXCEPTION:", loginErr);
                    setError("Account exists, but auto-login failed: " + loginErr.message);
                }
            } else {
                console.error("Signup error:", err);
                setError(err.message || "Failed to create account");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4 py-8">
            <Card className="w-full max-w-lg">
                <CardHeader className="text-center space-y-2">
                    <div className="flex justify-center">
                        <Anchor className="h-10 w-10 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
                    <CardDescription>
                        Get started with YachtWatch today
                    </CardDescription>
                </CardHeader>
                <div className="space-y-4 p-6 pt-0">

                    <div className="grid grid-cols-2 gap-4">
                        <div
                            className={cn(
                                "cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center gap-2 transition-all hover:bg-muted",
                                role === 'captain' ? "border-primary bg-primary/5" : "border-muted-foreground/20"
                            )}
                            onClick={() => setRole('captain')}
                        >
                            <Ship className={cn("h-8 w-8", role === 'captain' ? "text-primary" : "text-muted-foreground")} />
                            <div className="font-semibold">Captain</div>
                            <div className="text-xs text-center text-muted-foreground">Manager of the vessel</div>
                        </div>

                        <div
                            className={cn(
                                "cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center gap-2 transition-all hover:bg-muted",
                                role === 'crew' ? "border-primary bg-primary/5" : "border-muted-foreground/20"
                            )}
                            onClick={() => setRole('crew')}
                        >
                            <Users className={cn("h-8 w-8", role === 'crew' ? "text-primary" : "text-muted-foreground")} />
                            <div className="font-semibold">Crew</div>
                            <div className="text-xs text-center text-muted-foreground">Joining a vessel</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="firstName" className="text-sm font-medium leading-none">First Name</label>
                            <Input
                                id="firstName"
                                placeholder="John"
                                required
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="lastName" className="text-sm font-medium leading-none">Last Name</label>
                            <Input
                                id="lastName"
                                placeholder="Doe"
                                required
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="position" className="text-sm font-medium leading-none">Position onboard</label>
                        <Input
                            id="position"
                            placeholder={role === 'captain' ? "Captain" : "e.g. Bosun, Chef, Deckhand"}
                            required
                            value={position}
                            onChange={(e) => setPosition(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium leading-none">Email</label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="m.name@example.com"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="password" className="text-sm font-medium leading-none">Password</label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(v => !v)}
                                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>
                    {error && <p className="text-sm text-destructive font-medium text-center">{error}</p>}

                    <CardFooter className="flex flex-col gap-4 px-0">
                        <Button onClick={handleSignup} className="w-full" disabled={loading}>
                            {loading ? "Creating account..." : "Create account"}
                        </Button>
                        <div className="text-center text-sm text-muted-foreground mt-4">
                            Already have an account?{" "}
                            <Link to="/auth/login" className="underline underline-offset-4 hover:text-primary">
                                Sign in
                            </Link>
                        </div>

                        <Button
                            variant="link"
                            size="sm"
                            className="text-xs text-muted-foreground mt-2"
                            onClick={() => {
                                if (confirm("This will clear all local app data and refresh the page. Continue?")) {
                                    localStorage.clear();
                                    sessionStorage.clear();
                                    window.location.reload();
                                }
                            }}
                        >
                            Trouble? Reset App Data (Clear Cache)
                        </Button>
                    </CardFooter>
                </div>
            </Card>
        </div>
    );
}
