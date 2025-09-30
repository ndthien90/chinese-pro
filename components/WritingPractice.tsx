import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HSKLevel } from '../types';
import { fetchWritingPromptPool, fetchWritingPromptByKeyword, WritingPromptResponse } from '../services/geminiService';

// SVGs for the 8 basic strokes
const StrokeNgang = () => <svg viewBox="0 0 100 50"><line x1="10" y1="25" x2="90" y2="25" stroke="currentColor" strokeWidth="8" strokeLinecap="round" /></svg>;
const StrokeSo = () => <svg viewBox="0 0 50 100"><line x1="25" y1="10" x2="25" y2="90" stroke="currentColor" strokeWidth="8" strokeLinecap="round" /></svg>;
const StrokeCham = () => <svg viewBox="0 0 50 50"><circle cx="25" cy="25" r="10" fill="currentColor" /></svg>;
const StrokeHat = () => <svg viewBox="0 0 100 100"><path d="M20 80 Q 50 70 80 40" stroke="currentColor" strokeWidth="8" fill="none" strokeLinecap="round" /></svg>;
const StrokePhay = () => <svg viewBox="0 0 100 100"><path d="M80 20 Q 50 50 40 80" stroke="currentColor" strokeWidth="8" fill="none" strokeLinecap="round" /></svg>;
const StrokeMac = () => <svg viewBox="0 0 100 100"><path d="M20 20 Q 50 50 80 80" stroke="currentColor" strokeWidth="8" fill="none" strokeLinecap="round" /></svg>;
const StrokeGap = () => <svg viewBox="0 0 100 100"><path d="M20 20 H 80 V 80" stroke="currentColor" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const StrokeMoc = () => <svg viewBox="0 0 100 100"><path d="M80 80 V 20 H 40 L 20 40" stroke="currentColor" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>;

const StrokeIcons: { [key: string]: React.FC } = {
  'Ngang': StrokeNgang, 'Sổ': StrokeSo, 'Chấm': StrokeCham,
  'Hất': StrokeHat, 'Phẩy': StrokePhay, 'Mác': StrokeMac,
  'Gập': StrokeGap, 'Móc': StrokeMoc,
};

