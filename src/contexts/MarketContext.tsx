import React, { createContext, useContext, useState } from 'react';
import { MOCK_ADMIN_STATS } from '../data/mockData';

interface MarketStats {
    totalVolume: number;
    completedDeals: number;
    averageDiscountRate: number;
    avgFundingDays: number;
    activeUsers: number;
    accidentRate: number;
}

interface MarketContextType {
    stats: MarketStats;
    completeDeal: (faceValue: number, offerAmount: number) => void;
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);

export const MarketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Initialize with mock data to look real initially
    const [stats, setStats] = useState<MarketStats>({
        totalVolume: MOCK_ADMIN_STATS.totalVolume,
        completedDeals: 124, // Mock initial count matching volume
        averageDiscountRate: MOCK_ADMIN_STATS.avgDiscountRate,
        avgFundingDays: MOCK_ADMIN_STATS.avgFundingDays,
        activeUsers: MOCK_ADMIN_STATS.activeUsers,
        accidentRate: MOCK_ADMIN_STATS.accidentRate,
    });

    const completeDeal = (faceValue: number, offerAmount: number) => {
        setStats(prev => {
            const newTotalVolume = prev.totalVolume + offerAmount;
            const newCompletedDeals = prev.completedDeals + 1;

            // Calculate new average discount rate
            // Discount rate for this deal = (FaceValue - OfferAmount) / FaceValue * 100
            const thisDealDiscountRate = ((faceValue - offerAmount) / faceValue) * 100;

            // Simple moving average update
            // (OldAvg * OldCount + NewRate) / NewCount
            const newAvgDiscountRate = ((prev.averageDiscountRate * prev.completedDeals) + thisDealDiscountRate) / newCompletedDeals;

            return {
                ...prev,
                totalVolume: newTotalVolume,
                completedDeals: newCompletedDeals,
                averageDiscountRate: Number(newAvgDiscountRate.toFixed(1)), // Keep 1 decimal
            };
        });
    };

    return (
        <MarketContext.Provider value={{ stats, completeDeal }}>
            {children}
        </MarketContext.Provider>
    );
};

export const useMarket = () => {
    const context = useContext(MarketContext);
    if (context === undefined) {
        throw new Error('useMarket must be used within a MarketProvider');
    }
    return context;
};
