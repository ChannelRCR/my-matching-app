import jsPDF from 'jspdf';
import type { Deal, Invoice, User } from '../types';

export const generateContractPDF = async (deal: Deal, invoice: Invoice, seller: User, buyer: User) => {
    // A4 Portrait
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

    // Load local bundled font served from public directory
    const fontUrl = '/fonts/NotoSansJP-Regular.ttf';

    const response = await fetch(fontUrl);
    if (!response.ok) {
        throw new Error(`フォントの読み込みに失敗しました (${response.status} ${response.statusText})`);
    }

    const blob = await response.blob();
    const base64Font = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                // reader.result has the format "data:font/ttf;base64,...base64data..."
                const parts = reader.result.split(',');
                if (parts.length === 2) {
                    resolve(parts[1]);
                } else {
                    reject(new Error("フォントデータのパースに失敗しました"));
                }
            } else {
                reject(new Error("FileReader result is not a string"));
            }
        };
        reader.onerror = () => reject(new Error("フォントファイルの読み込みエラー"));
        reader.readAsDataURL(blob);
    });

    doc.addFileToVFS('NotoSansJP.ttf', base64Font);
    doc.addFont('NotoSansJP.ttf', 'NotoSansJP', 'normal');
    doc.setFont('NotoSansJP');

    doc.setFontSize(18);
    doc.text('債権譲渡契約書（重要事項説明）', 105, 20, { align: 'center' });

    doc.setFontSize(12);
    const contractDate = deal.contractDate ? new Date(deal.contractDate) : new Date();
    doc.text(`契約締結日: ${contractDate.getFullYear()}年${contractDate.getMonth() + 1}月${contractDate.getDate()}日`, 190, 35, { align: 'right' });

    // Parties
    doc.text(`譲渡人（甲）: ${seller.companyName || seller.name}`, 20, 50);
    if (seller.representativeName) {
        doc.text(`代表者: ${seller.representativeName}`, 20, 58);
    }

    doc.text(`譲受人（乙）: ${buyer.companyName || buyer.name}`, 20, 70);
    if (buyer.representativeName) {
        doc.text(`代表者: ${buyer.representativeName}`, 20, 78);
    }

    doc.text('甲と乙は、以下の内容にて債権譲渡契約を締結する。', 20, 95);

    doc.setFontSize(14);
    doc.text('1. 譲渡対象債権', 20, 110);
    doc.setFontSize(12);
    doc.text(`債務者名: ${invoice.debtorName || '未設定'}`, 30, 120);
    doc.text(`額面金額: ${invoice.amount.toLocaleString()} 円`, 30, 128);
    doc.text(`支払期日: ${invoice.dueDate || '未設定'}`, 30, 136);

    doc.setFontSize(14);
    doc.text('2. 譲渡代金', 20, 151);
    doc.setFontSize(12);
    doc.text(`金 ${deal.currentAmount.toLocaleString()} 円`, 30, 161);

    doc.setFontSize(14);
    doc.text('3. 権利移転時期', 20, 176);
    doc.setFontSize(12);
    doc.text('本件債権の権利は、乙（買い手）が譲渡代金の全額を支払い、', 30, 186);
    doc.text('甲（売り手）がこれを受領した時に移転するものとする。', 30, 194);

    doc.setFontSize(14);
    doc.text('4. 約款の引用', 20, 209);
    doc.setFontSize(12);
    // Multi-line
    const termsText = [
        '本契約書に記載のない事項については、',
        '当プラットフォームの利用規約および債権譲渡約款の定めるところによる。'
    ];
    doc.text(termsText, 30, 219);

    doc.save(`債権譲渡契約書_${deal.id}.pdf`);
};
