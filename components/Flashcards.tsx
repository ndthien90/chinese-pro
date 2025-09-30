
import React, { useState, useEffect, useCallback } from 'react';
import { Flashcard } from '../types';

const Flashcards: React.FC = () => {
    const [deck, setDeck] = useState<Flashcard[]>([]);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [dueCards, setDueCards] = useState<Flashcard[]>([]);
    
    const loadDueCards = useCallback(() => {
        const allCards: Flashcard[] = JSON.parse(localStorage.getItem('flashcards') || '[]');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = allCards.filter(card => new Date(card.reviewDate) <= today);
        setDueCards(due);
        setCurrentCardIndex(0);
        setIsFlipped(false);
    }, []);

    useEffect(() => {
        loadDueCards();
    }, [loadDueCards]);

    const handleFlip = () => setIsFlipped(!isFlipped);

    const updateCard = (difficulty: 'hard' | 'good' | 'easy') => {
        if (currentCardIndex >= dueCards.length) return;

        const card = dueCards[currentCardIndex];
        let newInterval;
        switch(difficulty) {
            case 'hard':
                newInterval = 1; // Review again tomorrow
                break;
            case 'good':
                newInterval = card.interval * 2; // Double the interval
                break;
            case 'easy':
                newInterval = card.interval * 4; // Quadruple the interval
                break;
        }

        const newReviewDate = new Date();
        newReviewDate.setDate(newReviewDate.getDate() + Math.round(newInterval));
        
        const updatedCard: Flashcard = { ...card, interval: newInterval, reviewDate: newReviewDate.toISOString() };

        // Update in localStorage
        const allCards: Flashcard[] = JSON.parse(localStorage.getItem('flashcards') || '[]');
        const cardIndexInAll = allCards.findIndex(c => c.word.hanzi === card.word.hanzi);
        if (cardIndexInAll !== -1) {
            allCards[cardIndexInAll] = updatedCard;
            localStorage.setItem('flashcards', JSON.stringify(allCards));
        }

        // Move to next card
        setIsFlipped(false);
        setCurrentCardIndex(prev => prev + 1);
    };

    const currentCard = dueCards.length > 0 && currentCardIndex < dueCards.length ? dueCards[currentCardIndex] : null;

    return (
        <div>
            <h2 className="text-3xl font-bold mb-6 text-primary">Flashcards ôn tập</h2>
            <div className="max-w-xl mx-auto">
                <div className="mb-4">
                  <p>{dueCards.length > 0 ? `Cần ôn: ${dueCards.length} thẻ.` : 'Bạn đã ôn hết thẻ cho hôm nay!'}</p>
                  <div className="w-full bg-light-border dark:bg-dark-border rounded-full h-2.5 mt-2">
                    <div className="bg-accent h-2.5 rounded-full" style={{ width: `${dueCards.length > 0 ? (currentCardIndex / dueCards.length) * 100 : 100}%` }}></div>
                  </div>
                </div>

                {currentCard ? (
                    <div>
                        <div 
                            className="w-full h-64 p-6 rounded-lg shadow-2xl flex items-center justify-center cursor-pointer bg-light-card dark:bg-dark-card"
                            onClick={handleFlip}
                            style={{ perspective: '1000px' }}
                        >
                            <div className={`relative w-full h-full transition-transform duration-500`} style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : '' }}>
                                {/* Front */}
                                <div className="absolute w-full h-full flex items-center justify-center" style={{ backfaceVisibility: 'hidden' }}>
                                    <p className="text-6xl font-bold">{currentCard.word.hanzi}</p>
                                </div>
                                {/* Back */}
                                <div className="absolute w-full h-full p-4 bg-light-card dark:bg-dark-card rounded-lg flex flex-col items-center justify-center" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                                    <p className="text-2xl text-accent">{currentCard.word.pinyin}</p>
                                    <p className="text-xl font-semibold mt-2">{currentCard.word.meaning_vi}</p>
                                    <p className="text-sm mt-4 text-center">{currentCard.word.example_zh}</p>
                                </div>
                            </div>
                        </div>
                        {isFlipped && (
                            <div className="mt-6 flex justify-around">
                                <button onClick={() => updateCard('hard')} className="px-6 py-3 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition">Khó</button>
                                <button onClick={() => updateCard('good')} className="px-6 py-3 bg-yellow-500 text-white rounded-lg font-bold hover:bg-yellow-600 transition">Vừa</button>
                                <button onClick={() => updateCard('easy')} className="px-6 py-3 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition">Dễ</button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center p-10 bg-light-card dark:bg-dark-card rounded-lg">
                        <p className="text-xl">🎉 Chúc mừng! 🎉</p>
                        <p>Bạn đã hoàn thành tất cả các thẻ cần ôn hôm nay.</p>
                        <button onClick={loadDueCards} className="mt-4 px-4 py-2 bg-primary text-white rounded">Kiểm tra lại</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Flashcards;
