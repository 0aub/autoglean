import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getExtractors, getDepartments, getGeneralManagements } from '@/services/api';
import { Star, TrendingUp, Clock, Calendar, User, X, Search as SearchIcon, Filter as FilterIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { Extractor } from '@/types/extractor';
import { File, Map, Calendar as CalendarIcon, Home, Search, Circle, FileText, Folder, Database, Settings, Users, BarChart, Zap, Layers, Package, Globe, Book, Briefcase, ClipboardList, Mail, Phone, MapPin, Tag, Archive, Heart, ThumbsUp, Activity, Award, Target, Flag, CheckSquare, Filter, Share2, Compass, Navigation, Bell, Bookmark, Box, Camera, Cast, ChevronRight, Cloud, Code, Coffee, Copy, CreditCard, DollarSign, Download, Droplet, Edit, Eye, Facebook, FileCheck, Film, Flame, Gift, Headphones, Image, Instagram, Key, Link, Lock, MessageCircle, Mic, Monitor, Moon, Music, PenTool, Percent, Play, Plus, Printer, Radio, Repeat, Save, Send, Server, Shield, ShoppingBag, ShoppingCart, Shuffle, Smartphone, Speaker, Sun, Thermometer, Trash, Truck, Tv, Twitter, Umbrella, Upload, Video, Wifi, Wind, Youtube, Anchor, Atom, Battery, Bluetooth, Calculator, CheckCircle, ChevronDown, Clipboard, CloudRain, Cpu, Disc, Feather, FileVideo, Fingerprint, Flashlight, FolderOpen, Gamepad2, HardDrive, Hash, Headset, HelpCircle, Laptop, Lightbulb, Medal, Menu, MessageSquare, Paperclip, PieChart, type LucideIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Map, Calendar: CalendarIcon, Home, File, Search, Circle, FileText, Folder, Database, Settings, Users, BarChart, Zap, Layers, Package, Globe, Book, Briefcase, ClipboardList, Mail, Phone, MapPin, Clock, Tag, Archive, Star, Heart, ThumbsUp, TrendingUp, Activity, Award, Target, Flag, CheckSquare, Filter, Share2, Compass, Navigation, Bell, Bookmark, Box, Camera, Cast, ChevronRight, Cloud, Code, Coffee, Copy, CreditCard, DollarSign, Download, Droplet, Edit, Eye, Facebook, FileCheck, Film, Flame, Gift, Headphones, Image, Instagram, Key, Link, Lock, MessageCircle, Mic, Monitor, Moon, Music, PenTool, Percent, Play, Plus, Printer, Radio, Repeat, Save, Send, Server, Shield, ShoppingBag, ShoppingCart, Shuffle, Smartphone, Speaker, Sun, Thermometer, Trash, Truck, Tv, Twitter, Umbrella, Upload, User, Video, Wifi, Wind, Youtube, Anchor, Atom, Battery, Bluetooth, Calculator, CheckCircle, ChevronDown, Clipboard, CloudRain, Cpu, Disc, Feather, FileVideo, Fingerprint, Flashlight, FolderOpen, Gamepad2, HardDrive, Hash, Headset, HelpCircle, Laptop, Lightbulb, Medal, Menu, MessageSquare, Paperclip, PieChart,
};

function PublicExtractorsContent() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [extractors, setExtractors] = useState<Extractor[]>([]);
  const [filteredExtractors, setFilteredExtractors] = useState<Extractor[]>([]);
  const [departments, setDepartments] = useState<Array<{ name_en: string; name_ar: string }>>([]);
  const [generalManagements, setGeneralManagements] = useState<Array<{ name_en: string; name_ar: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<string>('rating');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedGMs, setSelectedGMs] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterAndSortExtractors();
  }, [extractors, sortBy, searchQuery, selectedDepartments, selectedGMs]);

  const loadData = async () => {
    try {
      const [extractorsData, departmentsData, gmsData] = await Promise.all([
        getExtractors(),
        getDepartments(),
        getGeneralManagements()
      ]);

      const publicExtractors = extractorsData.filter(e => e.visibility === 'public');
      setExtractors(publicExtractors);
      setDepartments(departmentsData);
      setGeneralManagements(gmsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load public extractors');
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortExtractors = () => {
    let filtered = [...extractors];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e => {
        const nameMatch = e.name_en.toLowerCase().includes(query) ||
                         e.name_ar.toLowerCase().includes(query);
        const descMatch = e.description_en?.toLowerCase().includes(query) ||
                         e.description_ar?.toLowerCase().includes(query);
        const ownerMatch = e.owner_name_en.toLowerCase().includes(query) ||
                          e.owner_name_ar.toLowerCase().includes(query);
        return nameMatch || descMatch || ownerMatch;
      });
    }

    // Filter by departments
    if (selectedDepartments.length > 0) {
      filtered = filtered.filter(e => {
        const deptEn = e.owner_department_name_en || '';
        const deptAr = e.owner_department_name_ar || '';
        return selectedDepartments.some(dept =>
          deptEn === dept || deptAr === dept
        );
      });
    }

    // Filter by general managements
    if (selectedGMs.length > 0) {
      filtered = filtered.filter(e => {
        const gmEn = e.owner_gm_name_en || '';
        const gmAr = e.owner_gm_name_ar || '';
        return selectedGMs.some(gm =>
          gmEn === gm || gmAr === gm
        );
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return (b.rating_avg || 0) - (a.rating_avg || 0);
        case 'reviews':
          return b.rating_count - a.rating_count;
        case 'usage':
          return b.usage_count - a.usage_count;
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'updated':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        default:
          return 0;
      }
    });

    setFilteredExtractors(filtered);
  };

  const toggleDepartment = (dept: string) => {
    setSelectedDepartments(prev =>
      prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
    );
  };

  const toggleGM = (gm: string) => {
    setSelectedGMs(prev =>
      prev.includes(gm) ? prev.filter(g => g !== gm) : [...prev, gm]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedDepartments([]);
    setSelectedGMs([]);
  };

  const hasActiveFilters = searchQuery.trim() !== '' || selectedDepartments.length > 0 || selectedGMs.length > 0;

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">
              {language === 'en' ? 'Loading...' : 'جاري التحميل...'}
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
            {language === 'en' ? 'Public Extractors' : 'المستخرجات العامة'}
          </h1>

          {/* Search and Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            {/* Search */}
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={language === 'en' ? 'Search extractors...' : 'البحث عن المستخرجات...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Department Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <FilterIcon className="h-4 w-4" />
                  {language === 'en' ? 'Departments' : 'الأقسام'}
                  {selectedDepartments.length > 0 && (
                    <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                      {selectedDepartments.length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="start">
                <div className="space-y-4">
                  <h4 className="font-medium leading-none">
                    {language === 'en' ? 'Filter by Department' : 'تصفية حسب القسم'}
                  </h4>
                  <div className="max-h-[300px] overflow-y-auto space-y-2">
                    {departments.map((dept) => {
                      const deptName = language === 'en' ? dept.name_en : dept.name_ar;
                      const isSelected = selectedDepartments.includes(dept.name_en) || selectedDepartments.includes(dept.name_ar);
                      return (
                        <div key={dept.name_en} className="flex items-center gap-3">
                          <Checkbox
                            id={`dept-${dept.name_en}`}
                            checked={isSelected}
                            onCheckedChange={() => toggleDepartment(dept.name_en)}
                          />
                          <Label
                            htmlFor={`dept-${dept.name_en}`}
                            className="text-sm font-normal cursor-pointer flex-1"
                          >
                            {deptName}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* GM Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <FilterIcon className="h-4 w-4" />
                  {language === 'en' ? 'General Management' : 'الإدارة العامة'}
                  {selectedGMs.length > 0 && (
                    <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                      {selectedGMs.length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="start">
                <div className="space-y-4">
                  <h4 className="font-medium leading-none">
                    {language === 'en' ? 'Filter by General Management' : 'تصفية حسب الإدارة العامة'}
                  </h4>
                  <div className="max-h-[300px] overflow-y-auto space-y-2">
                    {generalManagements.map((gm) => {
                      const gmName = language === 'en' ? gm.name_en : gm.name_ar;
                      const isSelected = selectedGMs.includes(gm.name_en) || selectedGMs.includes(gm.name_ar);
                      return (
                        <div key={gm.name_en} className="flex items-center gap-3">
                          <Checkbox
                            id={`gm-${gm.name_en}`}
                            checked={isSelected}
                            onCheckedChange={() => toggleGM(gm.name_en)}
                          />
                          <Label
                            htmlFor={`gm-${gm.name_en}`}
                            className="text-sm font-normal cursor-pointer flex-1"
                          >
                            {gmName}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">
                  {language === 'en' ? 'Top Rated' : 'الأعلى تقييماً'}
                </SelectItem>
                <SelectItem value="reviews">
                  {language === 'en' ? 'Most Reviews' : 'الأكثر مراجعة'}
                </SelectItem>
                <SelectItem value="usage">
                  {language === 'en' ? 'Most Used' : 'الأكثر استخداماً'}
                </SelectItem>
                <SelectItem value="newest">
                  {language === 'en' ? 'Newest' : 'الأحدث'}
                </SelectItem>
                <SelectItem value="updated">
                  {language === 'en' ? 'Recently Updated' : 'المحدثة مؤخراً'}
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters} className="gap-2">
                <X className="h-4 w-4" />
                {language === 'en' ? 'Clear' : 'مسح'}
              </Button>
            )}
          </div>

          {/* Extractors Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExtractors.map((extractor) => {
              const IconComponent = iconMap[extractor.icon] || File;
              const displayName = language === 'en' ? extractor.name_en : extractor.name_ar;
              const displayDescription = language === 'en' ? extractor.description_en : extractor.description_ar;
              const ownerName = language === 'en' ? extractor.owner_name_en : extractor.owner_name_ar;

              return (
                <Card
                  key={extractor.id}
                  className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/50"
                  onClick={() => navigate(`/?extractor=${extractor.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <IconComponent className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{displayName}</CardTitle>
                        <CardDescription className="text-xs flex items-center gap-1 mt-1">
                          <User className="h-3 w-3" />
                          {ownerName}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {displayDescription && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {displayDescription}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500" />
                        <span>{extractor.rating_avg?.toFixed(1) || 'N/A'}</span>
                        <span className="ml-1">({extractor.rating_count})</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        <span>{extractor.usage_count}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredExtractors.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {language === 'en' ? 'No public extractors found' : 'لا توجد مستخرجات عامة'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PublicExtractors() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <PublicExtractorsContent />
      </LanguageProvider>
    </ThemeProvider>
  );
}
