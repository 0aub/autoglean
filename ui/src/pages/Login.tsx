import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage, LanguageProvider } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WaveAnimation } from '@/components/WaveAnimation';
import { Languages, Eye, EyeOff } from 'lucide-react';

function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { t, toggleLanguage, language } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative overflow-hidden ${language === 'ar' ? 'lg:dir-rtl' : ''}`}>
      {/* Language Toggle - positioned relative to entire page */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleLanguage}
        className={`absolute top-4 z-10 ${language === 'ar' ? 'right-4' : 'left-4'}`}
      >
        <Languages className="h-5 w-5" />
      </Button>

      {/* Login Form Side */}
      <div className="flex items-center justify-center p-8 relative lg:order-1">
        <Card className="w-full max-w-md z-10">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {language === 'en' ? 'Welcome Back' : 'مرحباً بعودتك'}
          </CardTitle>
          <CardDescription className="text-center">
            {language === 'en'
              ? 'Enter your credentials to access your account'
              : 'أدخل بيانات الاعتماد للوصول إلى حسابك'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">
                {language === 'en' ? 'Email' : 'البريد الإلكتروني'}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={language === 'en' ? 'name@mewa.gov.sa' : 'name@mewa.gov.sa'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                {language === 'en' ? 'Password' : 'كلمة المرور'}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onMouseDown={() => setShowPassword(true)}
                  onMouseUp={() => setShowPassword(false)}
                  onMouseLeave={() => setShowPassword(false)}
                  onTouchStart={() => setShowPassword(true)}
                  onTouchEnd={() => setShowPassword(false)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading
                ? (language === 'en' ? 'Signing in...' : 'جاري تسجيل الدخول...')
                : (language === 'en' ? 'Sign In' : 'تسجيل الدخول')}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            {language === 'en'
              ? 'Use your MEWA credentials to sign in'
              : 'استخدم بيانات اعتماد وزارة البيئة والمياه والزراعة'}
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Animation Side */}
      <div className="hidden lg:flex items-center justify-center relative lg:order-2">
        <WaveAnimation />
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <LoginContent />
      </LanguageProvider>
    </ThemeProvider>
  );
}
