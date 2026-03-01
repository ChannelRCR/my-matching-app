import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Briefcase } from 'lucide-react';

export const LoginPage: React.FC = () => {
    const { signIn } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error: signInError } = await signIn(email, password);
        if (signInError) {
            setError(signInError.message || 'ログインに失敗しました');
            setLoading(false);
        } else {
            // Navigation will be handled by DashboardRedirector
            navigate('/dashboard');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <Link to="/" className="flex items-center gap-2 font-bold text-2xl text-primary tracking-tight mb-8">
                <Briefcase className="h-8 w-8" />
                <span>FactorMatch</span>
            </Link>

            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-center">ログイン</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                            label="メールアドレス"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <Input
                            label="パスワード"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />

                        <div className="flex items-center gap-2 mt-2">
                            <input
                                type="checkbox"
                                id="showPassword"
                                checked={showPassword}
                                onChange={(e) => setShowPassword(e.target.checked)}
                                className="rounded border-slate-300 text-primary focus:ring-primary"
                            />
                            <label htmlFor="showPassword" className="text-sm text-slate-600 cursor-pointer">
                                ☑ パスワードを表示する
                            </label>
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded text-sm mt-4">
                                {error}
                            </div>
                        )}

                        <Button type="submit" className="w-full mt-4" disabled={loading}>
                            {loading ? 'ログイン中...' : 'ログイン'}
                        </Button>
                    </form>

                    <div className="mt-6 text-center text-sm text-slate-500">
                        アカウントをお持ちでない方は{' '}
                        <Link to="/register" className="text-primary font-bold hover:underline">
                            新規登録
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
