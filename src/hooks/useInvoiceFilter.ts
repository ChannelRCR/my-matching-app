import { useState, useMemo } from 'react';
import type { Invoice } from '../types';

export function useInvoiceFilter(
    initialInvoices: Invoice[], 
    getTrackRecord?: (sellerId: string) => number,
    getSellerIndustry?: (sellerId: string) => string | undefined
) {
    const [minAmount, setMinAmount] = useState('');
    const [maxAmount, setMaxAmount] = useState('');
    const [industryFilter, setIndustryFilter] = useState('');
    const [sellerIndustryFilter, setSellerIndustryFilter] = useState('');
    const [trackRecordFilter, setTrackRecordFilter] = useState('');
    const [sortBy, setSortBy] = useState('newest'); // 'newest', 'priceDesc', 'priceAsc'
    const [isFilterOpen, setIsFilterOpen] = useState(false); // For mobile tracking

    const filteredAndSortedInvoices = useMemo(() => {
        let result = [...initialInvoices];

        // Filtering
        if (minAmount) {
            result = result.filter(inv => (inv.requestedAmount || 0) >= Number(minAmount));
        }
        if (maxAmount) {
            result = result.filter(inv => (inv.requestedAmount || 0) <= Number(maxAmount));
        }
        if (industryFilter) {
            result = result.filter(inv => inv.industry.includes(industryFilter));
        }
        if (sellerIndustryFilter && getSellerIndustry) {
            result = result.filter(inv => {
                const sIndustry = getSellerIndustry(inv.sellerId);
                return sIndustry && sIndustry.includes(sellerIndustryFilter);
            });
        }
        if (trackRecordFilter && getTrackRecord) {
            result = result.filter(inv => {
                const tr = getTrackRecord(inv.sellerId);
                if (trackRecordFilter === '0') return tr === 0;
                if (trackRecordFilter === '2') return tr === 2;
                if (trackRecordFilter === '3+') return tr >= 3;
                if (trackRecordFilter === '10+') return tr >= 10;
                return true;
            });
        }

        // Sorting
        result.sort((a, b) => {
            if (sortBy === 'priceDesc') {
                return (b.requestedAmount || 0) - (a.requestedAmount || 0);
            } else if (sortBy === 'priceAsc') {
                return (a.requestedAmount || 0) - (b.requestedAmount || 0);
            } else {
                // newest default
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA;
            }
        });

        return result;
    }, [initialInvoices, minAmount, maxAmount, industryFilter, sellerIndustryFilter, sortBy, trackRecordFilter, getTrackRecord, getSellerIndustry]);

    const resetFilters = () => {
        setMinAmount('');
        setMaxAmount('');
        setIndustryFilter('');
        setSellerIndustryFilter('');
        setTrackRecordFilter('');
        setSortBy('newest');
    };

    return {
        minAmount, setMinAmount,
        maxAmount, setMaxAmount,
        industryFilter, setIndustryFilter,
        sellerIndustryFilter, setSellerIndustryFilter,
        trackRecordFilter, setTrackRecordFilter,
        sortBy, setSortBy,
        isFilterOpen, setIsFilterOpen,
        filteredAndSortedInvoices,
        resetFilters,
        showTrackRecordFilter: !!getTrackRecord,
        showSellerIndustryFilter: !!getSellerIndustry
    };
}
