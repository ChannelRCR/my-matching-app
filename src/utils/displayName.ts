import type { User } from '../types';

/**
 * Generates an appropriate display name for a user based on their entity type,
 * privacy settings, and whether they have a trade name.
 * 
 * @param user The user object containing profile and privacy data
 * @returns A formatted display name string
 */
export const getDisplayName = (user: User | Partial<User> | null | undefined): string => {
    if (!user) return '不明なユーザー';

    // Helper to get fallback if all else fails
    const getFallback = () => user.companyName || user.name || `ユーザー (${user.id?.substring(0, 8)})`;

    // 1. Check if companyName/tradeName is marked as private
    // Note: The privacySettings field might not be loaded in all contexts (e.g. basic invoice lists).
    // If it's explicitly set to false, it is private. If undefined, we assume public (or handle via RLS).
    const isCompanyPrivate = user.privacySettings?.companyName === false;

    if (isCompanyPrivate) {
        return `非公開 (ID: ${user.id?.substring(0, 8) || '不明'})`;
    }

    // 2. Handle Individual with "No Trade Name"
    if (user.entityType === 'individual' && user.hasNoTradeName) {
        // Fall back to representative name if it exists, since they have no trade name
        if (user.representativeName) {
            // Check privacy for representative name
            if (user.privacySettings?.representativeName === false) {
                return `非公開 (ID: ${user.id?.substring(0, 8) || '不明'})`;
            }
            return user.representativeName;
        }
    }

    // 3. Default: Return Company Name / Trade Name
    return user.companyName || getFallback();
};
