'use client';

import { useState, useLayoutEffect } from 'react';

function SunIcon({ className }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
    );
}

function MoonIcon({ className }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
    );
}

export default function ThemeToggle() {
    const [theme, setTheme] = useState('light');

    // Same mechanism as the simulator's toggle: classList directly on
    // document.documentElement, not a wrapper div, so Tailwind's dark:
    // variant actually has something to key off regardless of where in the
    // tree this button lives. useLayoutEffect instead of useEffect shrinks
    // (doesn't eliminate) the flash on load — full elimination needs a
    // blocking inline script in the root layout, before hydration.
    useLayoutEffect(() => {
        const saved = localStorage.getItem('theme');
        if (saved === 'dark' || saved === 'light') {
            setTheme(saved);
            document.documentElement.classList.toggle('dark', saved === 'dark');
        }
    }, []);

    function toggleTheme() {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        document.documentElement.classList.toggle('dark', next === 'dark');
        localStorage.setItem('theme', next);
    }

    const isDark = theme === 'dark';

    return (
        <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={isDark}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white/60 text-[#1F2E22] transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 dark:border-white/15 dark:bg-white/5 dark:text-[#ECF1E9] dark:hover:bg-white/10"
        >
            {isDark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
        </button>
    );
}