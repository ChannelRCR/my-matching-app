export const calculateAnnualYield = (sellingAmount: number, requestedAmount: number, dueDate: string): number => {
    if (!sellingAmount || !requestedAmount || !dueDate) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(dueDate);
    targetDate.setHours(0, 0, 0, 0);

    // Calculate difference in days
    const diffTime = targetDate.getTime() - today.getTime();
    let days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // If overdue or today, assume 1 day to prevent infinity/negative
    if (days <= 0) {
        days = 1;
    }

    const interest = sellingAmount - requestedAmount;
    if (interest <= 0) return 0;

    const principal = requestedAmount;

    // Yield formula: (Interest / Principal) * (365 / days) * 100
    const yieldPercentage = (interest / principal) * (365 / days) * 100;

    return yieldPercentage;
};
