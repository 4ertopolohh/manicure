import json
from hashlib import sha256
from xml.sax.saxutils import escape as xml_escape
from django.conf import settings
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.db import OperationalError
from django.http import JsonResponse, HttpResponse, FileResponse, Http404
from django.middleware.csrf import get_token
from django.utils import timezone
from django.utils.html import escape
from django.views.decorators.http import require_GET, require_POST
from django.shortcuts import render
from .booking import BookingError, parse_date, quote, reserve, slots
from .models import Booking, GalleryImage, NailOption, Service, SiteSettings


def error(exc):
    return JsonResponse({"error": exc.message}, status=exc.status)


@require_GET
def content(request):
    c = SiteSettings.load()
    response = JsonResponse(
        {
            "csrf": get_token(request),
            "studio": {
                "name": c.name,
                "hero_title": c.hero_title,
                "hero_text": c.hero_text,
                "master": c.master,
                "master_text": c.master_text,
                "address": c.address,
                "address_note": c.address_note,
                "horizon": c.horizon,
                "seo_title": c.seo_title,
                "seo_description": c.seo_description,
                "canonical": c.canonical,
                "indexable": c.indexable,
            },
            "services": list(
                Service.objects.filter(active=True).values(
                    "id", "name", "description", "price", "duration", "audience"
                )
            ),
            "options": list(
                NailOption.objects.values(
                    "id", "kind", "name", "value", "extra_price", "extra_minutes"
                )
            ),
            "gallery": [
                {
                    "id": i.pk,
                    "title": i.title,
                    "caption": i.caption,
                    "image": i.image.url,
                }
                for i in GalleryImage.objects.all()
            ],
            "today": timezone.localdate().isoformat(),
        }
    )
    response["Cache-Control"] = "no-store"
    return response


def read_payload(request):
    if request.content_type != "application/json":
        raise BookingError("Ожидается JSON.")
    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise BookingError("Некорректный запрос.")
    if not isinstance(data, dict):
        raise BookingError("Некорректный запрос.")
    return data


@require_GET
def availability(request):
    try:
        option_ids = [int(i) for i in request.GET.get("options", "").split(",") if i]
        _, _, price, duration = quote(request.GET.get("service"), option_ids)
        day = parse_date(request.GET.get("date"))
        response = JsonResponse(
            {"slots": slots(day, duration), "price": price, "duration": duration}
        )
        response["Cache-Control"] = "no-store"
        return response
    except BookingError as exc:
        return error(exc)
    except ValueError:
        return error(BookingError("Некорректные варианты маникюра."))


def booking_data(b):
    return {
        "token": str(b.token),
        "date": b.date.isoformat(),
        "time": b.start.strftime("%H:%M"),
        "duration": b.duration,
        "price": b.price,
        "service": b.service.name,
        "options": b.options,
        "status": b.status,
        "reference_count": b.reference_count,
        "guest": b.fake_name,
    }


@require_POST
def create_booking(request):
    # Reuse the existing random CSRF secret: public bookings need no DB session,
    # IP address, contact data, or extra persistent browser identifier.
    csrf_secret = request.COOKIES.get(settings.CSRF_COOKIE_NAME)
    if csrf_secret:
        key = "booking:" + sha256(csrf_secret.encode()).hexdigest()
        attempts = cache.get(key, 0)
        if attempts >= 12:
            return JsonResponse(
                {"error": "Слишком много попыток. Попробуйте через минуту."}, status=429
            )
        cache.set(key, attempts + 1, 60)
    try:
        data = read_payload(request)
        # Strict allowlist prevents accidental personal data uploads.
        if set(data) - {
            "date",
            "time",
            "service",
            "options",
            "reference_count",
            "guest_name",
            "guest_contact",
        }:
            raise BookingError("Запрос содержит неподдерживаемые поля.")
        # All supplied contact values are ignored; server creates its own fake identity.
        b = reserve(data)
        return JsonResponse(booking_data(b), status=201)
    except BookingError as exc:
        return error(exc)
    except OperationalError:
        return JsonResponse(
            {"error": "Расписание обновляется. Попробуйте ещё раз."}, status=409
        )


