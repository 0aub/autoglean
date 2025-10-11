import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Header } from '@/components/Header';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, TrendingUp, Star, Users, Building2 } from 'lucide-react';
import { getLeaderboard, LeaderboardResponse } from '@/services/leaderboard';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#14b8a6'];
const RATING_COLORS = ['#fbbf24', '#f59e0b', '#eab308', '#facc15', '#fde047'];

function LeaderboardContent() {
  const { language } = useLanguage();
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const leaderboardData = await getLeaderboard(10);
        setData(leaderboardData);
      } catch (error) {
        console.error('Failed to load leaderboard:', error);
        toast.error('Failed to load leaderboard');
      } finally {
        setIsLoading(false);
      }
    };

    loadLeaderboard();
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">
              {language === 'en' ? 'Loading leaderboard...' : 'جاري تحميل لوحة المتصدرين...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">
              {language === 'en' ? 'Leaderboard' : 'لوحة المتصدرين'}
            </h1>

            <Tabs defaultValue="extractors" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="extractors" className="gap-2">
                  <Trophy className="h-4 w-4" />
                  {language === 'en' ? 'Extractors' : 'المستخرجات'}
                </TabsTrigger>
                <TabsTrigger value="users" className="gap-2">
                  <Users className="h-4 w-4" />
                  {language === 'en' ? 'Users' : 'المستخدمون'}
                </TabsTrigger>
                <TabsTrigger value="departments" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  {language === 'en' ? 'Departments' : 'الإدارات'}
                </TabsTrigger>
              </TabsList>

              {/* Extractors Tab */}
              <TabsContent value="extractors" className="space-y-6">
                {/* Charts Row */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Usage Bar Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-500" />
                        {language === 'en' ? 'Most Used Extractors' : 'المستخرجات الأكثر استخداماً'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data?.top_extractors_by_usage || []} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis
                            dataKey={language === 'en' ? 'name_en' : 'name_ar'}
                            type="category"
                            width={120}
                            tick={{ fontSize: 12 }}
                          />
                          <Tooltip
                            formatter={(value: any) => [value, language === 'en' ? 'Usage Count' : 'عدد الاستخدامات']}
                            labelFormatter={(label: any) => label}
                          />
                          <Bar dataKey="usage_count" fill="#3b82f6" radius={[0, 8, 8, 0]}>
                            {data?.top_extractors_by_usage.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Rating Bar Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-yellow-500" />
                        {language === 'en' ? 'Highest Rated Extractors' : 'المستخرجات الأعلى تقييماً'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data?.top_extractors_by_rating || []} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" domain={[0, 5]} />
                          <YAxis
                            dataKey={language === 'en' ? 'name_en' : 'name_ar'}
                            type="category"
                            width={120}
                            tick={{ fontSize: 12 }}
                          />
                          <Tooltip
                            formatter={(value: any) => [value?.toFixed(1), language === 'en' ? 'Average Rating' : 'متوسط التقييم']}
                            labelFormatter={(label: any) => label}
                          />
                          <Bar dataKey="rating_avg" fill="#fbbf24" radius={[0, 8, 8, 0]}>
                            {data?.top_extractors_by_rating.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={RATING_COLORS[index % RATING_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* List Row */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Top by Usage List */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-blue-500" />
                        {language === 'en' ? 'Top 10 by Usage' : 'أفضل 10 حسب الاستخدام'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {data?.top_extractors_by_usage.map((item, index) => (
                          <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs">
                              {index + 1}
                            </div>
                            <span className="text-xl">{item.icon}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{language === 'en' ? item.name_en : item.name_ar}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {language === 'en' ? 'by' : 'بواسطة'} {language === 'en' ? item.owner_name_en : item.owner_name_ar}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-primary text-sm">{item.usage_count}</p>
                              <p className="text-xs text-muted-foreground">{language === 'en' ? 'uses' : 'استخدام'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Top by Rating List */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-yellow-500" />
                        {language === 'en' ? 'Top 10 by Rating' : 'أفضل 10 حسب التقييم'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {data?.top_extractors_by_rating.map((item, index) => (
                          <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs">
                              {index + 1}
                            </div>
                            <span className="text-xl">{item.icon}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{language === 'en' ? item.name_en : item.name_ar}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.rating_count} {language === 'en' ? 'reviews' : 'تقييم'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-yellow-500 text-sm">⭐ {item.rating_avg?.toFixed(1) || 'N/A'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Users Tab */}
              <TabsContent value="users" className="space-y-6">
                <div className="grid md:grid-cols-3 gap-6">
                  {/* By Extractor Count */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        {language === 'en' ? 'Most Extractors Created' : 'أكثر المستخرجات المُنشأة'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {data?.top_users_by_extractor_count.map((item, index) => (
                          <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                            <span className="font-bold text-primary text-sm">{index + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{language === 'en' ? item.full_name_en : item.full_name_ar}</p>
                              <p className="text-xs text-muted-foreground truncate">{language === 'en' ? item.department_en : item.department_ar}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-sm">{item.extractor_count}</p>
                              <p className="text-xs text-muted-foreground">{language === 'en' ? 'extractors' : 'مستخرج'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* By Usage */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        {language === 'en' ? 'Most Used Extractors' : 'أصحاب المستخرجات الأكثر استخداماً'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {data?.top_users_by_usage.map((item, index) => (
                          <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                            <span className="font-bold text-primary text-sm">{index + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{language === 'en' ? item.full_name_en : item.full_name_ar}</p>
                              <p className="text-xs text-muted-foreground truncate">{language === 'en' ? item.department_en : item.department_ar}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-sm">{item.total_usage}</p>
                              <p className="text-xs text-muted-foreground">{language === 'en' ? 'uses' : 'استخدام'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* By Rating */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        {language === 'en' ? 'Best Rated' : 'الأعلى تقييماً'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {data?.top_users_by_rating.map((item, index) => (
                          <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                            <span className="font-bold text-primary text-sm">{index + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{language === 'en' ? item.full_name_en : item.full_name_ar}</p>
                              <p className="text-xs text-muted-foreground">⭐ {item.rating_avg?.toFixed(1) || 'N/A'}</p>
                            </div>
                            <span className="text-xs text-muted-foreground">{item.rating_count} {language === 'en' ? 'reviews' : 'تقييم'}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Departments Tab */}
              <TabsContent value="departments" className="space-y-6">
                {/* Pie Charts Row */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Department Usage Pie Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        {language === 'en' ? 'Usage by Department' : 'الاستخدام حسب الإدارة'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={data?.top_departments_by_usage || []}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(entry) => `${entry[language === 'en' ? 'department_en' : 'department_ar']}: ${entry.total_usage}`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="total_usage"
                          >
                            {data?.top_departments_by_usage.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: any) => [value, language === 'en' ? 'Total Usage' : 'إجمالي الاستخدام']}
                            labelFormatter={(label: any) => label}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Department Extractor Count Bar Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-primary" />
                        {language === 'en' ? 'Extractors by Department' : 'المستخرجات حسب الإدارة'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data?.top_departments_by_extractor_count || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey={language === 'en' ? 'department_en' : 'department_ar'}
                            tick={{ fontSize: 10 }}
                            angle={-15}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis />
                          <Tooltip
                            formatter={(value: any) => [value, language === 'en' ? 'Extractor Count' : 'عدد المستخرجات']}
                            labelFormatter={(label: any) => label}
                          />
                          <Bar dataKey="extractor_count" fill="#8b5cf6" radius={[8, 8, 0, 0]}>
                            {data?.top_departments_by_extractor_count.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Lists Row */}
                <div className="grid md:grid-cols-3 gap-6">
                  {/* By Extractor Count */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        {language === 'en' ? 'Most Extractors Created' : 'أكثر المستخرجات المُنشأة'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {data?.top_departments_by_extractor_count.map((item, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                            <span className="font-bold text-primary text-sm">{index + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{language === 'en' ? item.department_en : item.department_ar}</p>
                              <p className="text-xs text-muted-foreground">{item.user_count} {language === 'en' ? 'users' : 'مستخدم'}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-sm">{item.extractor_count}</p>
                              <p className="text-xs text-muted-foreground">{language === 'en' ? 'extractors' : 'مستخرج'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* By Usage */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        {language === 'en' ? 'Most Used Extractors' : 'الإدارات الأكثر استخداماً'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {data?.top_departments_by_usage.map((item, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                            <span className="font-bold text-primary text-sm">{index + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{language === 'en' ? item.department_en : item.department_ar}</p>
                              <p className="text-xs text-muted-foreground">{item.user_count} {language === 'en' ? 'users' : 'مستخدم'}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-sm">{item.total_usage}</p>
                              <p className="text-xs text-muted-foreground">{language === 'en' ? 'uses' : 'استخدام'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* By Rating */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        {language === 'en' ? 'Best Rated' : 'الأعلى تقييماً'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {data?.top_departments_by_rating.map((item, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                            <span className="font-bold text-primary text-sm">{index + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{language === 'en' ? item.department_en : item.department_ar}</p>
                              <p className="text-xs text-muted-foreground">⭐ {item.rating_avg?.toFixed(1) || 'N/A'}</p>
                            </div>
                            <span className="text-xs text-muted-foreground">{item.rating_count} {language === 'en' ? 'reviews' : 'تقييم'}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
  );
}

export default function Leaderboard() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <LeaderboardContent />
      </LanguageProvider>
    </ThemeProvider>
  );
}
