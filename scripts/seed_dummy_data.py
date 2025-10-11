"""Seed massive dummy data for AutoGlean system."""

import sys
import random
from pathlib import Path
from datetime import datetime, timedelta

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from autoglean.db.base import SessionLocal, Base, engine
from autoglean.db.models import (
    GeneralManagement, Department, User, Extractor, ExtractorShare,
    UserFavorite, ExtractorHistory, ExtractionJob, ExtractorUsageStats,
    ExtractorRating, VisibilityEnum
)
from autoglean.auth.security import get_password_hash


# Saudi Arabic names with English transliterations
FIRST_NAMES_AR = [
    "محمد", "أحمد", "عبدالله", "عبدالرحمن", "فهد", "خالد", "سلطان", "سعد", "عبدالعزيز",
    "فيصل", "تركي", "مشعل", "بندر", "ناصر", "سعود", "راشد", "طلال", "وليد",
    "فاطمة", "نورة", "منى", "سارة", "عائشة", "مريم", "هند", "ريم", "أمل", "لطيفة",
    "أيوب"  # Special user
]

FIRST_NAMES_EN = [
    "Mohammed", "Ahmed", "Abdullah", "Abdulrahman", "Fahad", "Khaled", "Sultan", "Saad", "Abdulaziz",
    "Faisal", "Turki", "Mishaal", "Bandar", "Nasser", "Saud", "Rashed", "Talal", "Waleed",
    "Fatima", "Noura", "Mona", "Sarah", "Aisha", "Mariam", "Hind", "Reem", "Amal", "Latifa",
    "Ayoub"  # Special user
]

LAST_NAMES_AR = [
    "العتيبي", "الدوسري", "القحطاني", "الغامدي", "الزهراني", "الشمري", "المطيري",
    "العمري", "الحربي", "الشهري", "العنزي", "السهلي", "البقمي", "السبيعي",
    "الخالدي", "الجهني", "المالكي", "العسيري", "الرشيدي", "الأحمدي",
    "الزاحم"  # Special user
]

LAST_NAMES_EN = [
    "Al-Otaibi", "Al-Dosari", "Al-Qahtani", "Al-Ghamdi", "Al-Zahrani", "Al-Shammari", "Al-Mutairi",
    "Al-Omari", "Al-Harbi", "Al-Shahri", "Al-Anzi", "Al-Sahli", "Al-Buqami", "Al-Subaie",
    "Al-Khalidi", "Al-Juhani", "Al-Maliki", "Al-Aseeri", "Al-Rashidi", "Al-Ahmadi",
    "Alzahim"  # Special user
]

