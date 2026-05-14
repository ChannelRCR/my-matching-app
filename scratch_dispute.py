import sys

def modify_file():
    with open('src/components/DisputeBoard.tsx', 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = content.replace("import { useMarket } from '../contexts/MarketContext';", "import { useMarket } from '../contexts/MarketContext';\nimport { useData } from '../contexts/DataContext';")
    content = content.replace("const { completeDeal } = useMarket();", "const { completeDeal } = useMarket();\n    const { donatedDealIds } = useData();")
    
    target_block = """                    <div className="mt-4 pt-4 border-t border-red-200 flex justify-center w-full max-w-sm">
                        <Button onClick={() => setIsDonationModalOpen(true)} className="bg-white text-red-700 hover:bg-red-100 border border-red-300 outline-none shadow-sm gap-2 rounded-full py-1.5 px-6 text-sm w-full" variant="outline">
                            💰 運営サポート（投げ銭）を贈る
                        </Button>
                    </div>"""
    
    replacement_block = """                    {(!donatedDealIds || !donatedDealIds.includes(deal.id)) && (
                    <div className="mt-4 pt-4 border-t border-red-200 flex justify-center w-full max-w-sm">
                        <Button onClick={() => setIsDonationModalOpen(true)} className="bg-white text-red-700 hover:bg-red-100 border border-red-300 outline-none shadow-sm gap-2 rounded-full py-1.5 px-6 text-sm w-full" variant="outline">
                            💰 運営サポート（投げ銭）を贈る
                        </Button>
                    </div>
                    )}"""
    
    content = content.replace(target_block, replacement_block)
    
    with open('src/components/DisputeBoard.tsx', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    modify_file()
