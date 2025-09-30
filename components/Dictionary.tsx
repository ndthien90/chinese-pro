import React, { useState } from 'react';
import { TranslationResult, ActiveView } from '../types';
import { fetchDictionaryEntry } from '../services/geminiService';
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

const Dictionary: React.FC<{ speechRate: number; selectedVoice: string }> = ({ speechRate, selectedVoice }) => {
    const [inputText, setInputText] = useState('');
    const [result, setResult] = useState<TranslationResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [recognitionLang, setRecognitionLang] = useState('vi-VN');
    const [isListening, setIsListening] = useState(false);
    const [recognitionError, setRecognitionError] = useState('');

    const handleSearch = async () => {
        if (!inputText.trim()) return;
        setIsLoading(true);
        setError('');
        setResult(null);
        try {
            const entry = await fetchDictionaryEntry(inputText);
            setResult(entry);
            addHistoryItem(ActiveView.Dictionary, `Đã tra từ: "${inputText}"`, entry);
        } catch (err) {
            setError('Không thể tra từ này. Vui lòng thử lại với từ khác.');
        } finally {
            setIsLoading(false);
        }
    };

    const playAudio = (text: string) => {
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
            setInputText(prev => (prev ? prev + ' ' : '') + spokenText);
        };

        recognition.onspeechend = () => recognition.stop();
        recognition.onend = () => setIsListening(false);

        recognition.onerror = (event: any) => {
            if (event.error !== 'no-speech') {
                console.error('Speech recognition error', event.error);
                setRecognitionError('Lỗi nhận dạng giọng nói. Hãy thử lại.');
            }
            setIsListening(false);
        };
    };

    const LoadingSkeleton = () => (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/3"></div>
        <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
        <div className="space-y-2 pt-4">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
        </div>
      </div>
    );

    return (
        <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 text-primary">Từ điển Việt ↔ Trung</h2>
            <div className="bg-light-card dark:bg-dark-card p-6 rounded-lg shadow-lg">
                <div className="flex items-center gap-4">
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Nhập từ cần tra..."
                        className="flex-grow w-full p-3 border border-light-border dark:border-dark-border rounded-md bg-light-bg dark:bg-dark-bg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                        aria-label="Từ cần tra"
                    />
                    <button
                        onClick={handleSearch}
                        disabled={isLoading}
                        className="px-6 py-3 bg-primary text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading ? 'Đang tra...' : 'Tra từ'}
                    </button>
                </div>
                 <div className="mt-4 flex items-center gap-2">
                    <button
                        onClick={handleListen}
                        disabled={isListening}
                        className={`p-2 rounded-full text-white shadow-md transition disabled:opacity-50 ${isListening ? 'bg-red-500 animate-pulse' : 'bg-primary hover:bg-blue-700'}`}
                        aria-label="Nhập bằng giọng nói"
                        title="Nhập bằng giọng nói"
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

            {error && <p className="mt-4 text-center text-red-500">{error}</p>}
            
            <div className="mt-8">
                {isLoading && <LoadingSkeleton />}
                {result && (
                    <div className="bg-light-card dark:bg-dark-card p-6 rounded-lg shadow-lg">
                        <div className="border-b border-light-border dark:border-dark-border pb-4 mb-4">
                            <div className="flex items-center space-x-3">
                                <p className="text-4xl font-semibold text-accent">{result.hanzi}</p>
                                <button onClick={() => playAudio(result.hanzi)} className="p-2 rounded-full hover:bg-accent/20 text-accent" title="Nghe">
                                    <SpeakerIcon />
                                </button>
                            </div>
                            <p className="text-lg text-gray-500 dark:text-gray-400">{result.pinyin}</p>
                            <p className="text-xl font-medium mt-2 whitespace-pre-wrap">{result.vi_meaning}</p>
                        </div>
                        
                        <div className="mb-4">
                            <h4 className="font-bold text-lg mb-2">Ví dụ:</h4>
                            <ul className="space-y-3">
                                {result.examples.map((ex, index) => (
                                    <li key={index}>
                                        <div className="flex items-center space-x-2">
                                            <p className="text-md text-accent">{ex.zh}</p>
                                            <button onClick={() => playAudio(ex.zh)} className="p-1 rounded-full hover:bg-accent/20 text-accent" title="Nghe">
                                                <SpeakerIcon />
                                            </button>
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{ex.pinyin}</p>
                                        <p className="text-sm italic">"{ex.vi}"</p>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {result.grammar_notes && result.grammar_notes.length > 0 && (
                            <div>
                                <h4 className="font-bold text-lg mb-2">Ghi chú / Từ liên quan:</h4>
                                <ul className="list-disc list-inside space-y-1">
                                    {result.grammar_notes.map((note, index) => (
                                        <li key={index}>{note}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dictionary;