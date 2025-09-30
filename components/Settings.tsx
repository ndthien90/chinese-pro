import React, { useState, useEffect, useMemo } from 'react';
import { getHistory } from '../services/historyService';
import { HistoryItem, ActiveView } from '../types';

const ChartBarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const StarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.539 1.118l-3.975-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.539-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>;
const ActivityIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M4 12h16M20 20v-5h-5" /></svg>;


interface Stats {
    totalActivities: number;
    featureUsage: Record<string, number>;
    mostUsedFeature: string;
}

const Settings: React.FC = () => {
    const [stats, setStats] = useState<Stats | null>(null);

    useEffect(() => {
        const history = getHistory();
        if (history.length === 0) {
            setStats({ totalActivities: 0, featureUsage: {}, mostUsedFeature: 'Chưa có' });
            return;
        }

        const featureUsage = history.reduce((acc, item) => {
            acc[item.type] = (acc[item.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const mostUsedFeature = Object.keys(featureUsage).reduce((a, b) =>
            featureUsage[a] > featureUsage[b] ? a : b,
            'N/A'
        );

        setStats({
            totalActivities: history.length,
            featureUsage,
            mostUsedFeature,
        });
    }, []);
    
    const sortedFeatures = useMemo(() => {
        if (!stats) return [];
        return Object.entries(stats.featureUsage).sort(([, a], [, b]) => b - a);
    }, [stats]);


    if (!stats) {
        return (
            <div className="text-center">
                <p>Đang tải thống kê...</p>
            </div>
        );
    }
    
    return (
        <div>
            <h2 className="text-3xl font-bold mb-6 text-primary">Cài đặt & Thống kê</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-primary p-6 rounded-lg shadow-lg flex items-center">
                    <div className="bg-white/20 p-3 rounded-full mr-4"><ActivityIcon/></div>
                    <div>
                        <p className="text-lg text-white/80">Tổng hoạt động</p>
                        <p className="text-3xl font-bold text-white">{stats.totalActivities}</p>
                    </div>
                </div>
                <div className="bg-accent p-6 rounded-lg shadow-lg flex items-center">
                    <div className="bg-white/20 p-3 rounded-full mr-4"><StarIcon/></div>
                    <div>
                        <p className="text-lg text-white/80">Tính năng yêu thích</p>
                        <p className="text-3xl font-bold text-white">{stats.mostUsedFeature}</p>
                    </div>
                </div>
                 <div className="bg-blue-500 p-6 rounded-lg shadow-lg flex items-center">
                    <div className="bg-white/20 p-3 rounded-full mr-4"><ChartBarIcon/></div>
                    <div>
                        <p className="text-lg text-white/80">Tính năng đã dùng</p>
                        <p className="text-3xl font-bold text-white">{Object.keys(stats.featureUsage).length}</p>
                    </div>
                </div>
            </div>

            <div className="mt-10 bg-light-card dark:bg-dark-card p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-bold mb-4">Thống kê chi tiết</h3>
                {sortedFeatures.length > 0 ? (
                    <div className="space-y-4">
                        {sortedFeatures.map(([feature, count]) => (
                            <div key={feature}>
                                <div className="flex justify-between mb-1">
                                    <span className="font-semibold">{feature}</span>
                                    <span>{count} lần</span>
                                </div>
                                <div className="w-full bg-light-border dark:bg-dark-border rounded-full h-4">
                                    <div 
                                        className="bg-primary h-4 rounded-full" 
                                        style={{ width: `${(count / stats.totalActivities) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500">Chưa có hoạt động nào được ghi lại.</p>
                )}
            </div>
        </div>
    );
};

export default Settings;