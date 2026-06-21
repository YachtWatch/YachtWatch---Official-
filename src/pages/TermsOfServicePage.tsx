import { ArrowLeft, Anchor } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ProfileDropdown } from '../components/ui/ProfileDropdown';

export default function TermsOfServicePage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b bg-card sticky top-0 z-50 safe-area-pt">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-3xl">
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
            </header>

            <main className="container mx-auto px-4 py-12 max-w-3xl">
                {/* Title */}
                <div className="mb-10">
                    <h1 className="text-3xl font-extrabold tracking-tight text-foreground mb-2">
                        YachtWatch Terms of Service
                    </h1>
                    <p className="text-muted-foreground text-sm">Effective Date: March 2026</p>
                </div>

                <div className="space-y-8 text-sm leading-relaxed text-foreground/90">

                    <Section number="1" title="Acceptance of Terms">
                        <p>By accessing or using YachtWatch, you agree to be bound by these Terms of Service.</p>
                        <p className="mt-2">You must be at least 18 years old to use the Service.</p>
                        <p className="mt-2">YachtWatch is operated by the developer of the YachtWatch application, currently based in South Africa. The service may in the future be operated under a registered legal entity.</p>
                    </Section>

                    <Section number="2" title="Description of Service">
                        <p>YachtWatch generates watch schedules, distributes them to crew devices, and sends reminders.</p>
                        <p className="mt-2">The Service is informational only and is <strong>not</strong> a certified maritime system, navigational aid, safety system, SOLAS-compliant system, or official logbook.</p>
                    </Section>

                    <Section number="3" title="Maritime Compliance Disclaimer">
                        <p>YachtWatch does not verify compliance with STCW rest hours, flag state regulations, commercial labor standards, or fatigue management requirements.</p>
                        <p className="mt-2">Users are solely responsible for ensuring compliance with applicable maritime laws and regulations.</p>
                    </Section>

                    <Section number="4" title="Use at Your Own Risk">
                        <p>Use of the Service is entirely at the user's own risk.</p>
                        <p className="mt-2">Independent watch systems must always be maintained.</p>
                    </Section>

                    <Section number="5" title="Safety Responsibility">
                        <p>YachtWatch is not a safety system and must not be relied upon as the sole means of managing vessel watchkeeping or crew operations.</p>
                        <p className="mt-2">The vessel master or captain remains fully responsible for maintaining a proper navigational watch, complying with maritime regulations, and ensuring safe vessel operation at all times.</p>
                    </Section>

                    <Section number="6" title="Alerts & Availability Disclaimer">
                        <p>Push notifications may be delayed or fail due to connectivity limitations, device settings, or platform restrictions.</p>
                        <p className="mt-2">The Service is provided <strong>'AS IS'</strong> and <strong>'AS AVAILABLE'</strong> without warranties of any kind.</p>
                    </Section>

                    <Section number="7" title="User Accounts & Content">
                        <p>Users are responsible for all information and content they upload.</p>
                        <p className="mt-2">YachtWatch may suspend or terminate accounts at its discretion if the Service is misused or if these Terms are violated.</p>
                    </Section>

                    <Section number="8" title="Account Deletion">
                        <p>Users may delete their account at any time through the application or by contacting <a href="mailto:yachtwatch@protonmail.com" className="text-[#1E3A8A] hover:underline font-medium">yachtwatch@protonmail.com</a>.</p>
                        <p className="mt-2">Deleting an account will remove personal data in accordance with the YachtWatch Privacy Policy.</p>
                    </Section>

                    <Section number="9" title="Crew Data Responsibility">
                        <p>Passport data is visible only to the crew member and the vessel captain within the same vessel group.</p>
                        <p className="mt-2">Captains who export or store crew information outside the YachtWatch system act as independent data controllers and are responsible for their own handling and protection of that data.</p>
                    </Section>

                    <Section number="10" title="Subscriptions & Payments">
                        <p>Subscriptions are billed through the Apple App Store or Google Play Store depending on the user's device platform.</p>
                        <p className="mt-2">Subscriptions automatically renew unless cancelled through the user's App Store or Play Store account settings.</p>
                        <p className="mt-2">Pricing may change in the future, but any changes will not affect subscription periods that have already been purchased.</p>
                    </Section>

                    <Section number="11" title="Intellectual Property">
                        <p>All YachtWatch software, branding, and related intellectual property remain the exclusive property of YachtWatch.</p>
                        <p className="mt-2">Users may not copy, reverse engineer, or distribute the software without permission.</p>
                    </Section>

                    <Section number="12" title="Limitation of Liability">
                        <p>YachtWatch shall not be liable for any maritime incident, crew injury, vessel damage, regulatory violation, or other loss arising from the use or inability to use the Service.</p>
                        <p className="mt-2">Liability is capped at the greater of USD $100 or the total amount paid by the user for the Service in the previous 12 months.</p>
                    </Section>

                    <Section number="13" title="Service Modifications">
                        <p>YachtWatch reserves the right to modify, suspend, or discontinue any part of the Service at any time without liability.</p>
                    </Section>

                    <Section number="14" title="Governing Law & Arbitration">
                        <p>These Terms are governed by the laws of South Africa.</p>
                        <p className="mt-2">Any disputes shall be resolved through binding arbitration in Cape Town under the rules of the Arbitration Foundation of Southern Africa (AFSA).</p>
                    </Section>

                    <Section number="15" title="Contact Information">
                        <p>For legal or support inquiries please contact: <a href="mailto:yachtwatch@protonmail.com" className="text-[#1E3A8A] hover:underline font-medium">yachtwatch@protonmail.com</a></p>
                    </Section>

                </div>

                <div className="mt-12 pt-8 border-t border-border text-center text-xs text-muted-foreground">
                    © {new Date().getFullYear()} YachtWatch. All rights reserved.
                </div>
            </main>
        </div>
    );
}

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-border bg-card/50 p-6">
            <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#1E3A8A]/10 text-[#1E3A8A] text-xs font-bold shrink-0">
                    {number}
                </span>
                {title}
            </h2>
            <div className="text-muted-foreground">
                {children}
            </div>
        </div>
    );
}
