import { ArrowLeft, Anchor } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ProfileDropdown } from '../components/ui/ProfileDropdown';

export default function PrivacyPolicyPage() {
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
                        YachtWatch Privacy Policy
                    </h1>
                    <p className="text-muted-foreground text-sm">Effective Date: March 2026</p>
                </div>

                <div className="space-y-8 text-sm leading-relaxed text-foreground/90">

                    <Section number="1" title="Responsible Party">
                        <p>YachtWatch is operated by the developer of the YachtWatch application, currently based in South Africa.</p>
                        <p className="mt-2">For privacy inquiries or data requests please contact: <a href="mailto:yachtwatch@protonmail.com" className="text-[#1E3A8A] hover:underline font-medium">yachtwatch@protonmail.com</a>.</p>
                    </Section>

                    <Section number="2" title="Data We Collect">
                        <p>YachtWatch may collect the following information:</p>
                        <ul className="mt-3 space-y-1 list-disc list-inside text-muted-foreground">
                            <li>Name and surname</li>
                            <li>Email address</li>
                            <li>Date of birth</li>
                            <li>Nationality</li>
                            <li>Optional passport number</li>
                            <li>IP address</li>
                            <li>Device type</li>
                            <li>Operating system version</li>
                            <li>Session identifiers</li>
                            <li>Subscription and purchase metadata</li>
                        </ul>
                    </Section>

                    <Section number="3" title="Legal Basis for Processing">
                        <p>Personal data is processed under the following legal bases:</p>
                        <ul className="mt-3 space-y-1 list-disc list-inside text-muted-foreground">
                            <li>Contractual necessity (to provide the service)</li>
                            <li>Legitimate interests (to operate and improve the platform)</li>
                            <li>Consent (for optional passport uploads)</li>
                            <li>Legal obligations where applicable</li>
                        </ul>
                    </Section>

                    <Section number="4" title="Data Hosting & Security">
                        <p>YachtWatch uses secure cloud infrastructure hosted in the European Union (EU West 1). Data is protected using industry standard security measures including encryption in transit and at rest.</p>
                        <p className="mt-2">While strong security practices are used, no system can guarantee absolute security.</p>
                    </Section>

                    <Section number="5" title="International Data Transfers">
                        <p>Your information may be transferred to and processed in countries other than your country of residence, including within the European Union where YachtWatch infrastructure is hosted.</p>
                    </Section>

                    <Section number="6" title="Data Retention">
                        <p>User data is retained while an account remains active. When a user deletes their account, associated personal data is permanently removed from active systems within a reasonable operational timeframe.</p>
                    </Section>

                    <Section number="7" title="Data Sharing">
                        <p>Certain information may be shared within vessel groups to allow the service to function properly. For example, captains and authorised crew members may view relevant crew information required for vessel operations.</p>
                        <p className="mt-2">Passport information is optional and, if provided, is only visible to the vessel captain and authorised crew members within the same vessel group.</p>
                        <p className="mt-2">Captains who export or store crew information outside the YachtWatch system act as independent data controllers responsible for their own handling of that data.</p>
                        <p className="mt-2 font-medium">YachtWatch does not sell personal data.</p>
                    </Section>

                    <Section number="8" title="Third-Party Services">
                        <p>YachtWatch uses trusted third-party service providers to operate the platform. These providers may process limited data on our behalf under strict security and confidentiality obligations.</p>
                        <p className="mt-2">Examples include cloud hosting providers, infrastructure services, and analytics or operational tools required to maintain the service.</p>
                    </Section>

                    <Section number="9" title="Payments & Subscriptions">
                        <p>Subscription payments are processed through the Apple App Store. YachtWatch may also use a subscription management platform to manage subscription status and entitlement information.</p>
                        <p className="mt-2 font-medium">YachtWatch does not store payment card details.</p>
                    </Section>

                    <Section number="10" title="Data Breach Notification">
                        <p>If a material data breach occurs that affects user information, YachtWatch will notify affected users in accordance with applicable laws and reasonable security practices.</p>
                    </Section>

                    <Section number="11" title="Marketing Communications">
                        <p>Users may receive essential service-related emails such as account notifications or operational messages.</p>
                        <p className="mt-2">YachtWatch may send marketing emails in the future. Users will always have the ability to opt out of marketing communications.</p>
                    </Section>

                    <Section number="12" title="User Rights">
                        <p>Users may request access to their personal data, request corrections, request deletion, or request an export of their data.</p>
                    </Section>

                    <Section number="13" title="Data Requests">
                        <p>To submit a privacy or data request, users may contact: <a href="mailto:yachtwatch@protonmail.com" className="text-[#1E3A8A] hover:underline font-medium">yachtwatch@protonmail.com</a></p>
                    </Section>

                    <Section number="14" title="Children">
                        <p>The YachtWatch service is not intended for individuals under the age of 18.</p>
                    </Section>

                    <Section number="15" title="Changes to This Policy">
                        <p>This privacy policy may be updated periodically to reflect operational, legal, or regulatory changes. Users will be notified of significant updates where required.</p>
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
