import React, { useState, useEffect } from 'react';
import { getHistory, clearHistory } from '../services/historyService';
import { HistoryItem, ActiveView, TranslationResult, ConversationLine, HskExamResult } from '../types';

// Re-usable icons
const SpeakerIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3.167A7.833 7.833 0 002.167 11c0 2.942 1.606 5.5 3.958 6.833l.25.139V11a.833.833 0 01.833-.833h1.667v6.528A7.833 7.833 0 0010 18.833a7.833 7.833 0 007.833-7.833A7.833 7.833 0 0010 3.167zM11.667 11V4.5a.833.833 0 111.666 0V11a.833.833 0 11-1.666 0z" /></svg>
);
const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1 text-green-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
);
const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1 text-red-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
);


const History: React.FC<{ speechRate: number, selectedVoice: string }> = ({ speechRate, selectedVoice }) => {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

    useEffect(() => {
        setHistory(getHistory());
    }, []);

    const handleClearHistory = () => {
        if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử không?')) {
            clearHistory();
            setHistory([]);
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

    // Modal to display detailed history content
    const DetailModal: React.FC<{ item: HistoryItem, onClose: () => void }> = ({ item, onClose }) => {
        const renderContent = () => {
            switch (item.type) {
                case ActiveView.Translator:
                case ActiveView.Dictionary: {
                    const content = item.content as TranslationResult;
                    return (
                        <div>
                            <div className="border-b border-light-border dark:border-dark-border pb-4 mb-4">
                                <div className="flex items-center space-x-3">
                                    <p className="text-3xl font-semibold text-accent">{content.hanzi}</p>
                                    <button onClick={() => playAudio(content.hanzi)} className="p-2 rounded-full hover:bg-accent/20 text-accent" title="Nghe"><SpeakerIcon /></button>
                                </div>
                                <p className="text-lg text-gray-500 dark:text-gray-400">{content.pinyin}</p>
                                <p className="text-xl font-medium mt-2">{content.vi_meaning}</p>
                            </div>
                            <h4 className="font-bold text-lg mb-2">Ví dụ:</h4>
                            <ul className="space-y-3">
                                {content.examples.map((ex, index) => (
                                    <li key={index}>
                                        <div className="flex items-center space-x-2">
                                          <p className="text-md text-accent">{ex.zh}</p>
                                          <button onClick={() => playAudio(ex.zh)} className="p-1 rounded-full hover:bg-accent/20 text-accent" title="Nghe"><SpeakerIcon /></button>
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{ex.pinyin}</p>
                                        <p className="text-sm italic">"{ex.vi}"</p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    );
                }
                case ActiveView.Conversations: {
                    const content = item.content as ConversationLine[];
                    if (!content || content.length === 0) return <p>Không có nội dung.</p>;
                    return (
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold mb-2 text-gray-700 dark:text-gray-300">Chủ đề: {content[0].topic}</h3>
                            {content.map(line => (
                                <div key={line.turn} className="bg-light-bg dark:bg-dark-bg p-3 rounded-lg">
                                    <p className="text-lg text-accent font-semibold">{line.zh}</p>
                                    <p className="text-gray-500 dark:text-gray-400">{line.pinyin}</p>
                                    <p className="italic mt-1">"{line.vi}"</p>
                                </div>
                            ))}
                        </div>
                    );
                }
                case ActiveView.HskExam: {
                    const content = item.content as HskExamResult;
                    return (
                        <div>
                            <h3 className="text-2xl font-bold mb-4 text-center">Kết quả bài thi HSK {content.level}</h3>
                            <p className="text-4xl my-4 text-center">Điểm: <span className="text-accent font-bold">{content.score} / {content.totalQuestions}</span></p>
                            <h4 className="text-xl font-bold mt-6 mb-2">Phân tích lỗi sai:</h4>
                            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                                {content.questions.map((q, index) => {
                                    const userAnswer = content.userAnswers[index];
                                    if (userAnswer === q.correct_answer) return null;
                                    return (
                                        <div key={index} className="p-3 bg-light-bg dark:bg-dark-bg rounded-lg border-l-4 border-red-500">
                                            <p className="font-semibold text-sm mb-1">Câu {index + 1}: {q.question_text}</p>
                                            <p className="text-xs"><XIcon />Bạn đã chọn: <span className="text-red-500">{userAnswer || 'Không trả lời'}</span></p>
                                            <p className="text-xs"><CheckIcon />Đáp án đúng: <span className="text-green-500">{q.correct_answer}</span></p>
                                        </div>
                                    );
                                })}
                                {content.score === content.totalQuestions && <p className="text-center text-green-500">🎉 Bạn đã trả lời đúng tất cả các câu hỏi.</p>}
                            </div>
                        </div>
                    );
                }
                default:
                    return <p>Loại lịch sử không được hỗ trợ.</p>;
            }
        };

        return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
                <div className="bg-light-card dark:bg-dark-card rounded-lg shadow-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-primary">{item.type}</h2>
                        <button onClick={onClose} className="text-2xl font-bold hover:text-red-500">&times;</button>
                    </div>
                    {renderContent()}
                </div>
            </div>
        );
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-primary">Lịch sử Hoạt động</h2>
                {history.length > 0 && (
                    <button
                        onClick={handleClearHistory}
                        className="px-4 py-2 bg-red-500 text-white font-semibold rounded-md hover:bg-red-600 transition"
                    >
                        Xóa Lịch sử
                    </button>
                )}
            </div>

            {history.length === 0 ? (
                <p className="text-center text-gray-500 mt-10">Lịch sử của bạn trống.</p>
            ) : (
                <div className="space-y-4">
                    {history.map(item => (
                        <div
                            key={item.id}
                            onClick={() => setSelectedItem(item)}
                            className="bg-light-card dark:bg-dark-card p-4 rounded-lg shadow-md cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-primary transition"
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${item.type === ActiveView.HskExam ? 'bg-red-200 text-red-800' : 'bg-primary/20 text-primary'}`}>
                                        {item.type}
                                    </span>
                                    <p className="font-semibold mt-2 truncate">{item.summary}</p>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0 ml-4">
                                    {new Date(item.timestamp).toLocaleString('vi-VN')}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {selectedItem && <DetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />}
        </div>
    );
};

export default History;