# Extractor templates by department (name_ar, name_en, icon, desc_ar, desc_en, prompt)
EXTRACTORS_BY_DEPT = {
    "Emerging Technologies": [
        ("مستخرج تحليل الذكاء الاصطناعي", "AI Analysis Extractor", "🤖", "تحليل نماذج الذكاء الاصطناعي واستخراج البيانات", "Analyze AI models and extract data", "قم بتحليل هذا النموذج واستخرج المعلومات الرئيسية"),
        ("مدقق عقود البلوكشين", "Blockchain Contract Auditor", "⛓️", "التحقق من صحة عقود البلوكشين", "Verify blockchain smart contracts", "تحقق من صحة هذا العقد الذكي"),
        ("محلل بيانات IoT", "IoT Data Analyzer", "📡", "تحليل بيانات إنترنت الأشياء", "Analyze Internet of Things data", "استخرج القراءات من بيانات الأجهزة"),
        ("مستخرج نماذج التعلم الآلي", "ML Model Extractor", "🧠", "استخراج معلومات نماذج ML", "Extract ML model information", "استخرج معمارية النموذج ومعاييره"),
        ("مدقق صحة البيانات الضخمة", "Big Data Validator", "💾", "التحقق من جودة البيانات الضخمة", "Validate big data quality", "تحقق من سلامة مجموعة البيانات"),
    ],
    "E-Services": [
        ("مستخرج بيانات الخدمات الإلكترونية", "E-Service Data Extractor", "🌐", "استخراج بيانات الطلبات الإلكترونية", "Extract electronic request data", "استخرج تفاصيل الطلب"),
        ("محقق صحة الطلبات", "Request Validator", "✅", "التحقق من صحة الطلبات المقدمة", "Validate submitted requests", "تحقق من اكتمال هذا الطلب"),
        ("مستخرج تقييم رضا المستخدم", "User Satisfaction Extractor", "⭐", "استخراج تقييمات العملاء", "Extract customer ratings", "استخرج التقييم والتعليقات"),
        ("مدقق هوية المستخدم", "Identity Verifier", "🔐", "التحقق من وثائق الهوية", "Verify identity documents", "تحقق من صحة الهوية الوطنية"),
        ("محلل استخدام الخدمات", "Service Usage Analyzer", "📊", "تحليل أنماط استخدام الخدمات", "Analyze service usage patterns", "استخرج إحصائيات الاستخدام"),
    ],
    "Data Management Office": [
        ("مستخرج جودة البيانات", "Data Quality Extractor", "🎯", "تقييم جودة مجموعات البيانات", "Assess dataset quality", "قيّم جودة هذه البيانات"),
        ("محلل البيانات الوصفية", "Metadata Analyzer", "📋", "استخراج البيانات الوصفية", "Extract metadata", "استخرج البيانات الوصفية من المستند"),
        ("مدقق الامتثال للبيانات", "Data Compliance Auditor", "⚖️", "التحقق من امتثال البيانات", "Verify data compliance", "تحقق من امتثال البيانات للسياسات"),
        ("مستخرج تصنيف البيانات", "Data Classification Extractor", "🏷️", "تصنيف البيانات تلقائياً", "Auto-classify data", "صنّف هذه البيانات حسب الحساسية"),
        ("محلل سلالة البيانات", "Data Lineage Analyzer", "🔍", "تتبع أصل البيانات", "Track data origin", "استخرج مصدر وتاريخ البيانات"),
    ],
    "Database": [
        ("مستخرج مخططات قواعد البيانات", "Database Schema Extractor", "🗄️", "استخراج مخططات SQL", "Extract SQL schemas", "استخرج مخطط قاعدة البيانات"),
        ("محلل استعلامات SQL", "SQL Query Analyzer", "💻", "تحليل وتحسين استعلامات SQL", "Analyze and optimize SQL queries", "حلل هذا الاستعلام واقترح تحسينات"),
        ("مدقق النسخ الاحتياطي", "Backup Validator", "💾", "التحقق من سلامة النسخ الاحتياطية", "Validate backup integrity", "تحقق من اكتمال النسخة الاحتياطية"),
        ("مستخرج بيانات الأداء", "Performance Data Extractor", "⚡", "استخراج مقاييس أداء قواعد البيانات", "Extract database performance metrics", "استخرج إحصائيات الأداء"),
        ("محلل الفهارس", "Index Analyzer", "📇", "تحليل كفاءة الفهارس", "Analyze index efficiency", "حلل استخدام الفهارس"),
    ],
    "VM": [
        ("مستخرج حالة الأجهزة الافتراضية", "VM Status Extractor", "🖥️", "استخراج حالة VMs", "Extract VM status", "استخرج حالة وموارد الآلة الافتراضية"),
        ("محلل استخدام الموارد", "Resource Usage Analyzer", "📈", "تحليل استخدام موارد VM", "Analyze VM resource usage", "حلل استخدام CPU والذاكرة"),
        ("مدقق التكوين", "Configuration Auditor", "⚙️", "التحقق من إعدادات VM", "Verify VM settings", "تحقق من صحة التكوين"),
        ("مستخرج السجلات", "Log Extractor", "📝", "استخراج سجلات الأحداث", "Extract event logs", "استخرج الأحداث المهمة من السجلات"),
        ("محلل الأمان", "Security Analyzer", "🛡️", "تحليل الثغرات الأمنية", "Analyze security vulnerabilities", "افحص VM بحثاً عن ثغرات"),
    ],
    "OS": [
        ("مستخرج سجلات النظام", "System Log Extractor", "📄", "استخراج سجلات نظام التشغيل", "Extract OS logs", "استخرج الأحداث الحرجة"),
        ("محلل تصحيحات الأمان", "Security Patch Analyzer", "🔒", "تحليل التحديثات الأمنية", "Analyze security updates", "حلل حالة التصحيحات الأمنية"),
        ("مدقق التراخيص", "License Auditor", "📜", "التحقق من تراخيص البرامج", "Verify software licenses", "تحقق من صلاحية الترخيص"),
        ("مستخرج معلومات النظام", "System Info Extractor", "ℹ️", "استخراج معلومات النظام", "Extract system information", "استخرج نسخة وإعدادات النظام"),
        ("محلل العمليات", "Process Analyzer", "⚙️", "تحليل العمليات قيد التشغيل", "Analyze running processes", "حلل استهلاك موارد العمليات"),
    ],
    "Risk Management": [
        ("مدقق تقييم المخاطر", "Risk Assessment Auditor", "⚠️", "تقييم المخاطر الأمنية", "Assess security risks", "قيّم مستوى المخاطر في المستند"),
        ("مستخرج تقارير الامتثال", "Compliance Report Extractor", "📊", "استخراج تقارير الامتثال", "Extract compliance reports", "استخرج نتائج التدقيق"),
        ("محلل الثغرات الأمنية", "Vulnerability Analyzer", "🔓", "تحليل نقاط الضعف", "Analyze security weaknesses", "حدد الثغرات الأمنية"),
        ("مستخرج خطط الاستجابة", "Response Plan Extractor", "🚨", "استخراج خطط الطوارئ", "Extract emergency plans", "استخرج إجراءات الاستجابة"),
        ("مدقق السياسات", "Policy Auditor", "📋", "التحقق من الامتثال للسياسات", "Verify policy compliance", "تحقق من التزام المستند بالسياسات"),
    ],
    "IT Strategy & Planning": [
        ("مستخرج خطط المشاريع", "Project Plan Extractor", "📅", "استخراج مكونات خطط المشاريع", "Extract project plan components", "استخرج المهام والجداول الزمنية"),
        ("محلل الميزانية", "Budget Analyzer", "💰", "تحليل الميزانيات", "Analyze budgets", "حلل بنود الميزانية والتكاليف"),
        ("مدقق مؤشرات الأداء", "KPI Auditor", "📊", "التحقق من KPIs", "Verify KPIs", "استخرج وقيّم مؤشرات الأداء"),
        ("مستخرج الأهداف الاستراتيجية", "Strategic Goal Extractor", "🎯", "استخراج الأهداف", "Extract strategic goals", "حدد الأهداف الاستراتيجية"),
        ("محلل ROI", "ROI Analyzer", "💹", "تحليل عائد الاستثمار", "Analyze return on investment", "احسب عائد الاستثمار المتوقع"),
    ],
}


