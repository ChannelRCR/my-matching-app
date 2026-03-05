import { useState, useMemo } from 'react';
import type { Invoice } from '../types';

export function useInvoiceFilter(initialInvoices: Invoice[]) {
    const [minAmount, setMinAmount] = useState('');
    const [maxAmount, setMaxAmount] = useState('');
    const [industryFilter, setIndustryFilter] = useState('');
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
    }, [initialInvoices, minAmount, maxAmount, industryFilter, sortBy]);

    const resetFilters = () => {
        setMinAmount('');
        setMaxAmount('');
        setIndustryFilter('');
        setSortBy('newest');
    };

    return {
        minAmount, setMinAmount,
        maxAmount, setMaxAmount,
        industryFilter, setIndustryFilter,
        sortBy, setSortBy,
        isFilterOpen, setIsFilterOpen,
        filteredAndSortedInvoices,
        resetFilters
    };
}
