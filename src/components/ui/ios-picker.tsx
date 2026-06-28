import { useRef, useEffect, useState } from 'react';
import { cn } from '../../lib/utils';

interface IOSEntry {
    label: string;
    value: string | number;
}

interface IOSPickerProps {
    value: string | number;
    options: IOSEntry[];
    onChange: (value: string | number) => void;
    className?: string;
}

export function IOSPicker({ value, options, onChange, className }: IOSPickerProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const itemHeight = 40; // Height of each item in pixels
    const [, setIsScrolling] = useState(false);
    const scrollTimeout = useRef<NodeJS.Timeout>();

    // Scroll to initial value
    useEffect(() => {
        if (scrollRef.current) {
            const index = options.findIndex(o => o.value === value);
            if (index !== -1) {
                scrollRef.current.scrollTop = index * itemHeight;
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount

    const handleScroll = () => {
        setIsScrolling(true);
        clearTimeout(scrollTimeout.current);

        scrollTimeout.current = setTimeout(() => {
            setIsScrolling(false);
            if (!scrollRef.current) return;

            const scrollTop = scrollRef.current.scrollTop;
            const index = Math.round(scrollTop / itemHeight);

            // Snap to nearest
            const finalScrollTop = index * itemHeight;
            scrollRef.current.scrollTo({
                top: finalScrollTop,
                behavior: 'smooth'
            });

            if (options[index]) {
                onChange(options[index].value);
            }
        }, 150); // Debounce snap
    };

    return (
        <div className={cn("relative h-[200px] overflow-hidden bg-background rounded-xl border select-none", className)}>
            {/* Highlight Bar */}
            <div className="absolute top-[80px] left-0 right-0 h-[40px] bg-primary/10 border-t border-b border-primary/20 pointer-events-none z-10" />

            {/* Gradient Overlays */}
            <div className="absolute top-0 left-0 right-0 h-[80px] bg-gradient-to-b from-background to-transparent pointer-events-none z-10" />
            <div className="absolute bottom-0 left-0 right-0 h-[80px] bg-gradient-to-t from-background to-transparent pointer-events-none z-10" />

            <div
                ref={scrollRef}
                className="h-full overflow-y-auto no-scrollbar snap-y snap-mandatory py-[80px]"
                onScroll={handleScroll}
            >
                {options.map((option) => (
                    <div
                        key={option.value}
                        className={cn(
                            "h-[40px] flex items-center justify-center text-lg transition-transform duration-200 snap-center cursor-pointer",
                            option.value === value ? "font-bold text-foreground scale-110" : "text-muted-foreground scale-95"
                        )}
                        onClick={() => {
                            if (scrollRef.current) {
                                const index = options.indexOf(option);
                                scrollRef.current.scrollTo({
                                    top: index * itemHeight,
                                    behavior: 'smooth'
                                });
                                onChange(option.value);
                            }
                        }}
                    >
                        {option.label}
                    </div>
                ))}
            </div>
        </div>
    );
}
