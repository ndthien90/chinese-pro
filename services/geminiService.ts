import { GoogleGenAI, Type } from "@google/genai";
import { TranslationResult, HSKLevel, VocabularyWord, ConversationLine, ExamQuestion } from '../types';

// The user is expected to have the API_KEY in their environment variables.
// As per instructions, do not add any UI or logic to handle the key itself.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

/**
 * Translates text between Vietnamese and Chinese using the Gemini API.
 * @param text The text to translate.
 * @returns A promise that resolves to a detailed translation result.
 */
export const fetchTranslation = async (text: string): Promise<TranslationResult> => {
    const model = 'gemini-2.5-flash';
    const prompt = `Translate the following text into Chinese or Vietnamese, whichever is the opposite of the input language. Provide a detailed analysis including Pinyin, Vietnamese meaning, 2-3 example sentences, and 1-2 relevant grammar notes. The input text is: "${text}"`;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            source_lang: { type: Type.STRING, description: "Language of the input text (e.g., 'Vietnamese' or 'Chinese')" },
            target_lang: { type: Type.STRING, description: "Language of the translation (e.g., 'Chinese' or 'Vietnamese')" },
            hanzi: { type: Type.STRING, description: "The translated Chinese text (Hanzi)." },
            pinyin: { type: Type.STRING, description: "The Pinyin romanization of the Chinese text." },
            vi_meaning: { type: Type.STRING, description: "The Vietnamese meaning of the text." },
            examples: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        zh: { type: Type.STRING, description: "Example sentence in Chinese." },
                        pinyin: { type: Type.STRING, description: "Pinyin for the example sentence." },
                        vi: { type: Type.STRING, description: "Vietnamese translation of the example sentence." },
                    },
                    required: ["zh", "pinyin", "vi"],
                }
            },
            grammar_notes: {
                type: Type.ARRAY,
                items: {
                    type: Type.STRING,
                    description: "A grammar note or explanation."
                }
            }
        },
        required: ["source_lang", "target_lang", "hanzi", "pinyin", "vi_meaning", "examples", "grammar_notes"],
    };

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        return result as TranslationResult;
    } catch (error) {
        console.error("Error fetching translation:", error);
        throw new Error("Failed to fetch translation from Gemini API.");
    }
};

/**
 * Extracts text from an image using Gemini's multimodal capabilities.
 * @param imageData Object containing the image's mimeType and base64 data.
 * @returns A promise that resolves to the extracted text.
 */
export const extractTextFromImage = async (imageData: { mimeType: string; data: string }): Promise<string> => {
    const model = 'gemini-2.5-flash';
    
    const imagePart = {
      inlineData: {
        mimeType: imageData.mimeType,
        data: imageData.data, // base64 encoded string without prefix
      },
    };
    const textPart = {
      text: 'Extract all text content from this image. Output only the extracted text as a single block. Do not add any formatting or commentary.'
    };

    try {
        const response = await ai.models.generateContent({
          model: model,
          contents: { parts: [imagePart, textPart] },
        });

        return response.text;
    } catch (error) {
        console.error("Error extracting text from image:", error);
        throw new Error("Failed to extract text from image using Gemini API.");
    }
};


/**
 * Fetches a detailed dictionary entry for a single word.
 * @param word The word to look up (Vietnamese or Chinese).
 * @returns A promise that resolves to a detailed dictionary entry.
 */
