import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import { ActiveView } from './types';

// Import view components
import Translator from './components/Translator';
import Dictionary from './components/Dictionary';
import Vocabulary from './components/Vocabulary';
import Conversations from './components/Conversations';
import WritingPractice from './components/WritingPractice';
import Flashcards from './components/Flashcards';
import Quiz from './components/Quiz';
import HskExam from './components/HskExam';
import Pronunciation from './components/Pronunciation';
import History from './components/History';
import Settings from './components/Settings'; // Renamed from UsageStats

const App: React.FC = () => {
    const [activeView, setActiveView] = useState<ActiveView>(ActiveView.Translator);
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (localStorage.theme === 'dark') {
            return true;
        }
        if (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return true;
        }
        return false;
    });

    // Speech synthesis state
    const [speechRate, setSpeechRate] = useState(1);
    const [speechLang, setSpeechLang] = useState('zh');
    const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoice, setSelectedVoice] = useState('');

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.theme = 'dark';
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.theme = 'light';
        }
    }, [isDarkMode]);

    useEffect(() => {
        const updateVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            setAvailableVoices(voices);
            if (voices.length > 0 && !selectedVoice) {
                const defaultZhVoice = voices.find(v => v.lang.startsWith('zh'));
                if (defaultZhVoice) {
                    setSelectedVoice(defaultZhVoice.name);
                }
            }
        };

        window.speechSynthesis.onvoiceschanged = updateVoices;
        updateVoices();

        return () => {
            window.speechSynthesis.onvoiceschanged = null;
        };
    }, [selectedVoice]);

    const toggleTheme = () => setIsDarkMode(prev => !prev);

    const renderActiveView = () => {
        const speechProps = { speechRate, selectedVoice };
        switch (activeView) {
            case ActiveView.Translator:
                return <Translator {...speechProps} />;
            case ActiveView.Dictionary:
                return <Dictionary {...speechProps} />;
            case ActiveView.Vocabulary:
                return <Vocabulary {...speechProps} />;
            case ActiveView.Conversations:
                return <Conversations {...speechProps} />;
            case ActiveView.WritingPractice:
                return <WritingPractice />;
            case ActiveView.Flashcards:
                return <Flashcards />;
            case ActiveView.Quiz:
                return <Quiz />;
            case ActiveView.HskExam:
                return <HskExam {...speechProps} />;
            case ActiveView.Pronunciation:
                return <Pronunciation {...speechProps} />;
            case ActiveView.History:
                return <History {...speechProps} />;
            case ActiveView.Settings:
                return <Settings />;
            default:
                return <Translator {...speechProps} />;
        }
    };

    return (
        <div className={isDarkMode ? 'dark' : ''}>
            <div className="flex h-screen bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text font-sans">
                <Sidebar activeView={activeView} setActiveView={setActiveView} />
                <div className="flex flex-col flex-1">
                    <Header
                        isDarkMode={isDarkMode}
                        toggleTheme={toggleTheme}
                        speechRate={speechRate}
                        setSpeechRate={setSpeechRate}
                        speechLang={speechLang}
                        setSpeechLang={setSpeechLang}
        				availableVoices={availableVoices.filter(v => v.lang.startsWith(speechLang))}
                        selectedVoice={selectedVoice}
                        setVoice={setSelectedVoice}
                    />
                    <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                        {renderActiveView()}
                    </main>
                    <footer className="p-2 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-light-border dark:border-dark-border">
                        <span>
                            Hãy kết nối với{' '}
                            <a
                                href="https://www.phamphucanh.com/bio"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-primary hover:underline"
                            >
                                Phúc Anh MRT
                            </a>
                        </span>
                    </footer>
                </div>
            </div>
        </div>
    );
};

export default App;