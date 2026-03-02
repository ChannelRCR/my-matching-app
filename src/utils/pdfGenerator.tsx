// React is implicitly imported in Vite/React 18+
import { createRoot } from 'react-dom/client';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import type { Deal, Invoice, User } from '../types';

export const generateContractPDF = async (deal: Deal, invoice: Invoice, seller: User, buyer: User): Promise<void> => {
    // 1. Create a wrapper div to contain the HTML template
    const wrapper = document.createElement('div');

    // IMPORTANT: Do NOT use left/top -9999px or display none.
    // We must render it within the viewport but behind everything else to force the browser to actually paint it.
    wrapper.style.position = 'fixed';
    wrapper.style.top = '0';
    wrapper.style.left = '0';
    wrapper.style.width = '800px'; // Explicit width for rendering
    wrapper.style.backgroundColor = '#ffffff'; // Explicit background to prevent transparency
    wrapper.style.color = '#000000';
    wrapper.style.padding = '80px';
    wrapper.style.boxSizing = 'border-box';
    wrapper.style.zIndex = '-9999'; // Behind all other UI

    // Mount to DOM so browser can begin layout/paint
    document.body.appendChild(wrapper);

    // 2. Build the UI as a React Component to ensure styles and fonts apply normally
    const contractDate = deal.contractDate ? new Date(deal.contractDate) : new Date();
    const formattedDate = `${contractDate.getFullYear()}年${contractDate.getMonth() + 1}月${contractDate.getDate()}日`;

    const ContractComponent = () => (
        <div style={{ fontFamily: '"Noto Sans JP", "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Meiryo", sans-serif', width: '100%' }}>
            <div style={{ textAlign: 'center', fontSize: '24px', fontWeight: 'bold', marginBottom: '30px' }}>債権譲渡契約書（重要事項説明）</div>

            <div style={{ textAlign: 'right', fontSize: '14px', marginBottom: '40px' }}>契約締結日: {formattedDate}</div>

            <div style={{ fontSize: '14px', marginBottom: '30px', lineHeight: 1.8 }}>
                <div>譲渡人（甲）: {seller.companyName || seller.name}</div>
                {seller.representativeName && <div>代表者: {seller.representativeName}</div>}
                <div style={{ marginTop: '15px' }}>譲受人（乙）: {buyer.companyName || buyer.name}</div>
                {buyer.representativeName && <div>代表者: {buyer.representativeName}</div>}
            </div>

            <div style={{ fontSize: '14px', marginBottom: '30px' }}>
                甲と乙は、以下の内容にて債権譲渡契約を締結する。
            </div>

            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>1. 譲渡対象債権</div>
            <div style={{ fontSize: '14px', marginLeft: '20px', marginBottom: '25px', lineHeight: 1.6 }}>
                <div>債務者名: {invoice.debtorName || '未設定'}</div>
                <div>額面金額: {invoice.amount.toLocaleString()} 円</div>
                <div>支払期日: {invoice.dueDate || '未設定'}</div>
            </div>

            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>2. 譲渡代金</div>
            <div style={{ fontSize: '14px', marginLeft: '20px', marginBottom: '25px' }}>
                金 {deal.currentAmount.toLocaleString()} 円
            </div>

            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>3. 権利移転時期</div>
            <div style={{ fontSize: '14px', marginLeft: '20px', marginBottom: '25px', lineHeight: 1.6 }}>
                本件債権の権利は、乙（買い手）が譲渡代金の全額を支払い、<br />
                甲（売り手）がこれを受領した時に移転するものとする。
            </div>

            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>4. 約款の引用</div>
            <div style={{ fontSize: '14px', marginLeft: '20px', marginBottom: '25px', lineHeight: 1.6 }}>
                本契約書に記載のない事項については、<br />
                当プラットフォームの利用規約および債権譲渡約款の定めるところによる。
            </div>
        </div>
    );

    const root = createRoot(wrapper);
    root.render(<ContractComponent />);

    try {
        // 3. FORCE DELAY: Wait 1.5 seconds for React to mount, browser layout to settle, and any fonts to strictly render
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 4. Capture the actual rendered DOM into a PNG
        const imgData = await toPng(wrapper, {
            pixelRatio: 2,
            backgroundColor: '#ffffff'
        });

        // 5. Convert Image to PDF
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (wrapper.offsetHeight * pdfWidth) / wrapper.offsetWidth;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`債権譲渡契約書_${deal.id}.pdf`);
    } catch (error) {
        console.error("PDF canvas generation failed:", error);
        throw new Error("PDF画像の生成に失敗しました。詳細: " + String(error));
    } finally {
        // 6. Cleanup: Unmount React tree and remove wrapper from DOM
        root.unmount();
        if (wrapper.parentNode) {
            wrapper.parentNode.removeChild(wrapper);
        }
    }
};
