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
        <div style={{ fontFamily: '"Noto Serif JP", "Hiragino Mincho ProN", "MS PMincho", serif', width: '100%', color: '#000' }}>
            <h1 style={{ textAlign: 'center', fontSize: '24px', fontWeight: 'bold', marginBottom: '40px', letterSpacing: '2px' }}>
                債権譲渡契約書
            </h1>

            <div style={{ textAlign: 'right', fontSize: '12px', marginBottom: '30px' }}>
                契約締結日: {formattedDate}
            </div>

            <div style={{ fontSize: '13px', marginBottom: '30px', lineHeight: 1.8, textIndent: '1em' }}>
                譲渡人（以下「甲」という）と、譲受人（以下「乙」という）は、当プラットフォームを通じて、以下の通り債権譲渡契約（以下「本契約」という）を締結した。
            </div>

            <h2 style={{ fontSize: '15px', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '5px', marginBottom: '15px', marginTop: '30px' }}>
                第1条（譲渡対象債権）
            </h2>
            <div style={{ fontSize: '13px', marginLeft: '20px', marginBottom: '20px', lineHeight: 1.8 }}>
                甲は乙に対し、甲が以下の原債務者に対して有する売掛債権（以下「本件債権」という）を譲渡し、乙はこれを譲り受けた。
                <table style={{ width: '90%', marginTop: '10px', borderCollapse: 'collapse', border: '1px solid #000', fontSize: '12px' }}>
                    <tbody>
                        <tr>
                            <td style={{ border: '1px solid #000', padding: '8px', backgroundColor: '#f9f9f9', width: '30%' }}>原債務者名</td>
                            <td style={{ border: '1px solid #000', padding: '8px' }}>{invoice.debtorName || '未設定'}</td>
                        </tr>
                        <tr>
                            <td style={{ border: '1px solid #000', padding: '8px', backgroundColor: '#f9f9f9' }}>債権額面金額</td>
                            <td style={{ border: '1px solid #000', padding: '8px' }}>金 {invoice.amount.toLocaleString()} 円</td>
                        </tr>
                        <tr>
                            <td style={{ border: '1px solid #000', padding: '8px', backgroundColor: '#f9f9f9' }}>支払期日</td>
                            <td style={{ border: '1px solid #000', padding: '8px' }}>{invoice.dueDate || '未設定'}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <h2 style={{ fontSize: '15px', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '5px', marginBottom: '15px', marginTop: '30px' }}>
                第2条（譲渡代金および支払方法）
            </h2>
            <div style={{ fontSize: '13px', marginLeft: '20px', marginBottom: '20px', lineHeight: 1.8 }}>
                乙は甲に対し、本件債権の譲受代金として以下の金額を、別途当事者間で合意した銀行口座に振り込む方法により支払う。なお、振込手数料は乙の負担とする。<br />
                <strong>譲渡代金: 金 {deal.currentAmount.toLocaleString()} 円</strong>
            </div>

            <h2 style={{ fontSize: '15px', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '5px', marginBottom: '15px', marginTop: '30px' }}>
                第3条（権利移転時期および対抗要件）
            </h2>
            <div style={{ fontSize: '13px', marginLeft: '20px', marginBottom: '20px', lineHeight: 1.8 }}>
                1. 本件債権の権利は、乙が甲に対して前条の譲渡代金全額を支払い、甲がこれを受領した時点で、甲から乙へ移転するものとする。<br />
                2. 甲は、乙の請求があるときは、本件債権の譲渡について、原債務者に対する確定日付のある証書による譲渡通知、または原債務者の承諾を取得するための手続きに協力するものとする。
            </div>

            <h2 style={{ fontSize: '15px', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '5px', marginBottom: '15px', marginTop: '30px' }}>
                第4条（表明および保証）
            </h2>
            <div style={{ fontSize: '13px', marginLeft: '20px', marginBottom: '20px', lineHeight: 1.8 }}>
                甲は乙に対し、本契約締結日時点において以下の事項が真実かつ正確であることを表明し、保証する。<br />
                (1) 本件債権が有効に存在し、弁済期日が到来していないこと。<br />
                (2) 本件債権につき、第三者の担保権、差押え等の負担が付着していないこと。<br />
                (3) 原債務者との間で、債権譲渡を禁止または制限する特約が存在しないこと。
            </div>

            <h2 style={{ fontSize: '15px', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '5px', marginBottom: '15px', marginTop: '30px' }}>
                第5条（その他約款の適用）
            </h2>
            <div style={{ fontSize: '13px', marginLeft: '20px', marginBottom: '40px', lineHeight: 1.8 }}>
                本契約に定めのない事項、または本契約の解釈に疑義が生じた事項については、当プラットフォームの「プラットフォーム利用約款および債権譲渡契約条項」の規定が適用されるものとし、当事者間で誠実に協議のうえ解決するものとする。
            </div>

            <div style={{ fontSize: '13px', marginBottom: '50px', lineHeight: 1.8, textIndent: '1em' }}>
                本契約の成立を証するため、本電磁的記録を作成し、甲および乙は各々保有するものとする。
            </div>

            {/* 署名欄 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '60px', padding: '0 20px' }}>
                <div style={{ width: '45%' }}>
                    <div style={{ fontSize: '13px', marginBottom: '20px' }}>（甲）譲渡人</div>
                    <div style={{ fontSize: '13px', lineHeight: 2, borderBottom: '1px dotted #999', marginBottom: '10px' }}>
                        住所: {seller.address || ''}
                    </div>
                    <div style={{ fontSize: '13px', lineHeight: 2, borderBottom: '1px dotted #999', marginBottom: '10px' }}>
                        企業名: {seller.companyName || seller.name || ''}
                    </div>
                    <div style={{ fontSize: '13px', lineHeight: 2, borderBottom: '1px dotted #999', marginBottom: '10px', position: 'relative' }}>
                        代表者: {seller.representativeName || ''}
                        <div style={{ position: 'absolute', right: '10px', top: '-10px', color: '#ccc', border: '1px solid #ccc', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>印</div>
                    </div>
                </div>

                <div style={{ width: '45%' }}>
                    <div style={{ fontSize: '13px', marginBottom: '20px' }}>（乙）譲受人</div>
                    <div style={{ fontSize: '13px', lineHeight: 2, borderBottom: '1px dotted #999', marginBottom: '10px' }}>
                        住所: {buyer.address || ''}
                    </div>
                    <div style={{ fontSize: '13px', lineHeight: 2, borderBottom: '1px dotted #999', marginBottom: '10px' }}>
                        企業名: {buyer.companyName || buyer.name || ''}
                    </div>
                    <div style={{ fontSize: '13px', lineHeight: 2, borderBottom: '1px dotted #999', marginBottom: '10px', position: 'relative' }}>
                        代表者: {buyer.representativeName || ''}
                        <div style={{ position: 'absolute', right: '10px', top: '-10px', color: '#ccc', border: '1px solid #ccc', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>印</div>
                    </div>
                </div>
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
