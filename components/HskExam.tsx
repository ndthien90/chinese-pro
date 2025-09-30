import React, { useState, useEffect, useCallback } from 'react';
import { HSKLevel, ExamQuestion, ActiveView, HskExamResult } from '../types';
import { fetchHskExam } from '../services/geminiService';
import { addHistoryItem } from '../services/historyService';

const SpeakerIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 3.167A7.833 7.833 0 002.167 11c0 2.942 1.606 5.5 3.958 6.833l.25.139V11a.833.833 0 01.833-.833h1.667v6.528A7.833 7.833 0 0010 18.833a7.833 7.833 0 007.833-7.833A7.833 7.833 0 0010 3.167zM11.667 11V4.5a.833.833 0 111.666 0V11a.833.833 0 11-1.666 0z" />
    </svg>
);

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1 text-green-500" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
);

const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1 text-red-500" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
);

const EXAM_DURATION_SECONDS = 50 * 60; // 50 minutes for all levels
const TOTAL_QUESTIONS = 40;

const HskExam: React.FC<{ speechRate: number; selectedVoice: string }> = ({ speechRate, selectedVoice }) => {
    const [level, setLevel] = useState<HSKLevel>(1);
    const [questions, setQuestions] = useState<ExamQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<(string | null)[]>([]);
    const [score, setScore] = useState(0);
    const [examState, setExamState] = useState<'setup' | 'playing' | 'finished'>('setup');
    const [isLoading, setIsLoading] = useState(false);
    const [timeLeft, setTimeLeft] = useState(EXAM_DURATION_SECONDS);

    const finishExam = useCallback(() => {
        let finalScore = 0;
        questions.forEach((q, index) => {
            if (userAnswers[index] === q.correct_answer) {
                finalScore++;
            }
        });
        setScore(finalScore);
        setExamState('finished');

        // Save to history
        const examResult: HskExamResult = {
            level,
            score: finalScore,
            totalQuestions: questions.length,
            questions,
            userAnswers,
        };
        addHistoryItem(
            ActiveView.HskExam,
            `Bài thi HSK ${level} - Điểm: ${finalScore}/${questions.length}`,
            examResult
        );
    }, [questions, userAnswers, level]);

    useEffect(() => {
        if (examState !== 'playing') return;

        if (timeLeft <= 0) {
            finishExam();
            return;
        }

        const timerId = setInterval(() => {
            setTimeLeft(prevTime => prevTime - 1);
        }, 1000);

        return () => clearInterval(timerId);
    }, [examState, timeLeft, finishExam]);

    const startExam = async () => {
        setIsLoading(true);
        try {
            const examQuestions = await fetchHskExam(level);
            setQuestions(examQuestions);
            setUserAnswers(Array(examQuestions.length).fill(null));
            setCurrentQuestionIndex(0);
            setScore(0);
            setTimeLeft(EXAM_DURATION_SECONDS);
            setExamState('playing');
        } catch (error) {
            console.error("Failed to start exam:", error);
            alert("Không thể tạo bài thi. Vui lòng thử lại.");
            setExamState('setup');
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
            if (voice) utterance.voice = voice;
        }
        window.speechSynthesis.speak(utterance);
    };

    const handleAnswer = (answer: string) => {
        const newAnswers = [...userAnswers];
        newAnswers[currentQuestionIndex] = answer;
        setUserAnswers(newAnswers);
    };

    const handleNavigation = (direction: 'next' | 'prev' | 'jump', index?: number) => {
        if (direction === 'next' && currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else if (direction === 'prev' && currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
        } else if (direction === 'jump' && index !== undefined) {
            setCurrentQuestionIndex(index);
        }
    };
    
    const handleSubmit = () => {
        const unansweredCount = userAnswers.filter(a => a === null).length;
        const confirmationMessage = unansweredCount > 0
            ? `Bạn còn ${unansweredCount} câu chưa trả lời. Bạn có chắc chắn muốn nộp bài không?`
            : 'Bạn có chắc chắn muốn nộp bài không?';
            
        if (window.confirm(confirmationMessage)) {
            finishExam();
        }
    };

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    };

    const resetExam = () => setExamState('setup');

    if (examState === 'setup') {
        return (
            <div>
                <h2 className="text-3xl font-bold mb-6 text-primary">Thi Thử HSK</h2>
                <div className="text-center p-8 bg-light-card dark:bg-dark-card rounded-lg shadow-lg">
                    <h3 className="text-2xl font-semibold mb-2">Quy định chung</h3>
                    <p className="mb-6 text-gray-600 dark:text-gray-400">Tất cả các cấp độ thi đều có <strong>{TOTAL_QUESTIONS} câu hỏi</strong> và thời gian làm bài là <strong>{EXAM_DURATION_SECONDS / 60} phút</strong>.</p>
                    <h3 className="text-xl font-semibold mb-6">Chọn cấp độ HSK bạn muốn thi:</h3>
                    <div className="flex justify-center flex-wrap gap-3 mb-8">
                        {[1, 2, 3, 4, 5, 6].map(l => (
                            <button key={l} onClick={() => setLevel(l as HSKLevel)} className={`px-5 py-3 rounded-full font-semibold transition-all text-lg shadow-sm ${level === l ? 'bg-primary text-white scale-110 ring-4 ring-primary/30' : 'bg-light-bg dark:bg-dark-bg hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                                HSK {l}
                            </button>
                        ))}
                    </div>
                    <button onClick={startExam} disabled={isLoading} className="px-10 py-4 bg-accent text-white font-bold rounded-lg text-xl hover:bg-emerald-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed">
                        {isLoading ? 'Đang soạn đề...' : 'Bắt đầu thi'}
                    </button>
                </div>
            </div>
        );
    }

    if (examState === 'playing' && questions.length > 0) {
        const currentQuestion = questions[currentQuestionIndex];
        return (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
                {/* Question Area */}
                <div className="lg:col-span-3 bg-light-card dark:bg-dark-card p-6 rounded-lg shadow-lg flex flex-col">
                    <div className="flex-grow">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-primary">Câu {currentQuestionIndex + 1}: {currentQuestion.section}</h3>
                            <div className={`text-2xl font-bold p-2 rounded-md ${timeLeft < 60 ? 'text-red-500 animate-pulse' : ''}`}>
                                {formatTime(timeLeft)}
                            </div>
                        </div>

                        {currentQuestion.section === 'Nghe hiểu' && currentQuestion.audio_script && (
                            <div className="mb-4 flex items-center gap-4 p-3 bg-light-bg dark:bg-dark-bg rounded-md">
                                <button onClick={() => playAudio(currentQuestion.audio_script!)} className="p-3 rounded-full bg-primary text-white hover:bg-blue-700">
                                    <SpeakerIcon />
                                </button>
                                <p className="text-gray-600 dark:text-gray-400 italic">Nhấn để nghe hội thoại/câu hỏi.</p>
                            </div>
                        )}
                        <p className="text-xl mb-6 font-semibold whitespace-pre-wrap min-h-[5rem]">{currentQuestion.question_text}</p>
                        
                        <div className="space-y-3">
                            {currentQuestion.options.map((option, index) => (
                                <button 
                                    key={index} 
                                    onClick={() => handleAnswer(option)} 
                                    className={`w-full text-left p-4 rounded-lg shadow-sm transition-all border-2 ${
                                        userAnswers[currentQuestionIndex] === option
                                            ? 'bg-primary/20 border-primary'
                                            : 'bg-light-bg dark:bg-dark-bg border-transparent hover:border-primary/50'
                                    }`}
                                >
                                    <span className="font-semibold mr-2">{String.fromCharCode(65 + index)}.</span>{option.replace(/^[A-D]\.\s*/, '')}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-8 flex justify-between items-center border-t border-light-border dark:border-dark-border pt-4">
                        <button onClick={() => handleNavigation('prev')} disabled={currentQuestionIndex === 0} className="px-6 py-2 bg-gray-200 dark:bg-gray-600 rounded-md disabled:opacity-50">Câu trước</button>
                        <button onClick={handleSubmit} className="px-8 py-3 bg-accent text-white font-bold rounded-lg hover:bg-emerald-600 transition">Nộp bài</button>
                        <button onClick={() => handleNavigation('next')} disabled={currentQuestionIndex === questions.length - 1} className="px-6 py-2 bg-gray-200 dark:bg-gray-600 rounded-md disabled:opacity-50">Câu sau</button>
                    </div>
                </div>

                {/* Navigation Palette */}
                <div className="bg-light-card dark:bg-dark-card p-4 rounded-lg shadow-lg">
                    <h4 className="font-bold text-center mb-4">Danh sách câu hỏi</h4>
                    <div className="grid grid-cols-5 gap-2">
                        {questions.map((_, index) => {
                            const isAnswered = userAnswers[index] !== null;
                            const isCurrent = index === currentQuestionIndex;
                            let buttonClass = 'bg-light-bg dark:bg-dark-bg hover:border-primary/50 border-2 border-transparent';
                            if (isAnswered) {
                                buttonClass = 'bg-accent/80 text-white border-2 border-transparent';
                            }
                            if (isCurrent) {
                                buttonClass = 'bg-primary text-white ring-2 ring-offset-2 ring-primary ring-offset-light-card dark:ring-offset-dark-card border-2 border-transparent';
                            }
                            return (
                                <button key={index} onClick={() => handleNavigation('jump', index)} className={`w-10 h-10 rounded-md font-bold transition-all flex items-center justify-center ${buttonClass}`}>
                                    {index + 1}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    if (examState === 'finished') {
        return (
            <div className="max-w-4xl mx-auto">
                <h2 className="text-3xl font-bold mb-6 text-primary text-center">Kết quả bài thi HSK {level}</h2>
                <div className="text-center p-8 bg-light-card dark:bg-dark-card rounded-lg shadow-xl mb-8">
                    <h3 className="text-2xl font-bold">Hoàn thành!</h3>
                    <p className="text-5xl my-4">Điểm của bạn: <span className="text-accent font-bold">{score} / {questions.length}</span></p>
                    <button onClick={resetExam} className="px-8 py-3 bg-primary text-white font-bold rounded-lg hover:bg-blue-700 transition">
                        Làm bài thi khác
                    </button>
                </div>
                
                <div>
                    <h3 className="text-2xl font-bold mb-4">Phân tích lỗi sai</h3>
                    <div className="space-y-4">
                        {questions.map((q, index) => {
                            const userAnswer = userAnswers[index];
                            const isCorrect = userAnswer === q.correct_answer;
                            if (isCorrect) return null;

                            return (
                                <div key={index} className="p-4 bg-light-card dark:bg-dark-card rounded-lg border-l-4 border-red-500">
                                    <p className="font-semibold mb-2">Câu {index + 1}: {q.question_text}</p>
                                    {userAnswer ? (
                                        <p><XIcon />Bạn đã chọn: <span className="text-red-500 font-semibold">{userAnswer}</span></p>
                                    ) : (
                                        <p><XIcon />Bạn đã không trả lời câu này.</p>
                                    )}
                                    <p><CheckIcon />Đáp án đúng: <span className="text-green-500 font-semibold">{q.correct_answer}</span></p>
                                    <div className="mt-2 pt-2 border-t border-light-border dark:border-dark-border text-sm text-gray-600 dark:text-gray-400">
                                        <p><span className="font-semibold">Giải thích:</span> {q.explanation}</p>
                                    </div>
                                </div>
                            );
                        })}
                         {score === questions.length && <p className="text-center text-green-500 text-lg">🎉 Xuất sắc! Bạn đã trả lời đúng tất cả các câu hỏi.</p>}
                    </div>
                </div>
            </div>
        );
    }
    
    return null;
};

export default HskExam;
