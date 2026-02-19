import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Briefcase, Coins, Menu, X, ChevronRight } from 'lucide-react';
import { DonationModal } from './DonationModal';
import { useAuth } from '../contexts/AuthContext';

export const Layout: React.FC = () => {
    const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const location = useLocation();

    // Close menu when route changes
    React.useEffect(() => {
        setIsMenuOpen(false);
    }, [location]);


    const { user, profile, signOut } = useAuth();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
            <header className="sticky top-0 z-40 w-full border-b bg-white/95 backdrop-blur shadow-sm">
                <div className="container mx-auto flex h-16 items-center justify-between px-4">
                    <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary tracking-tight">
                        <Briefcase className="h-6 w-6" />
                        <span>FactorMatch</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-8">
                        {user && (
                            <>
                                <Link to="/invoices" className="text-sm font-medium hover:text-primary transition-colors">
                                    売り手情報（案件一覧）
                                </Link>
                                <Link to="/buyers" className="text-sm font-medium hover:text-primary transition-colors">
                                    買い手情報（投資家一覧）
                                </Link>
                            </>
                        )}
                    </nav>

                    <div className="hidden md:flex items-center gap-4">
                        {user ? (
                            <>
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                                    <div className="text-right">
                                        <div className="text-xs font-bold text-slate-700">{profile?.companyName || user.email}</div>
                                        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                                            {profile?.role === 'seller' ? '売り手' : profile?.role === 'buyer' ? '買い手' : profile?.role}
                                        </div>
                                    </div>
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                        {profile?.name?.charAt(0) || 'U'}
                                    </div>
                                </div>

                                <button
                                    className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-full transition-colors border border-emerald-100"
                                    onClick={() => setIsDonationModalOpen(true)}
                                >
                                    <Coins className="h-4 w-4 fill-emerald-700/20" />
                                    <span className="text-xs font-bold">利用手数料（任意）</span>
                                </button>

                                <div className="w-px h-6 bg-slate-200 mx-1"></div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleSignOut}
                                        className="text-sm font-medium text-slate-500 hover:text-red-600 transition-colors"
                                    >
                                        ログアウト
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex gap-4">
                                <Link to="/login" className="text-sm font-bold text-slate-600 hover:text-primary">ログイン</Link>
                                <Link to="/register" className="text-sm font-bold text-white bg-primary hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors">新規登録</Link>
                            </div>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden p-2 text-slate-600 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </header>

            {/* Mobile Menu Overlay */}
            {isMenuOpen && (
                <div className="fixed inset-0 z-30 bg-white/95 backdrop-blur-sm md:hidden pt-20 px-6 animate-in fade-in slide-in-from-top-4 duration-200">
                    <nav className="flex flex-col gap-6 text-lg font-medium text-slate-800">
                        {user ? (
                            <>
                                <Link to="/invoices" className="flex items-center justify-between border-b border-slate-100 pb-4" onClick={() => setIsMenuOpen(false)}>
                                    売り手情報（案件一覧）
                                    <ChevronRight size={20} className="text-slate-400" />
                                </Link>
                                <Link to="/buyers" className="flex items-center justify-between border-b border-slate-100 pb-4" onClick={() => setIsMenuOpen(false)}>
                                    買い手情報（投資家一覧）
                                    <ChevronRight size={20} className="text-slate-400" />
                                </Link>
                                <button
                                    className="mt-4 flex items-center justify-center gap-2 text-emerald-700 bg-emerald-50 py-3 rounded-lg font-bold"
                                    onClick={() => {
                                        setIsDonationModalOpen(true);
                                        setIsMenuOpen(false);
                                    }}
                                >
                                    <Coins className="h-5 w-5" />
                                    利用手数料（任意）を支払う
                                </button>
                                <button
                                    onClick={() => {
                                        handleSignOut();
                                        setIsMenuOpen(false);
                                    }}
                                    className="mt-4 text-center text-red-600 font-bold py-3"
                                >
                                    ログアウト
                                </button>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="flex items-center justify-center bg-slate-100 py-3 rounded-lg text-slate-700 font-bold" onClick={() => setIsMenuOpen(false)}>
                                    ログイン
                                </Link>
                                <Link to="/register" className="flex items-center justify-center bg-primary py-3 rounded-lg text-white font-bold" onClick={() => setIsMenuOpen(false)}>
                                    新規登録
                                </Link>
                            </>
                        )}
                    </nav>
                </div>
            )}

            <main className="flex-1 container mx-auto py-8 px-4 md:px-6">
                <Outlet />
            </main>

            <footer className="border-t bg-white py-8 mt-auto">
                <div className="container mx-auto px-4 text-center">
                    <div className="flex justify-center items-center gap-2 mb-4">
                        <Briefcase className="h-5 w-5 text-slate-400" />
                        <span className="font-bold text-slate-700">FactorMatch</span>
                    </div>
                    <p className="text-sm text-slate-500 mb-4">
                        日本初の完全自由型・債権流動化プラットフォーム
                    </p>
                    <div className="text-xs text-slate-400">
                        © 2026 FactorMatch. All rights reserved.
                    </div>
                </div>
            </footer>

            <DonationModal
                isOpen={isDonationModalOpen}
                onClose={() => setIsDonationModalOpen(false)}
            />
        </div>
    );
};