export const fetchDictionaryEntry = async (word: string): Promise<TranslationResult> => {
    const cacheKey = `dictionary-entry-${word}`;
    try {
        const cachedData = sessionStorage.getItem(cacheKey);
        if (cachedData) {
            console.log("Serving dictionary entry from cache:", cacheKey);
            return JSON.parse(cachedData);
        }
    } catch (e) {
        console.warn("Could not read dictionary entry from sessionStorage", e);
    }
    
    const model = 'gemini-2.5-flash';
    const prompt = `Provide a detailed dictionary entry for the word "${word}". The word can be in either Vietnamese or Chinese. The entry should include the Hanzi, Pinyin, detailed Vietnamese meaning(s) including part of speech, 2-3 example sentences (with pinyin and Vietnamese translation), and any relevant grammar notes or synonyms. Treat it as a dictionary lookup, not a full-sentence translation.`;

    // Reusing the TranslationResult schema as it fits perfectly.
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            source_lang: { type: Type.STRING, description: "Language of the input word (e.g., 'Vietnamese' or 'Chinese')" },
            target_lang: { type: Type.STRING, description: "Language of the primary lookup (e.g., 'Chinese' or 'Vietnamese')" },
            hanzi: { type: Type.STRING, description: "The Chinese word (Hanzi)." },
            pinyin: { type: Type.STRING, description: "The Pinyin romanization of the Chinese word." },
            vi_meaning: { type: Type.STRING, description: "The detailed Vietnamese meaning of the word, including part of speech." },
            examples: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        zh: { type: Type.STRING, description: "Example sentence in Chinese." },
                        pinyin: { type: Type.STRING, description: "Pinyin for the example sentence." },
                        vi: { type: Type.STRING, description: "Vietnamese translation of the example sentence." },
                    },
                    required: ["zh", "pinyin", "vi"],
                }
            },
            grammar_notes: {
                type: Type.ARRAY,
                items: {
                    type: Type.STRING,
                    description: "A grammar note, synonym, or explanation."
                }
            }
        },
        required: ["source_lang", "target_lang", "hanzi", "pinyin", "vi_meaning", "examples", "grammar_notes"],
    };

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);

        try {
            sessionStorage.setItem(cacheKey, JSON.stringify(result));
        } catch (e) {
            console.warn("Could not write dictionary entry to sessionStorage", e);
        }

        return result as TranslationResult;
    } catch (error) {
        console.error("Error fetching dictionary entry:", error);
        throw new Error("Failed to fetch dictionary entry from Gemini API.");
    }
};


/**
 * Fetches a paginated list of HSK vocabulary words. It intelligently fetches and caches a large pool
 * of words for each HSK level to minimize API calls and avoid rate-limiting errors.
 * @param level The HSK level.
 * @param page The page number for pagination.
 * @param limit The number of words per page.
 * @returns A promise that resolves to an array of vocabulary words for the requested page.
 */
export const fetchHskVocabulary = async (level: HSKLevel, page: number, limit: number = 10): Promise<VocabularyWord[]> => {
    const poolCacheKey = `hsk-vocab-pool-${level}`;
    const POOL_SIZE = 100; // The standard number of words to fetch and cache for each level.

    let wordPool: VocabularyWord[] = [];

    // 1. Try to get the entire word pool from sessionStorage first.
    try {
        const cachedData = sessionStorage.getItem(poolCacheKey);
        if (cachedData) {
            wordPool = JSON.parse(cachedData);
        }
    } catch (e) {
        console.warn("Could not read vocabulary pool from sessionStorage", e);
    }

    // 2. If the pool is not cached, fetch it from the API.
    if (wordPool.length === 0) {
        console.log(`Fetching new vocabulary pool (size: ${POOL_SIZE}) from API for HSK level: ${level}`);
        const model = 'gemini-2.5-flash';
        const prompt = `Generate a list of ${POOL_SIZE} HSK level ${level} vocabulary words. For each word, provide the Hanzi, Pinyin, Vietnamese meaning, part of speech, and a simple example sentence in Chinese with Pinyin and Vietnamese translation.`;

        const responseSchema = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    level: { type: Type.NUMBER, description: "HSK level" },
                    hanzi: { type: Type.STRING, description: "The word in Chinese characters (Hanzi)." },
                    pinyin: { type: Type.STRING, description: "The Pinyin romanization." },
                    meaning_vi: { type: Type.STRING, description: "The Vietnamese meaning." },
                    pos: { type: Type.STRING, description: "Part of speech (e.g., 'noun', 'verb')." },
                    example_zh: { type: Type.STRING, description: "Example sentence in Chinese." },
                    example_pinyin: { type: Type.STRING, description: "Pinyin for the example sentence." },
                    example_vi: { type: Type.STRING, description: "Vietnamese translation of the example sentence." },
                },
                required: ["level", "hanzi", "pinyin", "meaning_vi", "pos", "example_zh", "example_pinyin", "example_vi"],
            }
        };

        try {
            const response = await ai.models.generateContent({
                model: model,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: responseSchema,
                },
            });

            const jsonText = response.text.trim();
            const result = JSON.parse(jsonText);
            wordPool = (result as VocabularyWord[]).slice(0, POOL_SIZE);

            // 3. Cache the newly fetched pool in sessionStorage.
            try {
                sessionStorage.setItem(poolCacheKey, JSON.stringify(wordPool));
            } catch (e) {
                console.warn("Could not write vocabulary pool to sessionStorage", e);
            }
        } catch (error) {
            console.error(`Error fetching HSK level ${level} vocabulary:`, error);
            throw new Error("Failed to fetch HSK vocabulary from Gemini API.");
        }
    }

    // 4. Perform client-side pagination on the pool (whether it was cached or newly fetched).
    const start = (page - 1) * limit;
    const end = start + limit;
    const pagedWords = wordPool.slice(start, end);

    return pagedWords;
};


