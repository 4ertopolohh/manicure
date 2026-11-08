import secrets
from datetime import time, timedelta
from django.conf import settings
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from studio.models import (
    SiteSettings,
    WorkPeriod,
    Service,
    NailOption,
    GalleryImage,
    Booking,
)
from studio.booking import reserve, BookingError


class Command(BaseCommand):
    help = "Идемпотентное наполнение демонстрации. Существующие настройки не перезаписываются."

    def handle(self, *args, **kwargs):
        SiteSettings.objects.get_or_create(
            pk=1, defaults={"local_test": settings.LOCAL_DEMO_ALLOWED}
        )
        if not WorkPeriod.objects.exists():
            for d in range(7):
                WorkPeriod.objects.create(weekday=d, start=time(10), end=time(20))
        services = [
            (
                "Маникюр с покрытием",
                "Обработка, аккуратная форма и однотонное покрытие.",
                2300,
                90,
                "women",
            ),
            (
                "Бережный маникюр",
                "Чистая обработка и уход без цветного покрытия.",
                1500,
                60,
                "women",
            ),
            (
                "Мужской маникюр",
                "Естественная форма, обработка и увлажняющий уход.",
                1800,
                60,
                "men",
            ),
        ]
        for n, desc, p, d, a in services:
            Service.objects.get_or_create(
                name=n,
                defaults={
                    "description": desc,
                    "price": p,
                    "duration": d,
                    "audience": a,
                    "order": services.index((n, desc, p, d, a)),
                },
            )
        options = {
            "shape": [
                ("Мягкий квадрат", "square", 0, 0),
                ("Овал", "oval", 0, 0),
                ("Миндаль", "almond", 0, 0),
            ],
            "length": [
                ("Короткая", "short", 0, 0),
                ("Средняя", "medium", 200, 15),
                ("Длинная", "long", 400, 30),
            ],
            "color": [
                ("Молочный", "#E8D7CB", 0, 0),
                ("Пудровый", "#C88D90", 0, 0),
                ("Вишня", "#7D223A", 0, 0),
                ("Красный", "#BD3A38", 0, 0),
                ("Кофе", "#805E50", 0, 0),
                ("Графит", "#343436", 0, 0),
            ],
            "coating": [
                ("Гель-лак", "gel", 0, 0),
                ("Обычный лак", "polish", 0, 0),
                ("Без покрытия", "bare", 0, 0),
            ],
        }
        for kind, items in options.items():
            for order, (n, v, p, m) in enumerate(items):
                NailOption.objects.get_or_create(
                    kind=kind,
                    value=v,
                    defaults={
                        "name": n,
                        "extra_price": p,
                        "extra_minutes": m,
                        "order": order,
                    },
                )
        for i, (n, c, img) in enumerate(
            [
                ("Тёплый нюд", "Естественность в каждой детали", "nude.webp"),
                ("Нежный акцент", "Мягкая палитра, твой характер", "pink.webp"),
                ("Чистая форма", "Ничего лишнего", "detail.webp"),
            ]
        ):
            GalleryImage.objects.get_or_create(
                title=n, defaults={"caption": c, "image": "gallery/" + img, "order": i}
            )
        if settings.LOCAL_DEMO_ALLOWED and not Booking.objects.exists():
            service = Service.objects.filter(active=True, audience="women").first()
            option_ids = [
                NailOption.objects.filter(kind=k).first().pk
                for k in ["shape", "length", "color", "coating"]
            ]
            for days, start in [(1, "11:30"), (3, "15:00")]:
                try:
                    reserve(
                        {
                            "service": service.pk,
                            "options": option_ids,
                            "date": (
                                timezone.localdate() + timedelta(days=days)
                            ).isoformat(),
                            "time": start,
                            "reference_count": 0,
                        }
                    )
                except BookingError:
                    # Keep an administrator's existing schedule intact.
                    pass
        user_model = get_user_model()
        if (
            settings.LOCAL_DEMO_ALLOWED
            and not user_model.objects.filter(is_superuser=True).exists()
        ):
            password = secrets.token_urlsafe(18)
            user_model.objects.create_superuser(
                "admin", "admin@example.invalid", password
            )
            (settings.BASE_DIR / ".local" / "admin-login.txt").write_text(
                f"Login: admin\nPassword: {password}\n", encoding="utf-8"
            )
            self.stdout.write(
                "Локальный пароль администратора: backend/.local/admin-login.txt (исключён из Git)."
            )
        self.stdout.write(self.style.SUCCESS("Содержание и настройки подготовлены."))