const WritingPractice: React.FC = () => {
    const [level, setLevel] = useState<HSKLevel>(1);
    const [prompt, setPrompt] = useState<WritingPromptResponse | null>(null);
    const [promptPool, setPromptPool] = useState<WritingPromptResponse[]>([]);
    const [currentPoolIndex, setCurrentPoolIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [lineWidth, setLineWidth] = useState(5);
    const [isAnimating, setIsAnimating] = useState(false);
    const [customKeyword, setCustomKeyword] = useState('');

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const guideCanvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawing = useRef(false);
    const isDarkMode = document.documentElement.classList.contains('dark');

    const clearCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (context) {
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            context.fillStyle = isDarkMode ? '#1e293b' : '#f1f5f9'; // Use card background colors
            context.fillRect(0, 0, rect.width * dpr, rect.height * dpr);
        }
    }, [isDarkMode]);
    
    const drawGuideCharacter = useCallback((hanzi: string, strokes: string[]) => {
        const canvas = guideCanvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;

        clearCanvas(canvas);

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const size = rect.width;

        // 1. Draw the full character as a faint background guide
        context.font = `${size * 0.8 * dpr}px sans-serif`;
        context.fillStyle = isDarkMode ? '#475569' : '#cbd5e1'; // Faint color
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        const centerX = (size / 2) * dpr;
        const centerY = (size / 2) * dpr;
        context.fillText(hanzi, centerX, centerY);

        // 2. Draw the stroke order numbers on top
        context.font = `${16 * dpr}px sans-serif`;
        context.fillStyle = '#f59e0b'; // Amber-500 for better visibility
        context.textAlign = 'center';
        context.textBaseline = 'middle';

        const scale = size / 1024;

        strokes.forEach((stroke, index) => {
            const firstMove = stroke.match(/M\s*([\d.]+)\s*,?\s*([\d.]+)/);
            if (firstMove) {
                const x = parseFloat(firstMove[1]) * scale * dpr;
                const y = parseFloat(firstMove[2]) * scale * dpr;
                // Add a small circle background for the number
                context.fillStyle = 'rgba(0, 0, 0, 0.4)';
                context.beginPath();
                context.arc(x, y, 10 * dpr, 0, 2 * Math.PI);
                context.fill();

                context.fillStyle = '#ffffff'; // White number
                context.fillText((index + 1).toString(), x, y + (1*dpr));
            }
        });
    }, [isDarkMode, clearCanvas]);

    const loadNewPool = useCallback(async (newLevel: HSKLevel) => {
        setIsLoading(true);
        setError('');
        setPrompt(null);
        setShowAnswer(false);
        clearCanvas(canvasRef.current);
        clearCanvas(guideCanvasRef.current);
        try {
            const pool = await fetchWritingPromptPool(newLevel);
            if (pool.length === 0) {
                setError('Không thể tải bài tập cho cấp độ này. Vui lòng thử lại.');
                setPromptPool([]);
            } else {
                const shuffledPool = [...pool].sort(() => 0.5 - Math.random());
                setPromptPool(shuffledPool);
                setCurrentPoolIndex(0);
                setPrompt(shuffledPool[0]);
            }
        } catch (err) {
            setError('Không thể tải bài tập mới. Vui lòng thử lại.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [clearCanvas]);

    useEffect(() => {
        loadNewPool(level);
    }, [level, loadNewPool]);


    useEffect(() => {
        if (prompt) {
            drawGuideCharacter(prompt.hanzi, prompt.strokes);
        }
    }, [prompt, drawGuideCharacter]);

    const setupCanvas = (canvas: HTMLCanvasElement) => {
        const context = canvas.getContext('2d');
        if (!context) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        context.scale(dpr, dpr);
    };

    // Robust canvas resize and setup handler
    useEffect(() => {
        const writingCanvas = canvasRef.current;
        if (!writingCanvas) return;

        const resizeHandler = () => {
            setupCanvas(writingCanvas);
            const context = writingCanvas.getContext('2d')!;
            context.lineCap = 'round';
            context.lineJoin = 'round';
            context.strokeStyle = isDarkMode ? '#e2e8f0' : '#0f172a';
            context.lineWidth = lineWidth;
             const newBG = isDarkMode ? '#0b1220' : '#ffffff';
            context.fillStyle = newBG;
            context.fillRect(0, 0, writingCanvas.width, writingCanvas.height);
        };

        const resizeObserver = new ResizeObserver(resizeHandler);
        resizeObserver.observe(writingCanvas);
        resizeHandler();

        return () => resizeObserver.unobserve(writingCanvas);
    }, [isDarkMode, lineWidth]);
    
    // Setup for the guide canvas
    useEffect(() => {
        const guideCanvas = guideCanvasRef.current;
        if (!guideCanvas) return;
        
        const resizeHandler = () => {
            setupCanvas(guideCanvas);
            if(prompt) drawGuideCharacter(prompt.hanzi, prompt.strokes);
        };

        const resizeObserver = new ResizeObserver(resizeHandler);
        resizeObserver.observe(guideCanvas);
        resizeHandler();
        
        return () => resizeObserver.unobserve(guideCanvas);
    }, [prompt, drawGuideCharacter]);


    const animateStrokes = useCallback(async () => {
        const canvas = guideCanvasRef.current;
        const promptData = prompt;
        if (!canvas || !promptData || isAnimating) return;
        
        setIsAnimating(true);
        const context = canvas.getContext('2d');
        if (!context) {
            setIsAnimating(false);
            return;
        }

        clearCanvas(canvas);
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        context.strokeStyle = isDarkMode ? '#e2e8f0' : '#0f172a';
        context.lineWidth = 4 * dpr;
        const scale = rect.width / 1024;

        for (const stroke of promptData.strokes) {
            const path = new Path2D(stroke);
            context.save();
            context.scale(scale * dpr, scale * dpr);
            context.stroke(path);
            context.restore();
            await new Promise(res => setTimeout(res, 300));
        }

        setTimeout(() => {
            drawGuideCharacter(promptData.hanzi, promptData.strokes);
            setIsAnimating(false);
        }, 500);

    }, [prompt, isAnimating, isDarkMode, clearCanvas, drawGuideCharacter]);

    const getCoordinates = (event: React.MouseEvent | React.TouchEvent): { offsetX: number; offsetY: number } | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in event.nativeEvent ? event.nativeEvent.touches[0].clientX : event.nativeEvent.clientX;
        const clientY = 'touches' in event.nativeEvent ? event.nativeEvent.touches[0].clientY : event.nativeEvent.clientY;
        return { offsetX: clientX - rect.left, offsetY: clientY - rect.top };
    }

    const startDrawing = (event: React.MouseEvent | React.TouchEvent) => {
        event.preventDefault();
        const context = canvasRef.current?.getContext('2d');
        const coords = getCoordinates(event);
        if (!coords || !context) return;
        const { offsetX, offsetY } = coords;
        isDrawing.current = true;
        context.lineWidth = lineWidth;
        context.strokeStyle = isDarkMode ? '#e2e8f0' : '#0f172a';
        context.beginPath();
        context.moveTo(offsetX, offsetY);
    };

    const finishDrawing = () => {
        isDrawing.current = false;
    };

    const draw = (event: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing.current) return;
        event.preventDefault();
        const context = canvasRef.current?.getContext('2d');
        const coords = getCoordinates(event);
        if (!coords || !context) return;
        const { offsetX, offsetY } = coords;
        context.lineTo(offsetX, offsetY);
        context.stroke();
    };

    const handleNextWord = () => {
        setShowAnswer(false);
        clearCanvas(canvasRef.current);
        
        if (currentPoolIndex < promptPool.length - 1) {
            const nextIndex = currentPoolIndex + 1;
            setCurrentPoolIndex(nextIndex);
            setPrompt(promptPool[nextIndex]);
        } else {
            // Reached end of the pool, fetch a new one.
            const cacheKey = `writing-prompt-pool-hsk-${level}`;
            sessionStorage.removeItem(cacheKey); // Clear cache to get new words
            console.log("Writing prompt pool exhausted. Fetching new pool.");
            loadNewPool(level);
        }
    };

    const handleCustomPrompt = async () => {
        if (!customKeyword.trim()) return;

        setIsLoading(true);
        setError('');
        setPrompt(null);
        setShowAnswer(false);
        clearCanvas(canvasRef.current);
        clearCanvas(guideCanvasRef.current);
        try {
            const writingPrompt = await fetchWritingPromptByKeyword(customKeyword);
            setPrompt(writingPrompt);
            // Clear the pool so the next "HSK mode" word isn't from the old pool
            setPromptPool([]);
            setCurrentPoolIndex(0);
        } catch (err) {
            setError('Không tìm thấy ký tự hoặc đã xảy ra lỗi. Vui lòng thử lại.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const LoadingSkeleton = () => (
        <div className="bg-light-card dark:bg-dark-card p-6 rounded-lg shadow-lg animate-pulse">
            <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-1/2 mx-auto mb-4"></div>
            <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-2/3 mx-auto mb-6"></div>
            <div className="h-64 bg-gray-300 dark:bg-gray-600 rounded w-full mb-4"></div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 text-primary">Luyện Viết</h2>
            <div className="flex justify-center flex-wrap gap-2 mb-4">
                {[1, 2, 3, 4, 5, 6].map(l => (
                    <button
                        key={l}
                        onClick={() => {
                            if (level !== (l as HSKLevel)) {
                                setLevel(l as HSKLevel);
                                setCustomKeyword('');
                            }
                        }}
                        className={`px-4 py-2 rounded-md font-semibold transition-all ${
                            level === l ? 'bg-primary text-white shadow-md' : 'bg-light-card dark:bg-dark-card hover:bg-primary/10'
                        }`}
                    >
                        HSK {l}
                    </button>
                ))}
            </div>

            <div className="mb-6 flex items-center gap-2 max-w-lg mx-auto">
                <input
                    type="text"
                    value={customKeyword}
                    onChange={(e) => setCustomKeyword(e.target.value)}
                    placeholder="Nhập từ TV hoặc Hán tự muốn viết..."
                    className="flex-grow w-full p-3 border border-light-border dark:border-dark-border rounded-md bg-light-bg dark:bg-dark-bg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                    onKeyDown={(e) => e.key === 'Enter' && handleCustomPrompt()}
                />
                <button
                    onClick={handleCustomPrompt}
                    disabled={isLoading || !customKeyword.trim()}
                    className="px-6 py-3 bg-accent text-white font-semibold rounded-md hover:bg-emerald-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                >
                    Tìm & Viết
                </button>
            </div>


            {isLoading ? (
                <LoadingSkeleton />
            ) : error ? (
                <div className="text-center text-red-500 bg-red-100 dark:bg-red-900/20 p-4 rounded-lg">{error}</div>
            ) : prompt ? (
                <div className="bg-light-card dark:bg-dark-card p-6 rounded-lg shadow-lg">
                    <div className="text-center mb-4">
                        <p className="text-3xl text-gray-700 dark:text-gray-300 font-serif mb-2">{prompt.pinyin}</p>
                        <p className="text-xl font-semibold text-accent">"{prompt.vi_meaning}"</p>
                    </div>

                    {prompt.example_words && prompt.example_words.length > 0 && (
                        <div className="mb-6 max-w-2xl mx-auto p-4 bg-light-bg dark:bg-dark-bg rounded-lg border border-light-border dark:border-dark-border">
                            <h4 className="font-semibold text-center mb-3">Từ vựng liên quan</h4>
                            <ul className="space-y-2">
                                {prompt.example_words.map((ex, index) => (
                                    <li key={index} className="flex justify-between items-baseline">
                                        <div>
                                            <span className="text-lg font-semibold text-accent">{ex.word}</span>
                                            <span className="ml-3 text-gray-500 dark:text-gray-400">{ex.pinyin}</span>
                                        </div>
                                        <span className="italic text-right">"{ex.meaning_vi}"</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}


                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                        {/* Stroke Guide */}
                        <div className="text-center">
                            <h4 className="font-semibold mb-2">Bảng Hướng dẫn</h4>
                            <canvas
                                ref={guideCanvasRef}
                                className="w-full aspect-square border-2 border-dashed border-light-border dark:border-dark-border rounded-md bg-light-bg dark:bg-dark-bg"
                            />
                            <button onClick={animateStrokes} disabled={isAnimating} className="mt-2 px-4 py-2 text-sm bg-primary text-white font-semibold rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400">
                                {isAnimating ? 'Đang mô phỏng...' : 'Mô phỏng'}
                            </button>
                        </div>
                        
                        {/* Drawing Canvas */}
                        <div className="text-center">
                             <h4 className="font-semibold mb-2">Khung vẽ của bạn</h4>
                            <canvas
                                ref={canvasRef}
                                onMouseDown={startDrawing} onMouseUp={finishDrawing} onMouseLeave={finishDrawing} onMouseMove={draw}
                                onTouchStart={startDrawing} onTouchEnd={finishDrawing} onTouchCancel={finishDrawing} onTouchMove={draw}
                                className="w-full aspect-square border-2 border-dashed border-primary dark:border-primary rounded-md bg-light-bg dark:bg-dark-bg cursor-crosshair touch-none"
                                aria-label="Khu vực vẽ chữ Hán"
                            />
                        </div>

                        {/* Control Panel */}
                        <div className="w-full">
                             <h4 className="font-semibold mb-2 text-center lg:text-left">Bảng điều khiển</h4>
                            <div className="space-y-6 bg-light-bg dark:bg-dark-bg p-4 rounded-lg border border-light-border dark:border-dark-border">
                                <div>
                                    <h5 className="font-semibold mb-2">Độ dày bút vẽ</h5>
                                    <div className="flex justify-around">
                                        <button onClick={() => setLineWidth(2)} className={`p-2 rounded-full ${lineWidth === 2 ? 'bg-primary text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}><div className="w-4 h-4 bg-current rounded-full" style={{transform: 'scale(0.5)'}}></div></button>
                                        <button onClick={() => setLineWidth(5)} className={`p-2 rounded-full ${lineWidth === 5 ? 'bg-primary text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}><div className="w-4 h-4 bg-current rounded-full" style={{transform: 'scale(0.75)'}}></div></button>
                                        <button onClick={() => setLineWidth(10)} className={`p-2 rounded-full ${lineWidth === 10 ? 'bg-primary text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}><div className="w-4 h-4 bg-current rounded-full"></div></button>
                                    </div>
                                </div>
                                <div>
                                    <h5 className="font-semibold mb-2">8 Nét Cơ Bản</h5>
                                    <div className="grid grid-cols-4 gap-2">
                                        {Object.entries(StrokeIcons).map(([name, Icon]) => (
                                            <button key={name} title={name} className="p-1 aspect-square flex flex-col items-center justify-center bg-light-card dark:bg-dark-card rounded-md hover:bg-gray-200 dark:hover:bg-gray-700">
                                                <div className="w-6 h-6"><Icon /></div>
                                                <span className="text-xs mt-1">{name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-8 flex flex-wrap justify-center gap-4">
                        <button onClick={() => clearCanvas(canvasRef.current)} className="px-6 py-2 bg-gray-500 text-white font-semibold rounded-md hover:bg-gray-600 transition-colors">Xóa hết</button>
                        <button onClick={() => setShowAnswer(true)} className="px-6 py-2 bg-primary text-white font-semibold rounded-md hover:bg-blue-700 transition-colors">Kiểm tra / Xem đáp án</button>
                        <button onClick={handleNextWord} className="px-6 py-2 bg-accent text-white font-semibold rounded-md hover:bg-emerald-600 transition-colors">Bài tiếp theo</button>
                    </div>
                    
                    {showAnswer && (
                        <div className="mt-6 text-center bg-yellow-100 dark:bg-yellow-900/20 p-4 rounded-md">
                            <p>Đáp án đúng là:</p>
                            <p className="text-8xl font-bold text-yellow-700 dark:text-yellow-300 font-serif">{prompt.hanzi}</p>
                        </div>
                    )}
                </div>
            ) : null}
        </div>
    );
};

export default WritingPractice;