/**
 * Fetches a sample conversation for a given HSK level and optional topic.
 * @param level The HSK level for the conversation.
 * @param topic An optional user-provided topic for the conversation.
 * @returns A promise that resolves to an array of conversation lines.
 */
export const fetchConversation = async (level: HSKLevel, topic?: string): Promise<ConversationLine[]> => {
    // Only cache if there's no custom topic, to allow variety
    if (!topic) {
        const cacheKey = `hsk-conversation-${level}`;
        try {
            const cachedData = sessionStorage.getItem(cacheKey);
            if (cachedData) {
                console.log("Serving conversation from cache:", cacheKey);
                return JSON.parse(cachedData);
            }
        } catch (e) {
            console.warn("Could not read conversation from sessionStorage", e);
        }
    }

    const model = 'gemini-2.5-flash';
    
    const topicPrompt = topic
        ? `about the topic "${topic}"`
        : "on a common, simple daily life subject";

    const prompt = `Generate a short, simple conversation in Chinese ${topicPrompt} suitable for HSK level ${level}. The conversation should have around 6-8 turns between two people (A and B) and use vocabulary and grammar primarily from HSK level ${level} or below. For each line, provide a relevant topic for the entire conversation, the turn number, the Chinese text (zh), Pinyin, and the Vietnamese translation (vi). The topic should be consistent for all turns.`;

    const responseSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                topic: { type: Type.STRING, description: "The conversation topic. Should be the same for all lines in the conversation." },
                turn: { type: Type.INTEGER, description: "The turn number in the conversation, starting from 1." },
                zh: { type: Type.STRING, description: "The line in Chinese characters." },
                pinyin: { type: Type.STRING, description: "The Pinyin for the line." },
                vi: { type: Type.STRING, description: "The Vietnamese translation of the line." },
            },
            required: ["topic", "turn", "zh", "pinyin", "vi"],
        }
    };

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        
        if (!topic) {
            try {
                const cacheKey = `hsk-conversation-${level}`;
                sessionStorage.setItem(cacheKey, JSON.stringify(result));
            } catch (e) {
                console.warn("Could not write conversation to sessionStorage", e);
            }
        }

        return result as ConversationLine[];
    } catch (error) {
        console.error(`Error fetching conversation for HSK level ${level}:`, error);
        throw new Error("Failed to fetch conversation from Gemini API.");
    }
};

/**
 * Fetches additional conversation lines to continue an existing conversation.
 * @param existingConversation The current conversation lines.
 * @param level The HSK level for the conversation.
 * @returns A promise that resolves to an array of new conversation lines.
 */
export const fetchMoreConversationLines = async (existingConversation: ConversationLine[], level: HSKLevel): Promise<ConversationLine[]> => {
    if (existingConversation.length === 0) return [];

    const model = 'gemini-2.5-flash';
    const lastTurn = existingConversation[existingConversation.length - 1];
    const conversationHistory = existingConversation.map(line => `${line.turn % 2 === 1 ? 'A' : 'B'}: ${line.zh}`).join('\n');
    
    const prompt = `
        This is an existing conversation for an HSK level ${level} learner. The topic is "${lastTurn.topic}".
        Here is the conversation so far:
        ${conversationHistory}

        Please generate the next 2 to 4 turns of this conversation, continuing the dialogue logically. 
        Maintain the same HSK level and topic. For each new line, provide:
        - The same topic: "${lastTurn.topic}"
        - The turn number (continuing from ${lastTurn.turn}).
        - The Chinese text (zh).
        - The Pinyin.
        - The Vietnamese translation (vi).
    `;

    const responseSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                topic: { type: Type.STRING },
                turn: { type: Type.INTEGER },
                zh: { type: Type.STRING },
                pinyin: { type: Type.STRING },
                vi: { type: Type.STRING },
            },
            required: ["topic", "turn", "zh", "pinyin", "vi"],
        }
    };

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        return result as ConversationLine[];
    } catch (error) {
        console.error(`Error fetching more conversation lines for HSK level ${level}:`, error);
        throw new Error("Failed to fetch more conversation lines from Gemini API.");
    }
};

