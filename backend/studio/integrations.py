from django.conf import settings
from .models import IntegrationEvent


class LocalProvider:
    def status(self):
        return {
            "metrika": "Подключена · локальная имитация",
            "maps": "Подключены · локальная схема",
            "notification": "Подключены · имитация",
        }

    def record(self, operation):
        IntegrationEvent.objects.create(
            operation=operation,
            result="Успешно имитировано локально. Внешний запрос не отправлялся.",
        )


class PrivacyProvider:
    def __init__(self, config):
        self.config = config

    def status(self):
        return {
            "metrika": (
                "Внешняя аналитика заблокирована политикой демонстрации"
                if self.config.metrika_id
                else "Не настроена: отсутствует номер счётчика"
            ),
            "maps": "Локальная схема: внешний виджет заблокирован политикой демонстрации",
            "notification": "Внешние уведомления отключены",
        }

    def record(self, operation):
        pass


def provider(config):
    return (
        LocalProvider()
        if settings.LOCAL_DEMO_ALLOWED and config.local_test
        else PrivacyProvider(config)
    )