@require_POST
def manage_booking(request):
    try:
        data = read_payload(request)
        token = data.get("token")
        if not isinstance(token, str) or len(token) != 36:
            raise BookingError("Проверьте код записи.")
        try:
            b = Booking.objects.select_related("service").get(token=token)
        except (Booking.DoesNotExist, ValueError, ValidationError):
            raise BookingError("Запись с таким кодом не найдена.", 404)
        if data.get("action") == "cancel":
            b.status = "cancelled"
            b.save(update_fields=["status"])
        elif data.get("action") != "lookup":
            raise BookingError("Неизвестное действие.")
        response = JsonResponse(booking_data(b))
        response["Cache-Control"] = "no-store"
        return response
    except BookingError as exc:
        return error(exc)


@require_GET
def robots(request):
    c = SiteSettings.load()
    rules = (
        "Allow: /\nDisallow: /admin/\nDisallow: /api/" if c.indexable else "Disallow: /"
    )
    return HttpResponse(
        f'User-agent: *\n{rules}\nSitemap: {c.canonical.rstrip("/")}/sitemap.xml\n',
        content_type="text/plain",
    )


@require_GET
def sitemap(request):
    c = SiteSettings.load()
    return HttpResponse(
        f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>{xml_escape(c.canonical.rstrip("/") + "/")}</loc><lastmod>{c.updated_at.date().isoformat()}</lastmod></url></urlset>',
        content_type="application/xml",
    )


def not_found(request):
    return render(request, "404.html", status=404)


@require_GET
def site(request, resource=""):
    root = settings.BASE_DIR.parent / "frontend" / "dist"
    if resource:
        target = (root / resource).resolve()
        if not target.is_relative_to(root.resolve()) or not target.is_file():
            raise Http404
        return FileResponse(target.open("rb"))
    if not (root / "index.html").exists():
        return HttpResponse(
            "Frontend: npm run dev в папке frontend. Для единого сайта выполните npm run build.",
            status=503,
        )
    c = SiteSettings.load()
    html = (root / "index.html").read_text(encoding="utf-8")
    import re

    html = re.sub(
        r"<title>.*?</title>", lambda _: f"<title>{escape(c.seo_title)}</title>", html
    )
    html = re.sub(
        r'<meta\s+name="description"\s+content="[^"]*"\s*/?>',
        lambda _: f'<meta name="description" content="{escape(c.seo_description)}">',
        html,
    )
    html = html.replace(
        "<!--SEO-->",
        f'<link rel="canonical" href="{escape(c.canonical.rstrip("/"))}/"><meta name="robots" content="{"index,follow" if c.indexable else "noindex,nofollow"}"><meta property="og:title" content="{escape(c.seo_title)}"><meta property="og:description" content="{escape(c.seo_description)}"><meta property="og:url" content="{escape(c.canonical)}"><meta property="og:image" content="{escape(c.canonical.rstrip("/"))}/images/hero.webp"><meta property="og:type" content="website">',
    )
    structured = json.dumps(
        {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": c.name,
            "url": c.canonical,
            "description": c.seo_description,
            "inLanguage": "ru",
            "creator": {
                "@type": "Organization",
                "name": "Триад Студио",
                "url": "https://nemida-studio.com/ru/",
            },
        },
        ensure_ascii=False,
    ).replace("<", "\\u003c")
    html = html.replace(
        "</head>", f'<script type="application/ld+json">{structured}</script></head>'
    )
    initial = f"<header><strong>{escape(c.name)}</strong></header><main><h1>{escape(c.hero_title)}</h1><p>{escape(c.hero_text)}</p><h2>Маникюр и стоимость</h2>"
    for s in Service.objects.filter(active=True):
        initial += f"<article><h3>{escape(s.name)}</h3><p>{escape(s.description)} · {s.price} ₽ · {s.duration} мин</p></article>"
    initial += f"<h2>О мастере</h2><p>{escape(c.master_text)}</p><h2>Адрес</h2><p>{escape(c.address)}. {escape(c.address_note)}</p><p>Демонстрационная версия. Студия вымышленная. Реальные персональные данные не отправляются и не сохраняются.</p></main>"
    html = html.replace('<div id="root"></div>', f'<div id="root">{initial}</div>')
    response = HttpResponse(html)
    response["Cache-Control"] = "no-cache"
    return response
