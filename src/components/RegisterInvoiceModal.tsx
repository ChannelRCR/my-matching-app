import React, { useState, useRef } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import type { Invoice } from '../types';
import { useData } from '../contexts/DataContext';
import { X, Upload, FileText, Trash2 } from 'lucide-react';

interface RegisterInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const RegisterInvoiceModal: React.FC<RegisterInvoiceModalProps> = ({ isOpen, onClose }) => {
    const { addInvoice } = useData();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [formData, setFormData] = useState({
        amount: '',
        dueDate: '',
        industry: '',
        companySize: '',
        companyCredit: '',
    });
    const [evidenceFile, setEvidenceFile] = useState<{ file: File, url: string } | null>(null);

    if (!isOpen) return null;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const url = URL.createObjectURL(file);
            setEvidenceFile({ file, url });
        }
    };

    const handleRemoveFile = () => {
        if (evidenceFile) {
            URL.revokeObjectURL(evidenceFile.url);
            setEvidenceFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation check
        if (!formData.amount || !formData.dueDate || !formData.industry) {
            alert('必須項目を入力してください');
            return;
        }

        const newInvoice: Invoice = {
            id: `inv_${Date.now()}`,
            // sellerId will be added by addInvoice in DataContext
            sellerId: '',
            amount: Number(formData.amount),
            dueDate: formData.dueDate,
            industry: formData.industry,
            companySize: formData.companySize,
            companyCredit: formData.companyCredit,
            status: 'open',
            requestedAmount: Math.floor(Number(formData.amount) * 0.95), // Default 95%
            evidenceUrl: evidenceFile?.url,
            evidenceName: evidenceFile?.file.name,
        };

        const success = await addInvoice(newInvoice);

        if (success) {
            // Reset and close
            setFormData({
                amount: '',
                dueDate: '',
                industry: '',
                companySize: '',
                companyCredit: '',
            });
            setEvidenceFile(null);
            onClose();
            alert('案件を登録しました！');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <Card className="w-full max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle>新規売掛金の登録</CardTitle>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="h-5 w-5" />
                    </Button>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="請求書額面 (円) *"
                                name="amount"
                                type="number"
                                value={formData.amount}
                                onChange={handleInputChange}
                                placeholder="例: 1000000"
                                required
                            />
                            <Input
                                label="入金期日 *"
                                name="dueDate"
                                type="date"
                                value={formData.dueDate}
                                onChange={handleInputChange}
                                required
                            />

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">業種 *</label>
                                <select
                                    name="industry"
                                    value={formData.industry}
                                    onChange={handleInputChange}
                                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                                    required
                                >
                                    <option value="">選択してください</option>
                                    <option value="建設業">建設業</option>
                                    <option value="IT・通信">IT・通信</option>
                                    <option value="製造業">製造業</option>
                                    <option value="卸売・小売業">卸売・小売業</option>
                                    <option value="運送業">運送業</option>
                                    <option value="サービス業">サービス業</option>
                                    <option value="その他">その他</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">企業規模</label>
                                <select
                                    name="companySize"
                                    value={formData.companySize}
                                    onChange={handleInputChange}
                                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="">選択してください</option>
                                    <option value="上場企業">上場企業</option>
                                    <option value="大企業">大企業</option>
                                    <option value="中小企業">中小企業</option>
                                    <option value="その他">その他</option>
                                </select>
                            </div>
                        </div>

                        {/* Evidence Upload Section */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">証拠書類（請求書等）のアップロード</label>
                            <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept="image/*,application/pdf"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="evidence-upload"
                                />
                                {!evidenceFile ? (
                                    <label htmlFor="evidence-upload" className="cursor-pointer flex flex-col items-center gap-2">
                                        <div className="p-3 bg-blue-50 text-primary rounded-full">
                                            <Upload size={24} />
                                        </div>
                                        <p className="text-sm font-medium text-slate-700">クリックしてファイルをアップロード</p>
                                        <p className="text-xs text-slate-500">PDF, JPG, PNG (最大 10MB)</p>
                                    </label>
                                ) : (
                                    <div className="flex items-center justify-between bg-white p-3 border border-slate-200 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            {evidenceFile.file.type.startsWith('image/') ? (
                                                <img src={evidenceFile.url} alt="Preview" className="h-10 w-10 object-cover rounded" />
                                            ) : (
                                                <div className="p-2 bg-red-50 text-red-500 rounded">
                                                    <FileText size={20} />
                                                </div>
                                            )}
                                            <div className="text-left">
                                                <p className="text-sm font-bold text-slate-700 truncate max-w-[200px]">{evidenceFile.file.name}</p>
                                                <p className="text-xs text-slate-500">{(evidenceFile.file.size / 1024).toFixed(0)} KB</p>
                                            </div>
                                        </div>
                                        <Button type="button" variant="ghost" size="sm" onClick={handleRemoveFile} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                            <Trash2 size={18} />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">アピールポイント・信用情報</label>
                            <textarea
                                name="companyCredit"
                                value={formData.companyCredit}
                                onChange={handleInputChange}
                                placeholder="取引先の事業規模や過去の取引実績など（例：過去に3回取引があり、支払い遅延なし）"
                                className="flex min-h-[80px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>

                        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                            <Button type="button" variant="ghost" onClick={onClose}>キャンセル</Button>
                            <Button type="submit">出品する</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};
