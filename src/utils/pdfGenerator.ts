import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Deal, Invoice, User } from '../types';

export const generateContractPDF = async (deal: Deal, invoice: Invoice, seller: User, buyer: User): Promise<void> => {
    // 1. Create a hidden container for the HTML template
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '210mm'; // A4 width
    // Use Noto Sans JP or standard system Japanese fonts to ensure correct rendering
    container.style.fontFamily = '"Noto Sans JP", "Hiragino Sans", "Meiryo", sans-serif';
    container.style.backgroundColor = 'white';
    container.style.color = '#000';
    container.style.padding = '20mm';
    container.style.boxSizing = 'border-box';

    const contractDate = deal.contractDate ? new Date(deal.contractDate) : new Date();
    const formattedDate = `${contractDate.getFullYear()}年${contractDate.getMonth() + 1}月${contractDate.getDate()}日`;

    container.innerHTML = `
        <div style="text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 30px;">債権譲渡契約書（重要事項説明）</div>
        
        <div style="text-align: right; font-size: 14px; margin-bottom: 40px;">契約締結日: ${formattedDate}</div>
        
        <div style="font-size: 14px; margin-bottom: 30px; line-height: 1.8;">
            <div>譲渡人（甲）: ${seller.companyName || seller.name}</div>
            ${seller.representativeName ? `<div>代表者: ${seller.representativeName}</div>` : ''}
            <div style="margin-top: 15px;">譲受人（乙）: ${buyer.companyName || buyer.name}</div>
            ${buyer.representativeName ? `<div>代表者: ${buyer.representativeName}</div>` : ''}
        </div>
        
        <div style="font-size: 14px; margin-bottom: 30px;">
            甲と乙は、以下の内容にて債権譲渡契約を締結する。
        </div>

        <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">1. 譲渡対象債権</div>
        <div style="font-size: 14px; margin-left: 20px; margin-bottom: 25px; line-height: 1.6;">
            <div>債務者名: ${invoice.debtorName || '未設定'}</div>
            <div>額面金額: ${invoice.amount.toLocaleString()} 円</div>
            <div>支払期日: ${invoice.dueDate || '未設定'}</div>
        </div>

        <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">2. 譲渡代金</div>
        <div style="font-size: 14px; margin-left: 20px; margin-bottom: 25px;">
            金 ${deal.currentAmount.toLocaleString()} 円
        </div>

        <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">3. 権利移転時期</div>
        <div style="font-size: 14px; margin-left: 20px; margin-bottom: 25px; line-height: 1.6;">
            本件債権の権利は、乙（買い手）が譲渡代金の全額を支払い、<br>
            甲（売り手）がこれを受領した時に移転するものとする。
        </div>

        <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">4. 約款の引用</div>
        <div style="font-size: 14px; margin-left: 20px; margin-bottom: 25px; line-height: 1.6;">
            本契約書に記載のない事項については、<br>
            当プラットフォームの利用規約および債権譲渡約款の定めるところによる。
        </div>
    `;

    document.body.appendChild(container);

    try {
        // 2. Render HTML to canvas
        const canvas = await html2canvas(container, {
            scale: 2, // High resolution
            useCORS: true,
            logging: false,
            // Ensure fonts are loaded before capturing
            onclone: (clonedDoc) => {
                const clonedEl = clonedDoc.body.lastElementChild as HTMLElement;
                if (clonedEl) clonedEl.style.display = 'block';
            }
        });

        // 3. Embed canvas image to jsPDF
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });

        // A4 dimensions
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`債権譲渡契約書_${deal.id}.pdf`);
    } catch (error) {
        console.error("html2canvas generation failed:", error);
        throw new Error("PDF画像の生成に失敗しました。");
    } finally {
        // Cleanup wrapper
        document.body.removeChild(container);
    }
};
