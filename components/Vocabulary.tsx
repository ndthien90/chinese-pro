import React, { useState, useEffect, useCallback } from 'react';
import { HSKLevel, VocabularyWord, Flashcard } from '../types';
import { fetchHskVocabulary } from '../services/geminiService';

const SpeakerIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 3.167A7.833 7.833 0 002.167 11c0 2.942 1.606 5.5 3.958 6.833l.25.139V11a.833.833 0 01.833-.833h1.667v6.528A7.833 7.833 0 0010 18.833a7.833 7.833 0 007.833-7.833A7.833 7.833 0 0010 3.167zM11.667 11V4.5a.833.833 0 111.666 0V11a.833.833 0 11-1.666 0z" />
    </svg>
);

const Vocabulary: React.FC<{ speechRate: number; selectedVoice: string }> = ({ speechRate, selectedVoice }) => {
    const [level, setLevel] = useState<HSKLevel>(1);
    const [words, setWords] = useState<VocabularyWord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);

    const loadWords = useCallback(async () => {
        setIsLoading(true);
        const fetchedWords = await fetchHskVocabulary(level, page);
        setWords(fetchedWords);
        setIsLoading(false);
    }, [level, page]);

    useEffect(() => {
        loadWords();
    }, [loadWords]);
    
    const handleLevelChange = (newLevel: HSKLevel) => {
        setLevel(newLevel);
        setPage(1);
    };

    const handleAddToFlashcards = (word: VocabularyWord) => {
        const newCard: Flashcard = {
            word,
            reviewDate: new Date().toISOString(),
            interval: 1,
            easeFactor: 2.5
        };
        const existingFlashcards: Flashcard[] = JSON.parse(localStorage.getItem('flashcards') || '[]');
        const isAlreadyAdded = existingFlashcards.some(card => card.word.hanzi === word.hanzi);
        
        if (!isAlreadyAdded) {
            const updatedFlashcards = [...existingFlashcards, newCard];
            localStorage.setItem('flashcards', JSON.stringify(updatedFlashcards));
            alert(`'${word.hanzi}' đã được thêm vào Flashcards!`);
        } else {
            alert(`'${word.hanzi}' đã có trong Flashcards.`);
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
    
    const LoadingRow = () => (
      <tr className="animate-pulse">
        <td className="p-3"><div className="h-5 bg-gray-300 dark:bg-gray-600 rounded"></div></td>
        <td className="p-3"><div className="h-5 bg-gray-300 dark:bg-gray-600 rounded"></div></td>
        <td className="p-3"><div className="h-5 bg-gray-300 dark:bg-gray-600 rounded"></div></td>
        <td className="p-3"><div className="h-5 bg-gray-300 dark:bg-gray-600 rounded"></div></td>
        <td className="p-3"><div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-10"></div></td>
      </tr>
    );

    return (
        <div>
            <h2 className="text-3xl font-bold mb-6 text-primary">Từ vựng HSK</h2>
            <div className="flex space-x-2 mb-6">
                {[1, 2, 3, 4, 5, 6].map(l => (
                    <button
                        key={l}
                        onClick={() => handleLevelChange(l as HSKLevel)}
                        className={`px-4 py-2 rounded-md font-semibold transition-all ${
                            level === l ? 'bg-primary text-white shadow-md' : 'bg-light-card dark:bg-dark-card hover:bg-primary/10'
                        }`}
                    >
                        HSK {l}
                    </button>
                ))}
            </div>

            <div className="overflow-x-auto bg-light-card dark:bg-dark-card rounded-lg shadow-lg">
                <table className="w-full text-left">
                    <thead className="border-b border-light-border dark:border-dark-border">
                        <tr>
                            <th className="p-3">Hán tự</th>
                            <th className="p-3">Pinyin</th>
                            <th className="p-3">Nghĩa</th>
                            <th className="p-3">Ví dụ</th>
                            <th className="p-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            Array.from({ length: 10 }).map((_, i) => <LoadingRow key={i} />)
                        ) : (
                            words.map((word, index) => (
                                <tr key={index} className="border-b border-light-border dark:border-dark-border last:border-b-0 hover:bg-black/5 dark:hover:bg-white/5">
                                    <td className="p-3 text-lg font-semibold">{word.hanzi}</td>
                                    <td className="p-3 text-gray-600 dark:text-gray-400">{word.pinyin}</td>
                                    <td className="p-3">{word.meaning_vi} ({word.pos})</td>
                                    <td className="p-3 text-sm">
                                        <div className="flex items-center space-x-1">
                                            <span>{word.example_zh}</span>
                                            <button onClick={() => playAudio(word.example_zh)} className="p-1 rounded-full hover:bg-accent/20 text-accent" title="Nghe ví dụ">
                                                <SpeakerIcon />
                                            </button>
                                        </div>
                                        <div className="text-gray-500">{word.example_pinyin}</div>
                                        <div className="italic">"{word.example_vi}"</div>
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center space-x-2">
                                          <button onClick={() => playAudio(word.hanzi)} className="p-2 rounded-full hover:bg-accent/20 text-accent" title="Nghe"><SpeakerIcon /></button>
                                          <button onClick={() => handleAddToFlashcards(word)} className="px-3 py-1 text-sm bg-accent text-white rounded-full hover:bg-emerald-600 transition" title="Thêm vào Flashcards">+</button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
             {/* Simple Pagination - In a real app, you'd check if there's a next page */}
             <div className="mt-6 flex justify-center space-x-4">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || isLoading} className="px-4 py-2 bg-light-card dark:bg-dark-card rounded-md disabled:opacity-50">Trước</button>
                <span className="p-2">Trang {page}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={isLoading} className="px-4 py-2 bg-light-card dark:bg-dark-card rounded-md disabled:opacity-50">Sau</button>
            </div>
        </div>
    );
};

export default Vocabulary;