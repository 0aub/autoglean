import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'ar';
type Direction = 'ltr' | 'rtl';

interface LanguageContextType {
  language: Language;
  direction: Direction;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    appName: 'AutoGlean Platform',
    welcome: 'Welcome',
    recipes: 'Extractors',
    newExtractor: 'New Extractor',
    extractCoordinates: 'Extract Coordinates',
    extractDates: 'Extract Dates',
    extractEntities: 'Extract Entities',
    tagline: 'Understand Your Documents Deeper',
    createFirst: 'Create your first extractor to get started',
    createNewExtractor: 'Create New Extractor',
    extractorDescription: 'Configure how the AI should extract information from your documents',
    extractorName: 'Extractor Name',
    extractorNamePlaceholder: 'e.g., Extract Invoice Data',
    selectIcon: 'Select Icon',
    description: 'Description',
    optional: 'optional',
    descriptionPlaceholder: 'What does this extractor do?',
    extractorPrompt: 'Extraction Prompt',
    promptPlaceholder: 'Describe how to extract data from documents...',
    save: 'Save',
    cancel: 'Cancel',
    upload: 'Upload',
    results: 'Results',
    configuration: 'Configuration',
    uploadDocuments: 'Upload Documents',
    dragOrClick: 'Drag files here or click to browse',
    uploadedFiles: 'Uploaded Files',
    processing: 'Processing',
    extractData: 'Extract Data',
    noResults: 'No results yet. Upload documents to get started.',
    extractorConfiguration: 'Extractor Configuration',
    edit: 'Edit',
    userName: 'John Doe',
    userPosition: 'Senior Analyst',
    userDepartment: 'Intelligence Department',
    editExtractor: 'Edit Extractor',
    delete: 'Delete',
  },
  ar: {
    appName: 'منصة الاستخراج الذكي',
    welcome: 'مرحباً',
    recipes: 'المستخرجات',
    newExtractor: 'مستخرج جديد',
    extractCoordinates: 'استخراج الإحداثيات',
    extractDates: 'استخراج التواريخ',
    extractEntities: 'استخراج الكيانات',
    tagline: 'افهم مستنداتك بعمق',
    createFirst: 'أنشئ أول مستخرج للبدء',
    createNewExtractor: 'إنشاء مستخرج جديد',
    extractorDescription: 'قم بتكوين كيفية استخراج الذكاء الاصطناعي للمعلومات من المستندات',
    extractorName: 'اسم المستخرج',
    extractorNamePlaceholder: 'مثال: استخراج بيانات الفاتورة',
    selectIcon: 'اختر أيقونة',
    description: 'الوصف',
    optional: 'اختياري',
    descriptionPlaceholder: 'ما الذي يفعله هذا المستخرج؟',
    extractorPrompt: 'موجه الاستخراج',
    promptPlaceholder: 'اصف كيفية استخراج البيانات من المستندات...',
    save: 'حفظ',
    cancel: 'إلغاء',
    upload: 'رفع',
    results: 'النتائج',
    configuration: 'التكوين',
    uploadDocuments: 'رفع المستندات',
    dragOrClick: 'اسحب الملفات هنا أو انقر للتصفح',
    uploadedFiles: 'الملفات المرفوعة',
    processing: 'جاري المعالجة',
    extractData: 'استخراج البيانات',
    noResults: 'لا توجد نتائج بعد. قم برفع المستندات للبدء.',
    extractorConfiguration: 'تكوين المستخرج',
    edit: 'تعديل',
    userName: 'جون دو',
    userPosition: 'محلل أول',
    userDepartment: 'قسم الاستخبارات',
    editExtractor: 'تعديل المُستخرِج',
    delete: 'حذف',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    // Load from localStorage on mount
    const savedLanguage = localStorage.getItem('language') as Language | null;
    return savedLanguage || 'en';
  });
  const direction: Direction = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = language;
    // Save to localStorage whenever language changes
    localStorage.setItem('language', language);
  }, [direction, language]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'ar' : 'en');
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations.en] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, direction, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
