import React, { useState, useEffect } from 'react';

const LookUpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l-1.586-1.586a2 2 0 00-2.828 0L6 14m6-6l.01.01" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const PracticeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

const UsageStats: React.FC = () => {
    const [stats, setStats] = useState({
        todayLookups: 0,
        todayPractice: 0,
        monthLookups: 0,
        monthPractice: 0,
    });

    useEffect(() => {
        // Initialize with random values
        setStats({
            todayLookups: Math.floor(Math.random() * 500) + 100,
            todayPractice: Math.floor(Math.random() * 50) + 5,
            monthLookups: Math.floor(Math.random() * 5000) + 2000,
            monthPractice: Math.floor(Math.random() * 500) + 100,
        });

        const interval = setInterval(() => {
            setStats(prevStats => ({
                ...prevStats,
                todayLookups: prevStats.todayLookups + Math.floor(Math.random() * 3),
                todayPractice: prevStats.todayPractice + (Math.random() > 0.8 ? 1 : 0),
                monthLookups: prevStats.monthLookups + Math.floor(Math.random() * 3),
                monthPractice: prevStats.monthPractice + (Math.random() > 0.8 ? 1 : 0),
            }));
        }, 3000); // Update every 3 seconds

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="p-4 bg-light-bg dark:bg-dark-bg/50 rounded-lg border border-light-border dark:border-dark-border mt-4">
            <h3 className="font-bold mb-3 text-center text-sm md:text-base">Thống kê sử dụng</h3>
            <div className="flex justify-around text-sm md:text-base">
                <div className="text-center">
                    <p className="font-semibold mb-2">Hôm nay</p>
                    <div className="flex items-center space-x-2">
                        <LookUpIcon />
                        <span>{stats.todayLookups}</span>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                        <PracticeIcon />
                        <span>{stats.todayPractice}</span>
                    </div>
                </div>
                <div className="text-center">
                    <p className="font-semibold mb-2">Tháng này</p>
                    <div className="flex items-center space-x-2">
                        <LookUpIcon />
                        <span>{stats.monthLookups}</span>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                        <PracticeIcon />
                        <span>{stats.monthPractice}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UsageStats;
