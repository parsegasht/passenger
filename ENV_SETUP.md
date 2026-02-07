# راهنمای تنظیم فایل .env

برای استفاده از این پروژه، باید فایل `.env` را در ریشه پروژه ایجاد کنید و توکن‌های Neshan API را وارد کنید.

## مراحل تنظیم:

1. فایل `.env` را در ریشه پروژه ایجاد کنید
2. متغیرهای زیر را با توکن‌های خود پر کنید:

```env
# Neshan API Keys
# هر اندپوینت Neshan API نیاز به توکن جداگانه دارد

# توکن برای Direction API (مسیریابی)
VITE_NESHAN_DIRECTION_API_KEY=your_direction_api_key_here

# توکن برای Search API (جستجوی مکان)
VITE_NESHAN_SEARCH_API_KEY=your_search_api_key_here

# توکن برای Reverse Geocoding API (تبدیل مختصات به آدرس)
VITE_NESHAN_REVERSE_API_KEY=your_reverse_api_key_here

# توکن برای Quota API (بررسی سهمیه)
VITE_NESHAN_QUOTA_API_KEY=your_quota_api_key_here

# توکن عمومی (برای استفاده در نقشه و جاهای دیگر)
VITE_NESHAN_API_KEY=your_general_api_key_here
```

## نکات مهم:

- **همه توکن‌ها اجباری نیستند**: اگر توکن خاصی را ندارید، می‌توانید از `VITE_NESHAN_API_KEY` به عنوان fallback استفاده کنید
- **اولویت توکن‌ها**: برای هر اندپوینت، ابتدا توکن مخصوص آن بررسی می‌شود، سپس `VITE_NESHAN_API_KEY` به عنوان fallback استفاده می‌شود
- **توجه**: فایل `.env` را در `.gitignore` قرار دهید تا توکن‌های شما در repository قرار نگیرد

## مثال:

```env
VITE_NESHAN_DIRECTION_API_KEY=service.6e0a2dcbc7f643be8a22671d5f750433
VITE_NESHAN_SEARCH_API_KEY=service.c9f64926553e428abe093d2761c95a70
VITE_NESHAN_REVERSE_API_KEY=service.6e0a2dcbc7f643be8a22671d5f750433
VITE_NESHAN_QUOTA_API_KEY=service.6e0a2dcbc7f643be8a22671d5f750433
VITE_NESHAN_API_KEY=web.29ad84af1e62434586225edb75f79f9d
```
