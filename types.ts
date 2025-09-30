// Fix: Consolidated all type definitions into this file to remove circular dependencies.

// HSK levels
export type HSKLevel = 1 | 2 | 3 | 4 | 5 | 6;

// Views in the app
export const ActiveView = {
    Translator: 'Dịch thuật',
    Dictionary: 'Từ điển',
    Vocabulary: 'Từ vựng HSK',
    Conversations: 'Hội thoại',
    WritingPractice: 'Luyện viết',
    Flashcards: 'Flashcards',
    Quiz: 'Trắc nghiệm',
    HskExam: 'Thi HSK',
    Pronunciation: 'Phát âm',
    History: 'Lịch sử',
    Settings: 'Cài đặt',
} as const;

export type ActiveView = (typeof ActiveView)[keyof typeof ActiveView];

// From geminiService schema for vocabulary
export interface VocabularyWord {
    level: number;
    hanzi: string;
    pinyin: string;
    meaning_vi: string;
    pos: string; // part of speech
    example_zh: string;
    example_pinyin: string;
    example_vi: string;
}

// For flashcards
export interface Flashcard {
    word: VocabularyWord;
    reviewDate: string; // ISO date string
    interval: number;
    easeFactor: number;
}

// From geminiService schema for translation/dictionary
export interface TranslationResult {
    source_lang: string;
    target_lang: string;
    hanzi: string;
    pinyin: string;
    vi_meaning: string;
    examples: {
        zh: string;
        pinyin: string;
        vi: string;
    }[];
    grammar_notes: string[];
}

// From geminiService schema for conversations
export interface ConversationLine {
    topic: string;
    turn: number;
    zh: string;
    pinyin: string;
    vi: string;
}

// From geminiService schema for HSK exam
export type ExamSection = 'Nghe hiểu' | 'Đọc hiểu' | 'Viết';

export interface ExamQuestion {
    section: string;
    question_text: string;
    audio_script: string | null; // Can be null for non-listening sections
    options: string[];
    correct_answer: string;
    explanation: string;
}

// Types for History feature
export interface HskExamResult {
    level: HSKLevel;
    score: number;
    totalQuestions: number;
    questions: ExamQuestion[];
    userAnswers: (string | null)[];
}

export type HistoryContent = TranslationResult | ConversationLine[] | HskExamResult;

export interface HistoryItem {
    id: string; // unique id
    type: typeof ActiveView.Translator | typeof ActiveView.Dictionary | typeof ActiveView.Conversations | typeof ActiveView.HskExam;
    timestamp: string; // ISO string
    summary: string; // A short summary for display
    content: HistoryContent;
}
