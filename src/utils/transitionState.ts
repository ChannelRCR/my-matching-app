// --- ULTIMATE ESCAPE: Global Transition Flag ---
// This file exists to hold the global transition state without throwing React Fast Refresh ESLint rules in DataContext.

export let isTransitioning = false;

export const setTransitioning = (val: boolean) => {
    isTransitioning = val;
    console.log("Ultimate Escape Flag Set: isTransitioning =", isTransitioning);
};
