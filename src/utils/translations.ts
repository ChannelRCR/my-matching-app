export const translateCompanySize = (size: string | undefined): string => {
    switch (size) {
        case 'Listed': return '上場企業';
        case 'Large': return '大手企業';
        case 'SMB': return '中小企業';
        case 'Individual': return '個人（企業）';
        default: return size || '不明';
    }
};