export type WritingPromptResponse = { 
    hanzi: string; 
    pinyin: string; 
    vi_meaning: string; 
    strokes: string[];
    example_words: {
        word: string;
        pinyin: string;
        meaning_vi: string;
    }[];
};

/**
 * Fetches a pool of characters for writing practice for a given HSK level.
 * @param level The HSK level for the prompt.
 * @returns A promise that resolves to an array of writing prompt objects.
 */
export const fetchWritingPromptPool = async (level: HSKLevel): Promise<WritingPromptResponse[]> => {
    const cacheKey = `writing-prompt-pool-hsk-${level}`;
    const POOL_SIZE = 25;

    try {
        const cachedData = sessionStorage.getItem(cacheKey);
        if (cachedData) {
            console.log("Serving writing prompt pool from cache:", cacheKey);
            return JSON.parse(cachedData);
        }
    } catch (e) {
        console.warn("Could not read writing prompt pool from sessionStorage", e);
    }

    console.log(`Fetching new writing prompt pool (size: ${POOL_SIZE}) from API for HSK level: ${level}`);
    const model = 'gemini-2.5-flash';
    
    const prompt = `Generate a list of ${POOL_SIZE} unique, common simplified Chinese characters for a writing practice exercise, suitable for an HSK level ${level} learner. For each character, provide:
1.  The Hanzi itself (simplified form).
2.  The Pinyin romanization.
3.  The Vietnamese meaning.
4.  An array of SVG path strings for the stroke order. The SVG viewbox should be 1024x1024.
5.  An array of 2-3 common example words that use this character, including the full word, its pinyin, and its Vietnamese meaning.
`;

    const responseSchema = {
        type: Type.ARRAY,
        items: {
             type: Type.OBJECT,
            properties: {
                hanzi: { type: Type.STRING, description: "The character in Chinese (Hanzi)." },
                pinyin: { type: Type.STRING, description: "The Pinyin romanization." },
                vi_meaning: { type: Type.STRING, description: "The Vietnamese meaning." },
                strokes: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.STRING,
                        description: "An SVG path string for a single stroke (e.g., 'M100,100 L200,200')."
                    },
                    description: "An array of SVG path strings representing the correct stroke order."
                },
                example_words: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            word: { type: Type.STRING, description: "The example word in Chinese." },
                            pinyin: { type: Type.STRING, description: "Pinyin for the example word." },
                            meaning_vi: { type: Type.STRING, description: "Vietnamese meaning for the example word." }
                        },
                        required: ["word", "pinyin", "meaning_vi"]
                    }
                }
            },
            required: ["hanzi", "pinyin", "vi_meaning", "strokes", "example_words"],
        }
    };

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText) as WritingPromptResponse[];
        
        // Filter to ensure only single characters are in the pool
        const validatedResult = result.filter(item => item.hanzi && item.hanzi.length === 1);
        
        if (validatedResult.length > 0) {
            try {
                sessionStorage.setItem(cacheKey, JSON.stringify(validatedResult));
            } catch (e) {
                console.warn("Could not write writing prompt pool to sessionStorage", e);
            }
        }

        return validatedResult;
    } catch (error) {
        console.error(`Error fetching writing prompt pool for HSK level ${level}:`, error);
        throw new Error("Failed to fetch writing prompt pool from Gemini API.");
    }
};


/**
 * Fetches a writing prompt based on a user-provided keyword (Vietnamese or Hanzi).
 * @param keyword The user's search term.
 * @returns A promise that resolves to an object containing hanzi, pinyin, Vietnamese meaning, stroke paths, and example words.
 */
