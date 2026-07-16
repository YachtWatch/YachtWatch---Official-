import { Link } from 'react-router-dom';
import {
    Anchor,
    CalendarClock,
    Users,
    Smartphone,
    ShieldCheck,
    ArrowRight,
    Menu,
    X,
    Ship
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '../components/ui/button';

function ContactForm() {
    const [form, setForm] = useState({ name: '', email: '', message: '' });
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const subject = encodeURIComponent(`YachtWatch Contact from ${form.name}`);
        const body = encodeURIComponent(`Name: ${form.name}\nEmail: ${form.email}\n\nMessage:\n${form.message}`);
        window.location.href = `mailto:yachtwatch@protonmail.com?subject=${subject}&body=${body}`;
        setSubmitted(true);
    };

    if (submitted) {
        return (
            <div className="text-center py-12 space-y-3 bg-card border border-border rounded-2xl px-8">
                <div className="text-3xl">✅</div>
                <h3 className="text-xl font-semibold">Message sent!</h3>
                <p className="text-muted-foreground">Thanks for reaching out — we'll get back to you as soon as possible.</p>
                <Button variant="ghost" className="mt-2" onClick={() => { setSubmitted(false); setForm({ name: '', email: '', message: '' }); }}>
                    Send another message
                </Button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-8 shadow-sm space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Name</label>
                    <input
                        type="text"
                        required
                        placeholder="Your name"
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Email</label>
                    <input
                        type="email"
                        required
                        placeholder="you@example.com"
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                </div>
            </div>
            <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Message</label>
                <textarea
                    required
                    rows={5}
                    placeholder="How can we help?"
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
            </div>
            <Button type="submit" className="w-full bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white h-11 text-base">
                Send Message
            </Button>
        </form>
    );
}

export default function LandingPage() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
            {/* Navigation */}
            <nav className="border-b border-border/40 backdrop-blur-md bg-background/80 sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-[#1E3A8A]/10 rounded-full">
                            <Anchor className="w-6 h-6 text-[#1E3A8A]" />
                        </div>
                        <span className="font-bold text-xl tracking-tight text-[#1E3A8A]">YachtWatch</span>
                    </div>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-6">
                        <div className="flex items-center gap-2 ml-2">
                            <Link to="/auth/login">
                                <Button variant="ghost">Sign In</Button>
                            </Link>
                            <Link to="/auth/signup">
                                <Button className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white">Get Started</Button>
                            </Link>
                        </div>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <div className="md:hidden flex items-center gap-4">
                        <button onClick={toggleMenu} className="text-foreground">
                            {isMenuOpen ? <X /> : <Menu />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMenuOpen && (
                    <div className="md:hidden border-t border-border p-4 bg-background space-y-4 animate-in slide-in-from-top-5">

                        <div className="grid gap-2 pt-4 border-t border-border">
                            <Link to="/auth/login" onClick={() => setIsMenuOpen(false)}>
                                <Button variant="ghost" className="w-full">Sign In</Button>
                            </Link>
                            <Link to="/auth/signup" onClick={() => setIsMenuOpen(false)}>
                                <Button className="w-full bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white">Get Started</Button>
                            </Link>
                        </div>
                    </div>
                )}
            </nav>

            {/* Hero Section */}
            <header className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center py-20 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <img
                        src="/hero-bg.jpg"
                        alt="Superyacht from above"
                        className="absolute inset-0 w-full h-full object-cover object-top"
                    />
                </div>

                <div className="container mx-auto px-4 relative z-10 flex flex-col items-center justify-center -translate-y-2 text-center">

                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.7)] max-w-4xl mx-auto">
                        Intelligent Scheduling <br /> for Modern Crews
                    </h1>

                    <p className="text-xl md:text-2xl text-white max-w-2xl mx-auto mb-10 leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                        Watch schedules. Done In Seconds.
                    </p>

                    <div className="flex flex-col items-center justify-center gap-2">
                        <Link to="/auth/signup" className="w-full sm:w-auto">
                            <Button size="lg" className="w-full sm:w-[240px] h-14 px-8 text-lg gap-2 shadow-lg shadow-[#1E3A8A]/20 hover:shadow-[#1E3A8A]/40 transition-shadow bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white">
                                Start for Free <ArrowRight className="w-5 h-5" />
                            </Button>
                        </Link>
                        <p className="text-sm font-medium text-white/80 mt-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                            14 Day Trial — No Credit Card Required
                        </p>
                    </div>

                    {/* App Badges - Bottom Right */}
                    <div className="absolute -bottom-32 right-0 flex items-center gap-3">
                        <a href="https://apps.apple.com/app/id6760187387" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity block">
                            <img src="/app-store-badge.svg" alt="Download on the App Store" className="h-8 w-auto" />
                        </a>
                        <a href="#" className="hover:opacity-80 transition-opacity block">
                            <img src="/google-play-badge.svg" alt="Get it on Google Play" className="h-8 w-auto" />
                        </a>
                    </div>
                </div>
            </header>



            {/* Reviews Section */}
            <section className="py-10 bg-muted/30">
                <div className="container mx-auto px-4">
                    <div className="text-center max-w-3xl mx-auto mb-10">
                        <h2 className="text-3xl font-bold mb-4">What Crews Are Saying</h2>
                        <p className="text-muted-foreground text-lg">Trusted by captains and crew aboard yachts around the world.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Review 1 */}
                        <div className="p-6 rounded-2xl border border-border bg-card/50 hover:bg-card hover:shadow-lg transition-all flex flex-col gap-4">
                            <div className="flex items-center gap-1 text-amber-400">
                                {[...Array(5)].map((_, i) => (
                                    <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                ))}
                            </div>
                            <p className="text-muted-foreground text-sm leading-relaxed flex-1">
                                "Replaced our whiteboard and group chats overnight. The whole crew knew their watches before we even left the dock."
                            </p>
                            <div className="border-t border-border pt-4">
                                <p className="font-semibold text-sm">Captain James R.</p>
                                <p className="text-xs text-muted-foreground">M/Y Serenova, Mediterranean</p>
                            </div>
                        </div>

                        {/* Review 2 */}
                        <div className="p-6 rounded-2xl border border-border bg-card/50 hover:bg-card hover:shadow-lg transition-all flex flex-col gap-4">
                            <div className="flex items-center gap-1 text-amber-400">
                                {[...Array(5)].map((_, i) => (
                                    <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                ))}
                            </div>
                            <p className="text-muted-foreground text-sm leading-relaxed flex-1">
                                "As a bosun managing a rotating crew, I needed something reliable. YachtWatch keeps everyone accountable and saves me hours every week."
                            </p>
                            <div className="border-t border-border pt-4">
                                <p className="font-semibold text-sm">Sophie L.</p>
                                <p className="text-xs text-muted-foreground">Bosun, S/Y Albatross, Caribbean</p>
                            </div>
                        </div>

                        {/* Review 3 */}
                        <div className="p-6 rounded-2xl border border-border bg-card/50 hover:bg-card hover:shadow-lg transition-all flex flex-col gap-4">
                            <div className="flex items-center gap-1 text-amber-400">
                                {[...Array(5)].map((_, i) => (
                                    <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                ))}
                            </div>
                            <p className="text-muted-foreground text-sm leading-relaxed flex-1">
                                "Simple, clean, and it just works. Getting schedule changes pushed to the whole crew in real time is a game changer at sea."
                            </p>
                            <div className="border-t border-border pt-4">
                                <p className="font-semibold text-sm">Marco D.</p>
                                <p className="text-xs text-muted-foreground">First Officer, M/Y Horizon Blue, Pacific</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* What It Does */}
            <section className="py-20">
                <div className="container mx-auto px-4">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl font-bold mb-4">How It Works</h2>
                        <p className="text-muted-foreground text-lg">From setup to on-watch in minutes — built around the way real crews operate.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-10 items-start">
                        {/* Step 1 */}
                        <div className="flex flex-col items-center text-center gap-6">
                            <div className="space-y-3">
                                <div className="w-8 h-8 rounded-full bg-[#1E3A8A] text-white flex items-center justify-center font-bold text-sm mx-auto">1</div>
                                <h3 className="text-xl font-bold">Create Your Vessel</h3>
                                <p className="text-muted-foreground leading-relaxed">Set up your yacht in seconds. Add your vessel name, configure watch rotation preferences, and invite your crew with a simple join code.</p>
                            </div>
                            <div className="rounded-2xl max-w-[280px] w-full mx-auto">
                                <img src="/screenshots/screenshot-setup.png" alt="Vessel setup screen" className="w-full h-auto object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.querySelector('span')!.style.display = 'block'; }} />
                                <span className="hidden p-4 text-center text-muted-foreground text-sm">Screenshot coming soon</span>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="flex flex-col items-center text-center gap-6">
                            <div className="space-y-3">
                                <div className="w-8 h-8 rounded-full bg-[#1E3A8A] text-white flex items-center justify-center font-bold text-sm mx-auto">2</div>
                                <h3 className="text-xl font-bold">Generate a Schedule</h3>
                                <p className="text-muted-foreground leading-relaxed">The captain sets the passage start time, watch length, and crew preferences. YachtWatch builds a fair, balanced rotation instantly — no spreadsheets required.</p>
                            </div>
                            <div className="rounded-2xl max-w-[280px] w-full mx-auto">
                                <img src="/screenshots/screenshot-schedule.png" alt="Schedule generation screen" className="w-full h-auto object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.querySelector('span')!.style.display = 'block'; }} />
                                <span className="hidden p-4 text-center text-muted-foreground text-sm">Screenshot coming soon</span>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="flex flex-col items-center text-center gap-6">
                            <div className="space-y-3">
                                <div className="w-8 h-8 rounded-full bg-[#1E3A8A] text-white flex items-center justify-center font-bold text-sm mx-auto">3</div>
                                <h3 className="text-xl font-bold">Crew Stay in Sync</h3>
                                <p className="text-muted-foreground leading-relaxed">Every crew member sees their upcoming watches on their phone in real time. Push notifications remind them before their watch begins — no one misses a shift.</p>
                            </div>
                            <div className="rounded-2xl max-w-[280px] w-full mx-auto">
                                <img src="/screenshots/screenshot-crew.png" alt="Crew watch view screen" className="w-full h-auto object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.querySelector('span')!.style.display = 'block'; }} />
                                <span className="hidden p-4 text-center text-muted-foreground text-sm">Screenshot coming soon</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Main Features */}
            <section id="features" className="py-24">
                <div className="container mx-auto px-4">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl font-bold mb-4">Built for Life at Sea</h2>
                        <p className="text-muted-foreground text-lg">Everything you need to manage your vessel's watch rotations efficiently, online or offline.</p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="p-6 rounded-2xl border border-border bg-card/50 hover:bg-card hover:shadow-lg transition-all">
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center mb-6">
                                <CalendarClock className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Smart Scheduling</h3>
                            <p className="text-muted-foreground">Automated rotation generators create fair, conflict-free schedules in seconds.</p>
                        </div>

                        {/* Feature 2 */}
                        <div className="p-6 rounded-2xl border border-border bg-card/50 hover:bg-card hover:shadow-lg transition-all">
                            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg flex items-center justify-center mb-6">
                                <Smartphone className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Mobile Companion</h3>
                            <p className="text-muted-foreground">Crew members carry their schedule in their pocket with our native mobile app.</p>
                        </div>

                        {/* Feature 3 */}
                        <div className="p-6 rounded-2xl border border-border bg-card/50 hover:bg-card hover:shadow-lg transition-all">
                            <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-lg flex items-center justify-center mb-6">
                                <Ship className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Vessel Management</h3>
                            <p className="text-muted-foreground">Manage multiple vessels, crew lists, and specialized roles from one dashboard.</p>
                        </div>

                        {/* Feature 4 */}
                        <div className="p-6 rounded-2xl border border-border bg-card/50 hover:bg-card hover:shadow-lg transition-all">
                            <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg flex items-center justify-center mb-6">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Role-Based Access</h3>
                            <p className="text-muted-foreground">Secure permissions for Captains, Heads of Department, and Crew members.</p>
                        </div>

                        {/* Feature 5 */}
                        <div className="p-6 rounded-2xl border border-border bg-card/50 hover:bg-card hover:shadow-lg transition-all">
                            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg flex items-center justify-center mb-6">
                                <Users className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Live Sync</h3>
                            <p className="text-muted-foreground">Changes made by the Captain are instantly reflected on all crew devices.</p>
                        </div>

                        {/* Feature 6 */}
                        <div className="p-6 rounded-2xl border border-border bg-card/50 hover:bg-card hover:shadow-lg transition-all">
                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg flex items-center justify-center mb-6">
                                <Anchor className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Yachting Standard</h3>
                            <p className="text-muted-foreground">Designed specifically for the unique workflows of the superyacht industry.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Contact Us Section */}
            <section id="contact" className="py-24 bg-muted/30">
                <div className="container mx-auto px-4 max-w-2xl">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold mb-4">Get in Touch</h2>
                        <p className="text-muted-foreground text-lg">Have a question or need help? We'd love to hear from you.</p>
                    </div>

                    <ContactForm />
                </div>
            </section>

            {/* CTA Bottom */}



            {/* Footer */}
            <footer className="py-12 border-t border-border bg-muted/20">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-2 opacity-80">
                            <Anchor className="w-5 h-5" />
                            <span className="font-semibold">YachtWatch</span>
                        </div>
                        <div className="flex gap-8 text-sm text-muted-foreground">
                            <a href="/privacy-policy" className="hover:text-foreground transition-colors">Privacy</a>
                            <a href="/terms-of-service" className="hover:text-foreground transition-colors">Terms</a>
                            <a href="mailto:yachtwatch@protonmail.com" className="hover:text-foreground transition-colors">Support</a>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            © {new Date().getFullYear()} YachtWatch. All rights reserved.
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
