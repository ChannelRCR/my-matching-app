export const fetchAddressFromZip = async (zipCode: string): Promise<string | null> => {
    try {
        const cleanedZip = zipCode.replace(/[^\d]/g, '');
        if (cleanedZip.length !== 7) return null;

        const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleanedZip}`);
        if (!response.ok) return null;

        const data = await response.json();

        if (data.status === 200 && data.results && data.results.length > 0) {
            const result = data.results[0];
            return `${result.address1}${result.address2}${result.address3}`;
        }

        return null;
    } catch (error) {
        console.error("Failed to fetch address:", error);
        return null;
    }
};
