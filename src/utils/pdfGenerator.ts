import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import type { Deal, Invoice, User } from '../types';

export const generateContractPDF = async (deal: Deal, invoice: Invoice, seller: User, buyer: User): Promise<void> => {
    // 1. Create a wrapper div to contain the HTML template
    const wrapper = document.createElement('div');
    // Hide it by moving it far off-screen, but keeping it visible to the rendering engine
    wrapper.style.position = 'absolute';
    wrapper.style.top = '-9999px';
    wrapper.style.left = '-9999px';
    // Explicitly define a fixed pixel width that corresponds to high-res A4 approx proportions
    wrapper.style.width = '800px';
    wrapper.style.minHeight = '1131px'; // A4 proportional height for 800px width
    wrapper.style.backgroundColor = '#ffffff'; // CRITICAL: Explicit solid white background
    wrapper.style.color = '#000000';
    // Use padding in pixels for predictable rendering
    wrapper.style.padding = '80px';
    wrapper.style.boxSizing = 'border-box';
    // Use system-level Japanese fonts to ensure correct and beautiful rendering
    wrapper.style.fontFamily = '"Noto Sans JP", "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Meiryo", sans-serif';
    wrapper.style.zIndex = '-9999';

    const contractDate = deal.contractDate ? new Date(deal.contractDate) : new Date();
    const formattedDate = `${contractDate.getFullYear()}年${contractDate.getMonth() + 1}月${contractDate.getDate()}日`;

    wrapper.innerHTML = `
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

    document.body.appendChild(wrapper);

    try {
        // Yield to browser to ensure DOM is fully painted and fonts are applied
        await new Promise(resolve => setTimeout(resolve, 300));

        // 2. Render HTML to image data using html-to-image
        const imgData = await toPng(wrapper, {
            pixelRatio: 2, // Double resolution for crisp text
            backgroundColor: '#ffffff'
        });

        // 3. Embed image in jsPDF
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        // Calculate proportional height based on the DOM element's dimensions
        const pdfHeight = (wrapper.offsetHeight * pdfWidth) / wrapper.offsetWidth;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`債権譲渡契約書_${deal.id}.pdf`);
    } catch (error) {
        console.error("PDF canvas generation failed:", error);
        throw new Error("PDFの生成に失敗しました。詳細: " + String(error));
    } finally {
        // 4. Cleanup temporary DOM element
        if (wrapper.parentNode) {
            wrapper.parentNode.removeChild(wrapper);
        }
    }
};
