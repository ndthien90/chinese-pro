import React, { useState, useRef } from 'react';
import { TranslationResult, ActiveView } from '../types';
import { fetchTranslation, extractTextFromImage } from '../services/geminiService';
import { addHistoryItem } from '../services/historyService';

const SpeakerIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        {/* Fix: Corrected the corrupted SVG path data for the icon. */}
        <path d="M10 3.167A7.833 7.833 0 002.167 11c0 2.942 1.606 5.5 3.958 6.833l.25.139V11a.833.833 0 01.833-.833h1.667v6.528A7.833 7.833 0 0010 18.833a7.833 7.833 0 007.833-7.833A7.833 7.833 0 0010 3.167zM11.667 11V4.5a.833.833 0 111.666 0V11a.833.833 0 11-1.666 0z" />
    </svg>
);

const MicrophoneIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8h-1a6 6 0 11-12 0H3a7.001 7.001 0 006 6.93V17H7a1 1 0 100 2h6a1 1 0 100-2h-2v-2.07z" clipRule="evenodd" />
    </svg>
);

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
);


const Translator: React.FC<{ speechRate: number; selectedVoice: string }> = ({ speechRate, selectedVoice }) => {
    const [inputText, setInputText] = useState('');
    const [result, setResult] = useState<TranslationResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [recognitionLang, setRecognitionLang] = useState('vi-VN');
    const [isListening, setIsListening] = useState(false);
    const [recognitionError, setRecognitionError] = useState('');
    const [isProcessingFile, setIsProcessingFile] = useState(false);
    const [fileName, setFileName] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleTranslate = async (textToTranslate?: string) => {
        const text = (textToTranslate || inputText).trim();
        if (!text) return;

        setIsLoading(true);
        setError('');
        setResult(null);
        try {
            const translation = await fetchTranslation(text);
            setResult(translation);
            addHistoryItem(ActiveView.Translator, `Đã dịch: "${text.substring(0, 30)}..."`, translation);
        } catch (err) {
            setError('Đã xảy ra lỗi khi dịch. Vui lòng thử lại.');
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

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsProcessingFile(true);
        setError('');
        setResult(null);
        setFileName(file.name);

        const reader = new FileReader();

        if (file.type.startsWith('image/')) {
            reader.readAsDataURL(file);
            reader.onload = async (e) => {
                const base64Data = e.target?.result as string;
                // remove the "data:mime/type;base64," prefix
                const pureBase64 = base64Data.split(',')[1];
                try {
                    const extractedText = await extractTextFromImage({
                        mimeType: file.type,
                        data: pureBase64
                    });
                    setInputText(extractedText);
                    await handleTranslate(extractedText);
                } catch (err) {
                    setError('Không thể trích xuất văn bản từ hình ảnh.');
                } finally {
                    setIsProcessingFile(false);
                    setFileName('');
                }
            };
        } else if (file.type === 'text/plain') {
            reader.readAsText(file);
            reader.onload = async (e) => {
                const text = e.target?.result as string;
                setInputText(text);
                await handleTranslate(text);
                setIsProcessingFile(false);
                setFileName('');
            };
        } else {
            setError('Định dạng tệp không được hỗ trợ. Vui lòng chọn ảnh (JPG, PNG) hoặc tệp văn bản (.txt).');
            setIsProcessingFile(false);
            setFileName('');
        }
        
        reader.onerror = () => {
            setError('Đã xảy ra lỗi khi đọc tệp.');
            setIsProcessingFile(false);
            setFileName('');
        };

        // Reset file input to allow selecting the same file again
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
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
            <h2 className="text-3xl font-bold mb-6 text-primary">Dịch Việt ↔ Trung</h2>
            <div className="bg-light-card dark:bg-dark-card p-6 rounded-lg shadow-lg">
                <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Nhập văn bản cần dịch hoặc tải lên tệp..."
                    className="w-full h-32 p-3 border border-light-border dark:border-dark-border rounded-md bg-light-bg dark:bg-dark-bg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                    disabled={isProcessingFile}
                />
                 <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                         <button
                            onClick={handleListen}
                            disabled={isListening || isProcessingFile}
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
                            disabled={isProcessingFile}
                        >
                            <option value="vi-VN">Nói Tiếng Việt</option>
                            <option value="zh-CN">说中文</option>
                        </select>
                         <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            id="file-upload"
                            accept="image/png, image/jpeg, .txt"
                            disabled={isProcessingFile}
                        />
                        <label
                            htmlFor="file-upload"
                            className={`px-4 py-2 bg-accent text-white font-semibold rounded-md hover:bg-emerald-600 transition-colors flex items-center ${isProcessingFile ? 'cursor-not-allowed bg-gray-400' : 'cursor-pointer'}`}
                        >
                            <UploadIcon/>
                            {isProcessingFile ? 'Đang xử lý...' : 'Tải lên tệp'}
                        </label>
                    </div>

                    <button
                        onClick={() => handleTranslate()}
                        disabled={isLoading || isProcessingFile}
                        className="px-6 py-2 bg-primary text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
                    >
                        {isLoading ? 'Đang dịch...' : 'Dịch'}
                    </button>
                </div>
                {fileName && <p className="text-sm text-gray-500 mt-2">Đang xử lý tệp: {fileName}</p>}
                {recognitionError && <p className="text-red-500 text-sm mt-2">{recognitionError}</p>}
            </div>

            {error && <p className="mt-4 text-center text-red-500 bg-red-100 dark:bg-red-900/20 p-3 rounded-md">{error}</p>}
            
            <div className="mt-8">
                {(isLoading || isProcessingFile) && <LoadingSkeleton />}
                {result && !isProcessingFile && (
                    <div className="bg-light-card dark:bg-dark-card p-6 rounded-lg shadow-lg">
                        <div className="border-b border-light-border dark:border-dark-border pb-4 mb-4">
                            <div className="flex items-center space-x-3">
                                <p className="text-3xl font-semibold text-accent">{result.hanzi}</p>
                                <button onClick={() => playAudio(result.hanzi)} className="p-2 rounded-full hover:bg-accent/20 text-accent" title="Nghe">
                                    <SpeakerIcon />
                                </button>
                            </div>
                            <p className="text-lg text-gray-500 dark:text-gray-400">{result.pinyin}</p>
                            <p className="text-xl font-medium mt-2">{result.vi_meaning}</p>
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

                        <div>
                            <h4 className="font-bold text-lg mb-2">Ghi chú ngữ pháp:</h4>
                            <ul className="list-disc list-inside space-y-1">
                                {result.grammar_notes.map((note, index) => (
                                    <li key={index}>{note}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Translator;