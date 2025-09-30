import { HistoryItem, HistoryContent, ActiveView } from '../types';

const HISTORY_KEY = 'hskBuddyHistory';
const MAX_HISTORY_ITEMS = 50; // Limit the number of items to prevent excessive storage usage

/**
 * Retrieves the user's activity history from localStorage.
 * @returns An array of HistoryItem objects.
 */
export const getHistory = (): HistoryItem[] => {
    try {
        const historyJson = localStorage.getItem(HISTORY_KEY);
        return historyJson ? JSON.parse(historyJson) : [];
    } catch (error) {
        console.error("Failed to parse history from localStorage", error);
        return [];
    }
};

/**
 * Adds a new item to the user's activity history.
 * @param type The type of activity (e.g., Translator, Dictionary).
 * @param summary A short text summary of the activity.
 * @param content The detailed content of the activity result.
 */
export const addHistoryItem = (
    type: HistoryItem['type'],
    summary: string,
    content: HistoryContent
): void => {
    try {
        const currentHistory = getHistory();
        
        const newItem: HistoryItem = {
            id: `${new Date().toISOString()}-${Math.random()}`,
            type,
            summary,
            content,
            timestamp: new Date().toISOString(),
        };

        // Add the new item to the beginning and trim the array if it's too long
        const updatedHistory = [newItem, ...currentHistory].slice(0, MAX_HISTORY_ITEMS);

        localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
    } catch (error) {
        console.error("Failed to save history to localStorage", error);
    }
};

/**
 * Clears all activity history from localStorage.
 */
export const clearHistory = (): void => {
    try {
        localStorage.removeItem(HISTORY_KEY);
    } catch (error) {
        console.error("Failed to clear history from localStorage", error);
    }
};