def generate_email(first_name, last_name):
    """Generate email from name."""
    # Transliterate Arabic names to Latin for email
    email_name = f"{first_name[0].lower()}{last_name.lower()}"
    # Remove Arabic characters and use placeholder
    import re
    email_name = re.sub(r'[^\x00-\x7F]+', '', email_name)
    if not email_name:
        email_name = f"user{random.randint(1000, 9999)}"
    return f"{email_name}@mewa.gov.sa"


def seed_data():
    """Seed comprehensive dummy data."""
    print("🗑️  Dropping all existing tables...")
    Base.metadata.drop_all(bind=engine)

    print("🏗️  Creating fresh tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # 1. Create General Managements
        print("\n📊 Creating General Managements...")
        gms = {
            "Digital Transformation": GeneralManagement(
                name_en="Digital Transformation",
                name_ar="التحول الرقمي",
                description_en="General Management for Digital Transformation",
                description_ar="الإدارة العامة للتحول الرقمي"
            ),
            "Infrastructure": GeneralManagement(
                name_en="Infrastructure",
                name_ar="البنية التحتية",
                description_en="General Management for Infrastructure",
                description_ar="الإدارة العامة للبنية التحتية"
            ),
            "IT Governance": GeneralManagement(
                name_en="IT Governance",
                name_ar="حوكمة تقنية المعلومات",
                description_en="General Management for IT Governance",
                description_ar="الإدارة العامة لحوكمة تقنية المعلومات"
            ),
        }

        for gm in gms.values():
            db.add(gm)
        db.commit()
        print(f"✅ Created {len(gms)} General Managements")

        # Refresh to get IDs
        for key in gms:
            db.refresh(gms[key])

        # 2. Create Departments
        print("\n🏢 Creating Departments...")
        dept_structure = {
            "Digital Transformation": [
                ("Emerging Technologies", "التقنيات الناشئة", "Emerging Technologies Department", "إدارة التقنيات الناشئة"),
                ("E-Services", "الخدمات الإلكترونية", "E-Services Department", "إدارة الخدمات الإلكترونية"),
                ("Data Management Office", "مكتب إدارة البيانات", "Data Management Office", "مكتب إدارة البيانات"),
            ],
            "Infrastructure": [
                ("Database", "قواعد البيانات", "Database Administration", "إدارة قواعد البيانات"),
                ("VM", "الأجهزة الافتراضية", "Virtual Machines Administration", "إدارة الأجهزة الافتراضية"),
                ("OS", "أنظمة التشغيل", "Operating Systems Administration", "إدارة أنظمة التشغيل"),
            ],
            "IT Governance": [
                ("Risk Management", "إدارة المخاطر", "Risk Management Department", "إدارة المخاطر"),
                ("IT Strategy & Planning", "الاستراتيجية والتخطيط", "IT Strategy & Planning Department", "إدارة الاستراتيجية والتخطيط"),
            ],
        }

        departments = {}
        for gm_name, depts in dept_structure.items():
            for dept_name, name_ar, desc_en, desc_ar in depts:
                dept = Department(
                    name_en=dept_name,
                    name_ar=name_ar,
                    gm_id=gms[gm_name].id,
                    description_en=desc_en,
                    description_ar=desc_ar
                )
                db.add(dept)
                departments[dept_name] = dept

        db.commit()
        print(f"✅ Created {len(departments)} Departments")

        # Refresh departments
        for dept in departments.values():
            db.refresh(dept)

        # 3. Create Users (3-5 per department, focusing on DT and Infra)
        print("\n👥 Creating Users...")
        users = []

        # Special user: Ayoub Alzahim
        special_user = User(
            full_name_en="Ayoub Alzahim",
            full_name_ar="أيوب الزاحم",
            email="aalzahim@mewa.gov.sa",
            department_id=departments["Emerging Technologies"].id,
            password_hash=get_password_hash("aalzahim@mewa.gov.sa"),
            is_active=True
        )
        db.add(special_user)
        users.append(special_user)

        # Generate users for each department
        used_emails = {"aalzahim@mewa.gov.sa"}
        for dept_name, dept in departments.items():
            # More users for DT and Infra departments
            if dept_name in ["Emerging Technologies", "E-Services", "Data Management Office", "Database", "VM", "OS"]:
                num_users = random.randint(4, 5)
            else:
                num_users = random.randint(3, 4)

            for _ in range(num_users):
                idx_first = random.randint(0, len(FIRST_NAMES_AR) - 1)
                idx_last = random.randint(0, len(LAST_NAMES_AR) - 1)

                first_name_ar = FIRST_NAMES_AR[idx_first]
                last_name_ar = LAST_NAMES_AR[idx_last]
                first_name_en = FIRST_NAMES_EN[idx_first]
                last_name_en = LAST_NAMES_EN[idx_last]

                full_name_ar = f"{first_name_ar} {last_name_ar}"
                full_name_en = f"{first_name_en} {last_name_en}"

                # Generate unique email (using English name)
                attempt = 0
                while attempt < 10:
                    email = f"{first_name_en[0].lower()}{last_name_en.replace('-', '').lower()}{attempt if attempt > 0 else ''}@mewa.gov.sa"

                    if email not in used_emails:
                        used_emails.add(email)
                        break
                    attempt += 1

                user = User(
                    full_name_en=full_name_en,
                    full_name_ar=full_name_ar,
                    email=email,
                    department_id=dept.id,
                    password_hash=get_password_hash(email),
                    is_active=True
                )
                db.add(user)
                users.append(user)

        db.commit()
        print(f"✅ Created {len(users)} Users")

        # Refresh users
        for user in users:
            db.refresh(user)

        # 4. Create Extractors (2-5 per user)
        print("\n🔧 Creating Extractors...")
        extractors = []
        user_extractors = {}  # Track extractors by user
        extractor_counter = 1

        for user in users:
            dept = db.query(Department).filter(Department.id == user.department_id).first()
            dept_name = dept.name_en  # Use English name as key
            extractor_templates = EXTRACTORS_BY_DEPT.get(dept_name, [])

            if not extractor_templates:
                continue

            num_extractors = random.randint(2, min(5, len(extractor_templates)))
            selected_templates = random.sample(extractor_templates, num_extractors)

            user_extractors[user.id] = []
            for name_ar, name_en, icon, desc_ar, desc_en, prompt in selected_templates:
                visibility = random.choices(
                    [VisibilityEnum.PUBLIC, VisibilityEnum.PRIVATE, VisibilityEnum.SHARED],
                    weights=[0.4, 0.4, 0.2]
                )[0]

                extractor = Extractor(
                    extractor_id=f"ext-{extractor_counter:04d}",
                    name_en=name_en,
                    name_ar=name_ar,
                    icon=icon,
                    description_en=desc_en,
                    description_ar=desc_ar,
                    prompt=prompt,
                    llm=random.choice(["gemini-flash", "gemini-pro"]),
                    temperature=round(random.uniform(0.3, 0.9), 1),
                    max_tokens=random.choice([1000, 2000, 4000]),
                    visibility=visibility,
                    owner_id=user.id
                )
                db.add(extractor)
                extractors.append(extractor)
                user_extractors[user.id].append(extractor)
                extractor_counter += 1

        db.commit()
        print(f"✅ Created {len(extractors)} Extractors")

        # Refresh extractors
        for extractor in extractors:
            db.refresh(extractor)

        # 5. Create Extraction Jobs (10-50 per user)
        print("\n📋 Creating Extraction Jobs...")
        jobs = []
        job_counter = 1

        for user in users:
            if user.id not in user_extractors or not user_extractors[user.id]:
                continue

            num_jobs = random.randint(10, 50)
            for _ in range(num_jobs):
                extractor = random.choice(user_extractors[user.id])

                # Generate job
                days_ago = random.randint(0, 90)
                created_at = datetime.utcnow() - timedelta(days=days_ago)

                status = random.choices(
                    ["completed", "failed", "pending"],
                    weights=[0.85, 0.10, 0.05]
                )[0]

                completed_at = created_at + timedelta(minutes=random.randint(1, 30)) if status in ["completed", "failed"] else None

                filename = f"document_{random.randint(1000, 9999)}.pdf"
                job = ExtractionJob(
                    job_id=f"job-{job_counter:06d}",
                    user_id=user.id,
                    extractor_id=extractor.id,
                    file_name=filename,
                    file_path=f"/app/storage/documents/{f'job-{job_counter:06d}'}/{filename}",
                    status=status,
                    result_content="نتيجة الاستخراج" if status == "completed" else None,
                    error_message="خطأ في المعالجة" if status == "failed" else None,
                    created_at=created_at,
                    completed_at=completed_at
                )
                db.add(job)
                jobs.append(job)
                job_counter += 1

        db.commit()
        print(f"✅ Created {len(jobs)} Extraction Jobs")

        # 6. Create Usage Stats (aggregated per extractor)
        print("\n📈 Creating Usage Stats...")
        stats_records = []

        for extractor in extractors:
            # Count all jobs for this extractor
            total_jobs = db.query(ExtractionJob).filter(
                ExtractionJob.extractor_id == extractor.id
            ).count()

            successful_jobs = db.query(ExtractionJob).filter(
                ExtractionJob.extractor_id == extractor.id,
                ExtractionJob.status == "completed"
            ).count()

            failed_jobs = db.query(ExtractionJob).filter(
                ExtractionJob.extractor_id == extractor.id,
                ExtractionJob.status == "failed"
            ).count()

            if total_jobs > 0:
                stat = ExtractorUsageStats(
                    extractor_id=extractor.id,
                    total_uses=total_jobs,
                    successful_uses=successful_jobs,
                    failed_uses=failed_jobs,
                    last_used_at=datetime.utcnow() - timedelta(days=random.randint(0, 30))
                )
                db.add(stat)
                stats_records.append(stat)

        db.commit()
        print(f"✅ Created {len(stats_records)} Usage Stats")

        # 7. Create Ratings (ensure leaderboard thresholds)
        print("\n⭐ Creating Ratings...")
        ratings = []

        # For each extractor, create ratings from different users
        for extractor in extractors:
            # 60% of extractors get ratings
            if random.random() < 0.6:
                num_ratings = random.randint(3, 12)  # Ensure >= 3 for leaderboard

                # Get random users who didn't create this extractor
                potential_raters = [u for u in users if u.id != extractor.owner_id]
                raters = random.sample(potential_raters, min(num_ratings, len(potential_raters)))

                for rater in raters:
                    rating_value = random.choices(
                        [1, 2, 3, 4, 5],
                        weights=[0.05, 0.10, 0.20, 0.35, 0.30]  # Skewed toward higher ratings
                    )[0]

                    reviews = [
                        "مستخرج ممتاز ودقيق",
                        "مفيد جداً",
                        "يحتاج تحسين",
                        "نتائج رائعة",
                        "سريع وموثوق",
                        "مناسب للاستخدام",
                    ]

                    rating = ExtractorRating(
                        extractor_id=extractor.id,
                        user_id=rater.id,
                        rating=rating_value,
                        review=random.choice(reviews) if random.random() < 0.7 else None,
                        created_at=datetime.utcnow() - timedelta(days=random.randint(0, 60))
                    )
                    db.add(rating)
                    ratings.append(rating)

        db.commit()
        print(f"✅ Created {len(ratings)} Ratings")

        # 8. Create Shares (for SHARED extractors)
        print("\n🔗 Creating Extractor Shares...")
        shares = []

        shared_extractors = [e for e in extractors if e.visibility == VisibilityEnum.SHARED]
        for extractor in shared_extractors:
            # Share with 1-3 users
            num_shares = random.randint(1, 3)
            potential_users = [u for u in users if u.id != extractor.owner_id]
            shared_with = random.sample(potential_users, min(num_shares, len(potential_users)))

            for user in shared_with:
                share = ExtractorShare(
                    extractor_id=extractor.id,
                    user_id=user.id
                )
                db.add(share)
                shares.append(share)

        db.commit()
        print(f"✅ Created {len(shares)} Shares")

        # 9. Create Favorites
        print("\n❤️  Creating Favorites...")
        favorites = []

        for user in users:
            # Each user favorites 2-8 public extractors
            public_extractors = [e for e in extractors if e.visibility == VisibilityEnum.PUBLIC and e.owner_id != user.id]
            if public_extractors:
                num_favorites = random.randint(2, min(8, len(public_extractors)))
                favorited = random.sample(public_extractors, num_favorites)

                for extractor in favorited:
                    favorite = UserFavorite(
                        user_id=user.id,
                        extractor_id=extractor.id
                    )
                    db.add(favorite)
                    favorites.append(favorite)

        db.commit()
        print(f"✅ Created {len(favorites)} Favorites")

        # Print Summary
        print("\n" + "="*60)
        print("✅ DUMMY DATA SEEDING COMPLETED!")
        print("="*60)
        print(f"📊 General Managements: {len(gms)}")
        print(f"🏢 Departments: {len(departments)}")
        print(f"👥 Users: {len(users)}")
        print(f"🔧 Extractors: {len(extractors)}")
        print(f"📋 Extraction Jobs: {len(jobs)}")
        print(f"📈 Usage Stats: {len(stats_records)}")
        print(f"⭐ Ratings: {len(ratings)}")
        print(f"🔗 Shares: {len(shares)}")
        print(f"❤️  Favorites: {len(favorites)}")
        print("="*60)

        print("\n🔑 Special Account:")
        print(f"   Name: أيوب الزاحم")
        print(f"   Email: aalzahim@mewa.gov.sa")
        print(f"   Password: aalzahim@mewa.gov.sa")
        print(f"   Department: Emerging Technologies")
        print("="*60)

    except Exception as e:
        print(f"\n❌ Error seeding data: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_data()
