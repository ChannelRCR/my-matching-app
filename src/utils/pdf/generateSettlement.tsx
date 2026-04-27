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
    // const installmentsCount = dispute.installments_count || 1;
    
    // 甲乙の定義を要件通りに設定
    const partyA = seller.companyName || seller.name; // 甲（譲渡人 / 売主）
    const partyB = buyer.companyName || buyer.name;   // 乙（譲受人 / 買主）

    // 支払管理用の変数
    const startMonth = dispute.start_month || '〇年〇月';
    const finalAmountStr = ((dispute.claim_amount || 0) % (dispute.settlement_amount || 0) || (dispute.settlement_amount || 0)).toLocaleString();

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
                    本和解合意書は、当事者間において以下の通り和解が成立したことを証するものである。
                </div>

                <h2 style={{ fontSize: '15px', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '5px', marginBottom: '15px', marginTop: '30px' }}>
                    第1条（契約の存在確認）
                </h2>
                <div style={{ fontSize: '13px', marginLeft: '20px', marginBottom: '20px', lineHeight: 1.8 }}>
                    譲渡人（以下「甲」という。）と譲受人（以下「乙」という。）は、本件債権譲渡契約が存在したことを相互に確認する。
                </div>

                <h2 style={{ fontSize: '15px', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '5px', marginBottom: '15px', marginTop: '30px' }}>
                    第2条（不履行の確認）
                </h2>
                <div style={{ fontSize: '13px', marginLeft: '20px', marginBottom: '20px', lineHeight: 1.8 }}>
                    甲は、本件債権譲渡契約に基づく債務不履行が存在することを認める。
                </div>

                <h2 style={{ fontSize: '15px', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '5px', marginBottom: '15px', marginTop: '30px' }}>
                    第3条（支払義務の確認）
                </h2>
                <div style={{ fontSize: '13px', marginLeft: '20px', marginBottom: '20px', lineHeight: 1.8 }}>
                    甲は、乙に対し、解決金として金 {claimAmountStr} 円の支払義務を負うことを確認する。
                </div>

                <h2 style={{ fontSize: '15px', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '5px', marginBottom: '15px', marginTop: '30px' }}>
                    第4条（分割支払詳細）
                </h2>
                <div style={{ fontSize: '13px', marginLeft: '20px', marginBottom: '20px', lineHeight: 1.8 }}>
                    前項の金額について、甲は乙に対し、{startMonth}以降、毎月末日限り金 {monthlyAmountStr} 円ずつ支払う。ただし、最終月の支払は端数を調整した金 {finalAmountStr} 円とする。振込手数料は甲の負担とする。
                </div>

                <h2 style={{ fontSize: '15px', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '5px', marginBottom: '15px', marginTop: '30px' }}>
                    第5条（期限の利益喪失）
                </h2>
                <div style={{ fontSize: '13px', marginLeft: '20px', marginBottom: '20px', lineHeight: 1.8 }}>
                    甲が前項の支払を一度でも怠ったときは、当然に期限の利益を失い、未払金残額を直ちに一括して支払う。
                </div>

                <h2 style={{ fontSize: '15px', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '5px', marginBottom: '15px', marginTop: '30px' }}>
                    第6条（遅延損害金）
                </h2>
                <div style={{ fontSize: '13px', marginLeft: '20px', marginBottom: '20px', lineHeight: 1.8 }}>
                    期限の利益を失った場合、以後完済に至るまで残金に対する年3％の割合による遅延損害金を付加して支払う。
                </div>

                <h2 style={{ fontSize: '15px', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '5px', marginBottom: '15px', marginTop: '30px' }}>
                    第7条（清算条項）
                </h2>
                <div style={{ fontSize: '13px', marginLeft: '20px', marginBottom: '60px', lineHeight: 1.8 }}>
                    甲および乙は、本件に関し、本和解合意書に定めるもののほかに何らの債権債務がないことを相互に確認する。
                </div>

                {/* 署名欄 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '60px', padding: '0 20px' }}>
                    <div style={{ width: '45%' }}>
                        <div style={{ fontSize: '13px', marginBottom: '20px' }}>【甲】譲渡人 / 売主</div>
                        <div style={{ fontSize: '13px', marginBottom: '10px' }}>{partyA}</div>
                        <div style={{ fontSize: '13px', lineHeight: 2, borderBottom: '1px dotted #999', marginBottom: '10px', height: '26px' }}></div>
                        <div style={{ fontSize: '13px', lineHeight: 2, borderBottom: '1px dotted #999', marginBottom: '10px', position: 'relative', height: '26px' }}>
                            <div style={{ position: 'absolute', right: '10px', top: '-10px', color: '#ccc', border: '1px solid #ccc', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>印</div>
                        </div>
                    </div>

                    <div style={{ width: '45%' }}>
                        <div style={{ fontSize: '13px', marginBottom: '20px' }}>【乙】譲受人 / 買主</div>
                        <div style={{ fontSize: '13px', marginBottom: '10px' }}>{partyB}</div>
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
