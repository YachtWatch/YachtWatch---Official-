import { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import whatsappLogo from '../../assets/whatsapp-logo.png';

const isWeb = !Capacitor.isNativePlatform();

interface SpreadTheWordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const APP_LINK = 'https://join.yachtwatch.co';

const WHATSAPP_MESSAGE =
    `Hey! I've been using YachtWatch to manage watches and crew onboard — it's a game changer 🛥️ Check it out: ${APP_LINK}`;

export function SpreadTheWordModal({ isOpen, onClose }: SpreadTheWordModalProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(APP_LINK);
        } catch {
            const el = document.createElement('textarea');
            el.value = APP_LINK;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({ text: WHATSAPP_MESSAGE });
            } catch {
                // User cancelled — no action needed
            }
        } else {
            await handleCopy();
        }
    };

    const handleWhatsApp = () => {
        const waScheme = `whatsapp://send?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
        let appOpened = false;

        const onBlur = () => { appOpened = true; };
        window.addEventListener('blur', onBlur);

        window.location.href = waScheme;

        setTimeout(() => {
            window.removeEventListener('blur', onBlur);
            if (!appOpened) {
                handleNativeShare();
            }
        }, 1500);
    };

    const content = (
        <>
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-[#1B2A6B]">Spread the word</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Know someone who'd love YachtWatch?
                    </p>
                </div>
                <button
                    onClick={onClose}
                    aria-label="Close"
                    className="h-8 w-8 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors shrink-0 mt-0.5 ml-4"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            <div className="flex flex-col gap-3">
                <Button
                    variant="outline"
                    className="w-full h-12 gap-3 justify-start border-[#1B2A6B] text-[#1B2A6B] hover:bg-[#1B2A6B]/5 font-semibold text-sm"
                    onClick={handleCopy}
                >
                    {copied ? (
                        <>
                            <Check className="h-4 w-4 shrink-0" />
                            ✓ Copied!
                        </>
                    ) : (
                        <>
                            <Copy className="h-4 w-4 shrink-0" />
                            Copy Invite Link
                        </>
                    )}
                </Button>

                <Button
                    variant="outline"
                    className="w-full h-12 gap-3 justify-start border-[#1B2A6B] text-[#1B2A6B] hover:bg-[#1B2A6B]/5 font-semibold text-sm"
                    onClick={handleWhatsApp}
                >
                    <img src={whatsappLogo} alt="WhatsApp" className="h-5 w-5 shrink-0" style={{ imageRendering: 'auto' }} />
                    Share via WhatsApp
                </Button>
            </div>
        </>
    );

    // ── Web: inline-positioned floating dialog ─────────────────────────────────
    if (isWeb) {
        return (
            <>
                {/* Full-screen overlay */}
                <div
                    onClick={onClose}
                    style={{
                        position: 'fixed', top: 0, left: 0,
                        width: '100vw', height: '100vh',
                        background: 'rgba(0, 0, 0, 0.4)',
                        zIndex: 999,
                        opacity: isOpen ? 1 : 0,
                        pointerEvents: isOpen ? 'auto' : 'none',
                        transition: 'opacity 200ms ease',
                    }}
                />
                {/* Centered dialog */}
                <div
                    aria-modal="true"
                    role="dialog"
                    style={{
                        position: 'fixed', top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 420, maxWidth: '90vw',
                        borderRadius: 16, background: 'white',
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
                        padding: 32, zIndex: 1000,
                        opacity: isOpen ? 1 : 0,
                        pointerEvents: isOpen ? 'auto' : 'none',
                        transition: 'opacity 200ms ease',
                    }}
                >
                    {content}
                </div>
            </>
        );
    }

    // ── Native (iOS / Android): safe-area-aware centered dialog ───────────────
    return (
        <div
            aria-modal="true"
            role="dialog"
            className={cn(
                'fixed inset-0 z-[90] flex items-center justify-center',
                'transition-opacity duration-200',
                isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            )}
        >
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div
                className={cn(
                    'relative z-10 bg-white rounded-2xl shadow-2xl',
                    'w-[85vw] max-w-[420px] p-8',
                    'transition-all duration-200',
                    isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
                )}
            >
                {content}
            </div>
        </div>
    );
}
