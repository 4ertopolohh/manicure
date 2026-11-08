"""Integration checks for booking, privacy, scheduling and access control."""

from concurrent.futures import ThreadPoolExecutor
from datetime import time, timedelta
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from django.db import close_old_connections
from django.test import Client, TestCase, TransactionTestCase, override_settings
from django.utils import timezone
from .models import Booking, NailOption, Service, SiteSettings, TimeOff, WorkPeriod
from .integrations import provider


def fixture():
    SiteSettings.objects.create(indexable=False)
    for day in range(7):
        WorkPeriod.objects.create(weekday=day, start=time(10), end=time(20))
    service = Service.objects.create(
        name="Маникюр", description="Уход", price=2300, duration=90
    )
    options = []
    for kind, value in [
        ("shape", "oval"),
        ("length", "short"),
        ("color", "#C88D90"),
        ("coating", "gel"),
    ]:
        options.append(NailOption.objects.create(kind=kind, name=kind, value=value).pk)
    return {
        "service": service.pk,
        "options": options,
        "date": (timezone.localdate() + timedelta(days=1)).isoformat(),
        "time": "10:00",
        "reference_count": 2,
        "guest_name": "Настоящее имя",
        "guest_contact": "+79991234567",
    }


class BookingFlowTests(TestCase):
    def setUp(self):
        self.payload = fixture()

    def post(self, path, data):
        return self.client.post(path, data, content_type="application/json")

    def available(self):
        return self.client.get(
            "/api/availability/",
            {
                "date": self.payload["date"],
                "service": self.payload["service"],
                "options": ",".join(map(str, self.payload["options"])),
            },
        ).json()["slots"]

    def test_overlap_buffer_and_cancellation(self):
        created = self.post("/api/bookings/", self.payload)
        self.assertEqual(created.status_code, 201)
        times = {v["time"]: v["available"] for v in self.available()}
        self.assertFalse(times["10:00"])
        self.assertFalse(times["11:30"])  # 90 minutes + 15-minute buffer
        self.assertTrue(times["12:00"])
        self.assertEqual(
            self.post("/api/bookings/", {**self.payload, "time": "10:30"}).status_code,
            409,
        )
        token = created.json()["token"]
        self.assertEqual(
            self.post(
                "/api/bookings/manage/", {"token": token, "action": "cancel"}
            ).status_code,
            200,
        )
        self.assertTrue({v["time"]: v["available"] for v in self.available()}["10:00"])
        self.assertEqual(self.post("/api/bookings/", self.payload).status_code, 201)

    def test_contact_values_are_discarded_and_files_rejected(self):
        result = self.post("/api/bookings/", self.payload)
        self.assertEqual(result.status_code, 201)
        b = Booking.objects.get()
        self.assertNotIn("Настоящее", str(b.__dict__))
        self.assertNotIn("79991234567", str(b.__dict__))
        self.assertTrue(b.fake_contact.endswith("@example.invalid"))
        self.assertEqual(b.reference_count, 2)
        self.assertEqual(
            self.post(
                "/api/bookings/", {**self.payload, "photos": ["secret.jpg"]}
            ).status_code,
            400,
        )
        self.assertEqual(
            self.post(
                "/api/bookings/", {**self.payload, "reference_count": 4}
            ).status_code,
            400,
        )

    def test_closed_dates_partial_breaks_and_configured_step(self):
        day = timezone.localdate() + timedelta(days=1)
        TimeOff.objects.create(date=day, start=time(11), end=time(12))
        times = {v["time"]: v["available"] for v in self.available()}
        self.assertFalse(times["10:00"])
        self.assertFalse(times["11:30"])
        self.assertTrue(times["12:00"])
        c = SiteSettings.load()
        c.step = 45
        c.save()
        self.assertIn("10:45", [v["time"] for v in self.available()])
        self.assertNotIn("10:30", [v["time"] for v in self.available()])
        TimeOff.objects.create(date=day, reason="Выходной")
        self.assertEqual(self.available(), [])

    def test_duration_options_and_end_of_day(self):
        length = NailOption.objects.get(kind="length")
        length.extra_minutes = 30
        length.extra_price = 400
        length.save()
        result = self.post("/api/bookings/", {**self.payload, "time": "18:00"})
        self.assertEqual(
            result.status_code, 409
        )  # 120 minutes + 15 buffer exceeds 20:00
        result = self.post("/api/bookings/", {**self.payload, "time": "17:30"})
        self.assertEqual(result.status_code, 201)
        self.assertEqual(result.json()["price"], 2700)
        self.assertEqual(result.json()["duration"], 120)

    def test_invalid_input_and_unpredictable_management_code(self):
        self.assertEqual(
            self.post(
                "/api/bookings/manage/", {"token": "x" * 36, "action": "lookup"}
            ).status_code,
            404,
        )
        self.assertEqual(
            self.post(
                "/api/bookings/", {**self.payload, "date": "nonsense"}
            ).status_code,
            400,
        )
        self.assertEqual(
            self.post("/api/bookings/", {**self.payload, "options": []}).status_code,
            400,
        )
        self.assertEqual(
            self.post("/api/bookings/", {**self.payload, "time": "10:15"}).status_code,
            409,
        )

    def test_csrf_and_admin_authentication(self):
        client = Client(enforce_csrf_checks=True)
        self.assertEqual(
            client.post(
                "/api/bookings/", self.payload, content_type="application/json"
            ).status_code,
            403,
        )
        csrf = client.get("/api/content/").json()["csrf"]
        self.assertEqual(
            client.post(
                "/api/bookings/",
                self.payload,
                content_type="application/json",
                HTTP_X_CSRFTOKEN=csrf,
            ).status_code,
            201,
        )
        self.assertEqual(self.client.get("/admin/studio/booking/").status_code, 302)

    def test_public_config_and_seo(self):
        c = self.client.get("/api/content/").json()
        self.assertNotIn("metrika_id", c["studio"])
        self.assertNotIn("local_test", c["studio"])
        self.assertContains(self.client.get("/robots.txt"), "Disallow: /")
        self.assertContains(self.client.get("/sitemap.xml"), "http://127.0.0.1:8018/")
        cfg = SiteSettings.load()
        cfg.indexable = True
        cfg.canonical = "https://example.com"
        cfg.save()
        self.assertContains(self.client.get("/robots.txt"), "Allow: /")
        self.assertContains(self.client.get("/sitemap.xml"), "https://example.com/")

    @override_settings(LOCAL_DEMO_ALLOWED=False)
    def test_test_mode_cannot_be_enabled_in_production(self):
        c = SiteSettings.load()
        self.assertNotIn("имитация", provider(c).status()["metrika"])
        with self.assertRaises(ValidationError):
            c.save()

    def test_work_period_validation(self):
        with self.assertRaises(ValidationError):
            WorkPeriod(weekday=0, start=time(12), end=time(14)).full_clean()

    def test_admin_rescheduling_uses_same_occupancy_rules(self):
        admin_user = get_user_model().objects.create_superuser(
            "test-admin", "test@example.invalid", "only-for-tests"
        )
        first = self.post("/api/bookings/", self.payload).json()
        second = self.post("/api/bookings/", {**self.payload, "time": "14:00"}).json()
        self.client.force_login(admin_user)
        self.assertContains(self.client.get("/admin/"), "Локальный тестовый режим")
        booking = Booking.objects.get(token=first["token"])
        url = f"/admin/studio/booking/{booking.pk}/change/"
        response = self.client.post(
            url,
            {
                "date": self.payload["date"],
                "start": "14:30",
                "status": "confirmed",
                "_save": "Сохранить",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Выбранное время недоступно")
        booking.refresh_from_db()
        self.assertEqual(booking.start, time(10))
        response = self.client.post(
            url,
            {
                "date": self.payload["date"],
                "start": "17:00",
                "status": "confirmed",
                "_save": "Сохранить",
            },
        )
        self.assertEqual(response.status_code, 302)
        booking.refresh_from_db()
        self.assertEqual(booking.start, time(17))
        self.assertEqual(booking.end, time(18, 45))

    def test_custom_not_found_page(self):
        self.assertContains(
            self.client.get("/missing-page/"), "Здесь пока тихо.", status_code=404
        )

    def test_rate_limit_reuses_csrf_without_creating_public_sessions(self):
        from django.contrib.sessions.models import Session

        client = Client(enforce_csrf_checks=True)
        csrf = client.get("/api/content/").json()["csrf"]
        for _ in range(12):
            response = client.post(
                "/api/bookings/",
                self.payload,
                content_type="application/json",
                HTTP_X_CSRFTOKEN=csrf,
            )
            self.assertIn(response.status_code, [201, 409])
        response = client.post(
            "/api/bookings/",
            self.payload,
            content_type="application/json",
            HTTP_X_CSRFTOKEN=csrf,
        )
        self.assertEqual(response.status_code, 429)
        self.assertEqual(Session.objects.count(), 0)

    def test_seed_is_repeatable_and_preserves_settings(self):
        from django.core.management import call_command
        from io import StringIO
        from pathlib import Path
        from tempfile import TemporaryDirectory

        config = SiteSettings.load()
        config.step = 45
        config.save()
        with TemporaryDirectory() as temp_root:
            with override_settings(BASE_DIR=Path(temp_root)):
                (Path(temp_root) / ".local").mkdir()
                call_command("seed_demo", stdout=StringIO())
                counts = (
                    Service.objects.count(),
                    NailOption.objects.count(),
                    Booking.objects.count(),
                )
                call_command("seed_demo", stdout=StringIO())
        self.assertEqual(
            counts,
            (
                Service.objects.count(),
                NailOption.objects.count(),
                Booking.objects.count(),
            ),
        )
        self.assertEqual(SiteSettings.load().step, 45)


class ConcurrentBookingTests(TransactionTestCase):
    def test_two_simultaneous_requests_cannot_overlap(self):
        payload = fixture()

        def attempt(args):
            start, day = args
            close_old_connections()
            try:
                return (
                    Client()
                    .post(
                        "/api/bookings/",
                        {**payload, "time": start, "date": day},
                        content_type="application/json",
                    )
                    .status_code
                )
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as executor:
            for offset in range(1, 21):
                day = (timezone.localdate() + timedelta(days=offset)).isoformat()
                statuses = list(executor.map(attempt, [("10:00", day), ("10:30", day)]))
                self.assertEqual(sorted(statuses), [201, 409], f"Day {offset}")
        self.assertEqual(Booking.objects.count(), 20)
