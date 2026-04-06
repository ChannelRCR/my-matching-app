import { createRoot } from 'react-dom/client';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import type { Deal, User, Dispute } from '../../types';

export const generateSettlementPDFBlob = async (_deal: Deal, dispute: Dispute, seller: User, buyer: User): Promise<Blob> => {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'absolute';
    wrapper.style.top = '0';
    wrapper.style.left = '0';
    wrapper.style.width = '800px';
    wrapper.style.backgroundColor = '#ffffff';
    wrapper.style.color = '#000000';
    wrapper.style.zIndex = '-9999';

    document.body.appendChild(wrapper);

    const pageContainerStyle: React.CSSProperties = {
        width: '800px',
        minHeight: '1131px',
        padding: '80px',
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
        position: 'relative',
        marginBottom: '20px'
    };

    const settlementDate = new Date();
    const formattedDate = `${settlementDate.getFullYear()}年${settlementDate.getMonth() + 1}月${settlementDate.getDate()}日`;
    
    // 総額（和解請求総額）と月額（月々の分割支払額）の分離
    const claimAmountStr = (dispute.claim_amount || 0).toLocaleString();
    const monthlyAmountStr = (dispute.settlement_amount || 0).toLocaleString();
    const installmentsCount = dispute.installments_count || 1;
    
    // 甲乙の固定：甲（債権者・お金をもらう側）を「買主」、乙（債務者・お金を払う側）を「売主」
    const sellerName = seller.companyName || seller.name; // 乙（債務者・支払義務者）
    const buyerName = buyer.companyName || buyer.name;    // 甲（債権者・受領権者）

    const SettlementComponent = () => (
        <div style={{ fontFamily: '"Noto Serif JP", "Hiragino Mincho ProN", "MS PMincho", serif', color: '#000' }}>
            <div id="pdf-page-settlement-1" style={pageContainerStyle}>
                <h1 style={{ textAlign: 'center', fontSize: '24px', fontWeight: 'bold', marginBottom: '40px', letterSpacing: '2px' }}>
                    和解合意書
                </h1>

                <div style={{ textAlign: 'right', fontSize: '12px', marginBottom: '30px' }}>
                    作成日: {formattedDate}
                </div>

                <div style={{ fontSize: '13px', marginBottom: '30px', lineHeight: 1.8, textIndent: '1em' }}>
                    譲受人（以下「甲」という。）と譲渡人（以下「乙」という。）は、原契約（債権譲渡契約）に関する紛争について、本日以下の通り和解が成立したことを確認する。
                </div>

                <h2 style={{ fontSize: '15px', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '5px', marginBottom: '15px', marginTop: '30px' }}>
                    第1条（和解金の支払い）
                </h2>
                <div style={{ fontSize: '13px', marginLeft: '20px', marginBottom: '20px', lineHeight: 1.8 }}>
                    {installmentsCount === 1 ? (
                        <>乙は甲に対し、本件解決金として金 {claimAmountStr} 円の支払義務があることを認め、これを別途合意する期日までに甲指定の口座に振り込んで支払う。</>
                    ) : (
                        <>乙は甲に対し、本件解決金として金 {claimAmountStr} 円の支払義務があることを認め、これを {installmentsCount} 回に分割し、毎月末日までに各分割金 {monthlyAmountStr} 円（ただし最終回は残金全額）を甲指定の口座に振り込んで支払う。</>
                    )}
                </div>

                {installmentsCount >= 2 && (
                    <>
                        <h2 style={{ fontSize: '15px', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '5px', marginBottom: '15px', marginTop: '30px' }}>
                            第2条（期限の利益喪失）
                        </h2>
                        <div style={{ fontSize: '13px', marginLeft: '20px', marginBottom: '20px', lineHeight: 1.8 }}>
                            乙が前条の分割金の支払いを1回でも怠ったときは、当然に期限の利益を失い、未払金残額およびこれに対する遅延損害金を直ちに一括して甲へ支払うものとする。
                        </div>
                    </>
                )}

                <h2 style={{ fontSize: '15px', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '5px', marginBottom: '15px', marginTop: '30px' }}>
                    第{installmentsCount >= 2 ? '3' : '2'}条（清算条項）
                </h2>
                <div style={{ fontSize: '13px', marginLeft: '20px', marginBottom: '60px', lineHeight: 1.8 }}>
                    甲および乙は、本件に関し、本合意書に定めるもののほか、何らの債権債務がないことを相互に確認する。
                </div>

                {/* 署名欄 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '60px', padding: '0 20px' }}>
                    <div style={{ width: '45%' }}>
                        <div style={{ fontSize: '13px', marginBottom: '20px' }}>【甲】譲受人（債権者）</div>
                        <div style={{ fontSize: '13px', marginBottom: '10px' }}>{buyerName}</div>
                        <div style={{ fontSize: '13px', lineHeight: 2, borderBottom: '1px dotted #999', marginBottom: '10px', height: '26px' }}></div>
                        <div style={{ fontSize: '13px', lineHeight: 2, borderBottom: '1px dotted #999', marginBottom: '10px', position: 'relative', height: '26px' }}>
                            <div style={{ position: 'absolute', right: '10px', top: '-10px', color: '#ccc', border: '1px solid #ccc', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>印</div>
                        </div>
                    </div>

                    <div style={{ width: '45%' }}>
                        <div style={{ fontSize: '13px', marginBottom: '20px' }}>【乙】譲渡人（債務者）</div>
                        <div style={{ fontSize: '13px', marginBottom: '10px' }}>{sellerName}</div>
                        <div style={{ fontSize: '13px', lineHeight: 2, borderBottom: '1px dotted #999', marginBottom: '10px', height: '26px' }}></div>
                        <div style={{ fontSize: '13px', lineHeight: 2, borderBottom: '1px dotted #999', marginBottom: '10px', position: 'relative', height: '26px' }}>
                            <div style={{ position: 'absolute', right: '10px', top: '-10px', color: '#ccc', border: '1px solid #ccc', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>印</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const root = createRoot(wrapper);
    root.render(<SettlementComponent />);

    try {
        await new Promise(resolve => setTimeout(resolve, 1500));

        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });
        const pdfWidth = pdf.internal.pageSize.getWidth();

        const pageNode = document.getElementById('pdf-page-settlement-1');
        if (pageNode) {
            const imgData = await toPng(pageNode, {
                pixelRatio: 2,
                backgroundColor: '#ffffff',
                cacheBust: true,
            });

            const renderRatio = pageNode.offsetHeight / pageNode.offsetWidth;
            const scaledHeight = pdfWidth * renderRatio;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, scaledHeight);
        }

        return pdf.output('blob');
    } catch (error) {
        console.error("PDF canvas generation failed:", error);
        throw new Error("PDF画像の生成に失敗しました。詳細: " + String(error));
    } finally {
        root.unmount();
        if (wrapper.parentNode) {
            wrapper.parentNode.removeChild(wrapper);
        }
    }
};
