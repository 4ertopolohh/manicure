from django.conf import settings
from .models import SiteSettings


def admin_mode(request):
    if not request.path.startswith("/admin/") or not request.user.is_staff:
        return {}
    config = SiteSettings.objects.filter(pk=1).first()
    return {
        "local_test_active": bool(
            config and config.local_test and settings.LOCAL_DEMO_ALLOWED
        )
    }
