export const isLineBrowser = (): boolean => {
    if (typeof window === 'undefined') return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera || "";
    return ua.indexOf("Line") > -1 || ua.indexOf("LINE") > -1;
};