export const fetchWritingPromptByKeyword = async (keyword: string): Promise<WritingPromptResponse> => {
    const model = 'gemini-2.5-flash';
    const prompt = `A user wants to practice writing a single Chinese character related to the keyword: "${keyword}". 
Find the most relevant single simplified Chinese character for this keyword. If the keyword is a multi-character word, pick the most important or common character from it.
Provide:
1.  The single simplified Hanzi character.
2.  The Pinyin romanization.
3.  The Vietnamese meaning.
4.  An array of SVG path strings for the stroke order. The SVG viewbox should be 1024x1024.
5.  An array of 2-3 common example words that use this character, including the full word, its pinyin, and its Vietnamese meaning.
`;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            hanzi: { type: Type.STRING, description: "The single character in Chinese (Hanzi)." },
            pinyin: { type: Type.STRING, description: "The Pinyin romanization." },
            vi_meaning: { type: Type.STRING, description: "The Vietnamese meaning." },
            strokes: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "An array of SVG path strings representing the correct stroke order."
            },
             example_words: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        word: { type: Type.STRING, description: "The example word in Chinese." },
                        pinyin: { type: Type.STRING, description: "Pinyin for the example word." },
                        meaning_vi: { type: Type.STRING, description: "Vietnamese meaning for the example word." }
                    },
                    required: ["word", "pinyin", "meaning_vi"]
                }
            }
        },
        required: ["hanzi", "pinyin", "vi_meaning", "strokes", "example_words"],
    };

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        if (result.hanzi && result.hanzi.length > 1) {
             console.warn("Gemini returned a multi-character string, taking the first character.");
             result.hanzi = result.hanzi.charAt(0);
        }
        return result as WritingPromptResponse;
    } catch (error) {
        console.error(`Error fetching writing prompt for keyword "${keyword}":`, error);
        throw new Error("Failed to fetch writing prompt from Gemini API.");
    }
};

/**
 * Fetches a complete, unique HSK exam for a given level.
 * @param level The HSK level for the exam.
 * @returns A promise that resolves to an array of exam questions.
 */
export const fetchHskExam = async (level: HSKLevel): Promise<ExamQuestion[]> => {
    const model = 'gemini-2.5-flash';
    const totalQuestions = 40; // All exams now have 40 questions.

    const prompt = `
        Generate a complete and unique HSK level ${level} mock exam with exactly ${totalQuestions} questions.
        The exam must be different every time this prompt is called.
        The questions should be divided into three sections: 'Nghe hiểu' (Listening Comprehension), 'Đọc hiểu' (Reading Comprehension), and 'Viết' (Writing, e.g., sentence completion, grammar).
        For each question, provide:
        1.  'section': The section name ('Nghe hiểu', 'Đọc hiểu', or 'Viết').
        2.  'question_text': The main text of the question. For 'Nghe hiểu', this is the question part, not the audio part.
        3.  'audio_script': (ONLY for 'Nghe hiểu' section) The text that should be read aloud to the user. For other sections, this should be null or omitted.
        4.  'options': An array of 4 distinct multiple-choice options.
        5.  'correct_answer': The exact string of the correct option from the 'options' array.
        6.  'explanation': A brief, clear explanation in Vietnamese explaining why the correct answer is right.
    `;

    const responseSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                section: { type: Type.STRING, description: "Section: 'Nghe hiểu', 'Đọc hiểu', or 'Viết'." },
                question_text: { type: Type.STRING, description: "The question text." },
                audio_script: { type: Type.STRING, description: "Text to be read for listening questions. Null for others." },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correct_answer: { type: Type.STRING, description: "The correct answer string." },
                explanation: { type: Type.STRING, description: "Explanation in Vietnamese." }
            },
            required: ["section", "question_text", "options", "correct_answer", "explanation"],
        }
    };

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        // Ensure exactly 40 questions are returned
        if (Array.isArray(result) && result.length > totalQuestions) {
            return result.slice(0, totalQuestions);
        }
        return result as ExamQuestion[];
    } catch (error) {
        console.error(`Error fetching HSK level ${level} exam:`, error);
        throw new Error("Failed to fetch HSK exam from Gemini API.");
    }
};