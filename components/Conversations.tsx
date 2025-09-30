import React, { useState, useEffect } from 'react';
import { ConversationLine, HSKLevel, ActiveView } from '../types';
import { fetchConversation, fetchMoreConversationLines } from '../services/geminiService';
import { addHistoryItem } from '../services/historyService';

const SpeakerIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 3.167A7.833 7.833 0 002.167 11c0 2.942 1.606 5.5 3.958 6.833l.25.139V11a.833.833 0 01.833-.833h1.667v6.528A7.833 7.833 0 0010 18.833a7.833 7.833 0 007.833-7.833A7.833 7.833 0 0010 3.167zM11.667 11V4.5a.833.833 0 111.666 0V11a.833.833 0 11-1.666 0z" />
    </svg>
);

const MicrophoneIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8h-1a6 6 0 11-12 0H3a7.001 7.001 0 006 6.93V17H7a1 1 0 100 2h6a1 1 0 100-2h-2v-2.07z" clipRule="evenodd" />
    </svg>
);


const Conversations: React.FC<{ speechRate: number; selectedVoice: string }> = ({ speechRate, selectedVoice }) => {
    const [level, setLevel] = useState<HSKLevel>(1);
    const [conversation, setConversation] = useState<ConversationLine[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [isRecording, setIsRecording] = useState<number | null>(null); // turn number
    const [practiceResult, setPracticeResult] = useState<{ turn: number, score: number } | null>(null);
    const [customTopic, setCustomTopic] = useState('');
    const [recognitionLang, setRecognitionLang] = useState('vi-VN');
    const [isListening, setIsListening] = useState(false);
    const [recognitionError, setRecognitionError] = useState('');

    useEffect(() => {
        const loadConversation = async () => {
            setIsLoading(true);
            setConversation([]);
            const data = await fetchConversation(level);
            setConversation(data);
            if (data.length > 0) {
                addHistoryItem(ActiveView.Conversations, `Hội thoại HSK ${level}: ${data[0].topic}`, data);
            }
            setIsLoading(false);
        };
        loadConversation();
    }, [level]);

    const playAudio = (text: string) => {
        // Stop any currently playing audio before starting a new one
        window.speechSynthesis.cancel(); 
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        utterance.rate = speechRate;
        if (selectedVoice) {
            const voice = window.speechSynthesis.getVoices().find(v => v.name === selectedVoice);
            if (voice) {
                utterance.voice = voice;
            }
        }
        window.speechSynthesis.speak(utterance);
    };

    const practiceSpeaking = (line: ConversationLine) => {
        // FIX: Cast window to any to access non-standard SpeechRecognition properties
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Trình duyệt của bạn không hỗ trợ nhận dạng giọng nói.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'zh-CN';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        setIsRecording(line.turn);
        setPracticeResult(null);

        recognition.start();

        recognition.onresult = (event: any) => {
            const spokenText = event.results[0][0].transcript;
            // Simple scoring simulation
            // FIX: Use `line.zh` instead of non-existent `line.hanzi`
            const score = spokenText.includes(line.zh.replace(/[.,?!]/g, '')) ? Math.round(Math.random() * 20 + 80) : Math.round(Math.random() * 50);
            setPracticeResult({ turn: line.turn, score });
            setIsRecording(null);
        };

        recognition.onspeechend = () => {
            recognition.stop();
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            setIsRecording(null);
            alert('Lỗi nhận dạng giọng nói. Hãy thử lại.');
        };
    };

    const handleSuggestMore = async () => {
        if (conversation.length === 0) return;

        setIsSuggesting(true);
        try {
            const newLines = await fetchMoreConversationLines(conversation, level);
            setConversation(prevConversation => [...prevConversation, ...newLines]);
        } catch (error) {
            console.error("Failed to suggest more conversation lines:", error);
            alert("Không thể tải thêm hội thoại. Vui lòng thử lại.");
        } finally {
            setIsSuggesting(false);
        }
    };
    
    const handleGenerateCustomConversation = async () => {
        if (!customTopic.trim()) return;

        setIsLoading(true);
        setConversation([]);
        try {
            const data = await fetchConversation(level, customTopic);
            setConversation(data);
             if (data.length > 0) {
                addHistoryItem(ActiveView.Conversations, `Hội thoại tùy chỉnh: ${data[0].topic}`, data);
            }
        } catch (error) {
            console.error("Failed to generate custom conversation:", error);
            alert("Không thể tạo hội thoại tùy chỉnh. Vui lòng thử lại.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleListen = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setRecognitionError('Trình duyệt của bạn không hỗ trợ nhận dạng giọng nói.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = recognitionLang;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        setIsListening(true);
        setRecognitionError('');

        recognition.start();

        recognition.onresult = (event: any) => {
            const spokenText = event.results[0][0].transcript;
            setCustomTopic(prev => (prev ? prev + ' ' : '') + spokenText);
        };

        recognition.onspeechend = () => recognition.stop();
        recognition.onend = () => setIsListening(false);

        recognition.onerror = (event: any) => {
            if (event.error !== 'no-speech') {
                console.error('Speech recognition error', event.error);
                setRecognitionError('Lỗi nhận dạng giọng nói.');
            }
            setIsListening(false);
        };
    };

    return (
        <div>
            <h2 className="text-3xl font-bold mb-6 text-primary">Hội thoại theo trình độ HSK</h2>
            <div className="flex flex-wrap gap-2 mb-4">
                {[1, 2, 3, 4, 5, 6].map(l => (
                    <button
                        key={l}
                        onClick={() => {
                            setLevel(l as HSKLevel);
                            setCustomTopic('');
                        }}
                        className={`px-4 py-2 rounded-md font-semibold transition-all ${
                            level === l ? 'bg-primary text-white shadow-md' : 'bg-light-card dark:bg-dark-card hover:bg-primary/10'
                        }`}
                    >
                        HSK {l}
                    </button>
                ))}
            </div>

            <div className="mb-6">
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={customTopic}
                        onChange={(e) => setCustomTopic(e.target.value)}
                        placeholder="Hoặc nhập chủ đề bạn muốn (ví dụ: đi mua sắm...)"
                        className="flex-grow w-full p-3 border border-light-border dark:border-dark-border rounded-md bg-light-bg dark:bg-dark-bg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                        onKeyDown={(e) => e.key === 'Enter' && handleGenerateCustomConversation()}
                    />
                    <button
                        onClick={handleGenerateCustomConversation}
                        disabled={isLoading || !customTopic.trim()}
                        className="px-6 py-3 bg-primary text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                    >
                        Tạo
                    </button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                    <button
                        onClick={handleListen}
                        disabled={isListening}
                        className={`p-2 rounded-full text-white shadow-md transition disabled:opacity-50 ${isListening ? 'bg-red-500 animate-pulse' : 'bg-accent hover:bg-emerald-600'}`}
                        aria-label="Nhập chủ đề bằng giọng nói"
                        title="Nhập chủ đề bằng giọng nói"
                    >
                        <MicrophoneIcon />
                    </button>
                    <select
                        value={recognitionLang}
                        onChange={(e) => setRecognitionLang(e.target.value)}
                        className="bg-light-bg dark:bg-dark-bg p-2 border border-light-border dark:border-dark-border rounded-md focus:ring-2 focus:ring-primary"
                    >
                        <option value="vi-VN">Nói Tiếng Việt</option>
                        <option value="zh-CN">说中文</option>
                    </select>
                    {recognitionError && <p className="text-red-500 text-sm ml-2">{recognitionError}</p>}
                </div>
            </div>

            {conversation.length > 0 && !isLoading && (
                <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">
                    Chủ đề: {conversation[0].topic}
                </h3>
            )}

            <div className="space-y-4">
                {isLoading ? (
                     Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="bg-light-card dark:bg-dark-card p-4 rounded-lg shadow-sm animate-pulse">
                            <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2 mb-3"></div>
                            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
                        </div>
                    ))
                ) : (
                    conversation.map(line => (
                        <div key={line.turn} className="bg-light-card dark:bg-dark-card p-4 rounded-lg shadow-sm">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-lg text-accent font-semibold">{line.zh}</p>
                                    <p className="text-gray-500 dark:text-gray-400">{line.pinyin}</p>
                                    <p className="italic mt-1">"{line.vi}"</p>
                                </div>
                                <div className="flex space-x-2 flex-shrink-0">
                                    <button onClick={() => playAudio(line.zh)} className="p-2 rounded-full hover:bg-accent/20 text-accent" title="Nghe"><SpeakerIcon /></button>
                                    <button onClick={() => practiceSpeaking(line)} disabled={isRecording !== null} className={`p-2 rounded-full hover:bg-primary/20 text-primary disabled:opacity-50 ${isRecording === line.turn ? 'animate-pulse' : ''}`} title="Luyện nói"><MicrophoneIcon /></button>
                                </div>
                            </div>
                             {practiceResult && practiceResult.turn === line.turn && (
                                <div className="mt-2 text-sm">
                                    <p>Kết quả luyện tập: <span className="font-bold">{practiceResult.score}/100</span></p>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {!isLoading && conversation.length > 0 && (
                <div className="mt-6 text-center">
                    <button
                        onClick={handleSuggestMore}
                        disabled={isSuggesting}
                        className="px-6 py-2 bg-accent text-white font-semibold rounded-md hover:bg-emerald-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center mx-auto"
                    >
                        {isSuggesting ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Đang gợi ý...
                            </>
                        ) : 'Gợi ý thêm hội thoại'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default Conversations;
