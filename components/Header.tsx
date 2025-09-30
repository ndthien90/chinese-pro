import React from 'react';

interface HeaderProps {
    isDarkMode: boolean;
    toggleTheme: () => void;
    speechRate: number;
    setSpeechRate: (rate: number) => void;
    speechLang: string;
    setSpeechLang: (lang: string) => void;
    availableVoices: SpeechSynthesisVoice[];
    selectedVoice: string;
    setVoice: (voiceName: string) => void;
}

const SunIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
);

const MoonIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
);

const LogoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.5 14.5v-9l6 4.5-6 4.5z"/>
    </svg>
);


const Header: React.FC<HeaderProps> = ({ 
    isDarkMode, 
    toggleTheme, 
    speechRate, 
    setSpeechRate, 
    speechLang,
    setSpeechLang,
    availableVoices, 
    selectedVoice, 
    setVoice 
}) => {
    return (
        <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 sm:px-6 bg-light-card dark:bg-dark-card shadow-md border-b border-light-border dark:border-dark-border">
            <div className="flex items-center space-x-3">
                <LogoIcon />
                <h1 className="text-xl font-bold text-primary">HSK Buddy</h1>
            </div>
            <div className="flex items-center space-x-4">
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-full hover:bg-light-border dark:hover:bg-dark-border transition-colors"
                    aria-label="Toggle theme"
                >
                    {isDarkMode ? <SunIcon /> : <MoonIcon />}
                </button>
                
                <div className="relative">
                    <select 
                        value={speechLang}
                        onChange={(e) => setSpeechLang(e.target.value)}
                        className="bg-transparent font-semibold py-2 px-3 border border-light-border dark:border-dark-border rounded-md appearance-none"
                        aria-label="Ngôn ngữ phát âm"
                    >
                        <option value="zh">ZH</option>
                        <option value="vi">VI</option>
                        <option value="en">EN</option>
                    </select>
                </div>

                <div className="relative">
                    <select
                        value={selectedVoice}
                        onChange={(e) => setVoice(e.target.value)}
                        disabled={availableVoices.length === 0}
                        className="bg-transparent font-semibold py-2 px-3 border border-light-border dark:border-dark-border rounded-md appearance-none disabled:opacity-50"
                        aria-label="Giọng đọc"
                    >
                        {availableVoices.length > 0 ? (
                            availableVoices.map(voice => (
                                <option key={voice.name} value={voice.name}>
                                    {voice.name} ({voice.lang})
                                </option>
                            ))
                        ) : (
                            <option>Không có giọng đọc</option>
                        )}
                    </select>
                </div>
                
                <div className="flex items-center space-x-2 text-sm">
                    <label htmlFor="speed-slider" className="font-semibold whitespace-nowrap">Tốc độ</label>
                    <input
                        type="range"
                        id="speed-slider"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={speechRate}
                        onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                        className="w-20 md:w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-dark-border accent-primary"
                        aria-label="Tốc độ đọc"
                    />
                    <span className="font-mono text-sm w-10 text-right">{speechRate.toFixed(1)}x</span>
                </div>
            </div>
        </header>
    );
};

export default Header;