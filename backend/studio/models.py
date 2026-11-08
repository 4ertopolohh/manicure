import uuid
from decimal import Decimal
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models


class SiteSettings(models.Model):
    name = models.CharField('Название студии', max_length=100, default='Тихая форма')
    hero_title = models.CharField('Заголовок первого экрана', max_length=150, default='Красота в твоих руках')
    hero_text = models.TextField('Описание студии', default='Маникюр, который чувствуется твоим. Спокойное пространство, внимание к деталям и время только для себя.')
    master = models.CharField('Имя мастера', max_length=100, default='Алина')
    master_text = models.TextField('О мастере', default='Мне близка красота без лишнего. Мягкая форма, чистые линии и оттенок, в котором комфортно именно тебе. Обсудим пожелания, подберём покрытие и никуда не будем спешить.')
    address = models.CharField('Демонстрационный адрес', max_length=250, default='Москва, Большая Никитская, 22')
    address_note = models.CharField('Пояснение к адресу', max_length=250, default='Условный адрес для демонстрации. Студия вымышленная.')
    step = models.PositiveSmallIntegerField('Шаг начала записи, минут', default=30, validators=[MinValueValidator(5),MaxValueValidator(120)], help_text='Например, 30: 10:00, 10:30, 11:00. От начала каждого рабочего периода.')
    buffer = models.PositiveSmallIntegerField('Перерыв после процедуры, минут', default=15, validators=[MaxValueValidator(120)])
    horizon = models.PositiveSmallIntegerField('Запись вперёд, дней', default=45, validators=[MinValueValidator(1),MaxValueValidator(180)])
    local_test = models.BooleanField('Локальный тестовый режим', default=True, help_text='Только в локальной среде. Интеграции имитируются без внешних запросов.')
    metrika_id = models.CharField('Номер счётчика Яндекс Метрики', max_length=20, blank=True, help_text='Подготовка коммерческой версии. В этой демонстрации внешний счётчик никогда не загружается.')
    map_lon = models.DecimalField('Долгота для Яндекс Карт', max_digits=9, decimal_places=6, default=Decimal('37.598'))
    map_lat = models.DecimalField('Широта для Яндекс Карт', max_digits=9, decimal_places=6, default=Decimal('55.757'))
    canonical = models.URLField('Основной адрес сайта', default='http://127.0.0.1:8018', help_text='Для canonical, Open Graph и sitemap. После публикации укажите HTTPS-домен.')
    seo_title = models.CharField('SEO: заголовок', max_length=160, default='Тихая форма — маникюр и время для себя')
    seo_description = models.TextField('SEO: описание', default='Подберите форму, длину и оттенок маникюра. Выберите удобное свободное время онлайн. Демонстрационный проект Триад Студио.')
    indexable = models.BooleanField('Разрешить индексацию', default=False, help_text='SEO не собирает данные. Демонстрацию рекомендуется оставить закрытой от поисковых систем.')
    updated_at = models.DateTimeField('Обновлено', auto_now=True)
    class Meta:
        verbose_name = 'настройки студии'
        verbose_name_plural = 'Настройки студии'
    def __str__(self): return 'Студия, расписание, интеграции и SEO'
    def clean(self):
        if self.local_test and not settings.LOCAL_DEMO_ALLOWED:
            raise ValidationError({'local_test':'Тестовый режим недоступен в production.'})
        if self.metrika_id and not self.metrika_id.isdecimal():
            raise ValidationError({'metrika_id':'Введите только цифры.'})
        if not -180 <= self.map_lon <= 180 or not -90 <= self.map_lat <= 90:
            raise ValidationError('Проверьте координаты карты.')
    def save(self, *args, **kwargs):
        self.pk = 1
        self.full_clean()
        super().save(*args, **kwargs)
    @classmethod
    def load(cls): return cls.objects.get(pk=1)


class WorkPeriod(models.Model):
    DAYS = [(0,'Понедельник'),(1,'Вторник'),(2,'Среда'),(3,'Четверг'),(4,'Пятница'),(5,'Суббота'),(6,'Воскресенье')]
    weekday = models.PositiveSmallIntegerField('День недели', choices=DAYS)
    start = models.TimeField('С начала')
    end = models.TimeField('До окончания', help_text='Процедура вместе с перерывом должна закончиться до этого времени.')
    class Meta:
        ordering = ['weekday','start']
        verbose_name = 'рабочий период'
        verbose_name_plural = 'Рабочие периоды'
    def __str__(self): return f'{self.get_weekday_display()}: {self.start:%H:%M}–{self.end:%H:%M}'
    def clean(self):
        if self.start and self.end and self.start >= self.end: raise ValidationError('Конец периода должен быть позже начала.')
        if self.start and self.end and WorkPeriod.objects.filter(weekday=self.weekday,start__lt=self.end,end__gt=self.start).exclude(pk=self.pk).exists(): raise ValidationError('Рабочие периоды пересекаются.')


class TimeOff(models.Model):
    date = models.DateField('Дата')
    start = models.TimeField('С', null=True, blank=True, help_text='Оставьте оба времени пустыми для выходного на весь день.')
    end = models.TimeField('До', null=True, blank=True)
    reason = models.CharField('Причина', max_length=100, default='Перерыв')
    class Meta:
        ordering = ['date','start']
        verbose_name = 'исключение расписания'
        verbose_name_plural = 'Выходные и перерывы'
    def __str__(self): return f'{self.date}: {self.reason}'
    def clean(self):
        if bool(self.start) != bool(self.end) or (self.start and self.start >= self.end): raise ValidationError('Задайте корректные начало и конец либо оставьте оба поля пустыми.')


class Service(models.Model):
    name = models.CharField('Название', max_length=100)
    description = models.CharField('Описание', max_length=250)
    price = models.PositiveIntegerField('Стоимость, ₽')
    duration = models.PositiveSmallIntegerField('Длительность, минут', validators=[MinValueValidator(15),MaxValueValidator(480)])
    audience = models.CharField('Для кого', choices=[('women','Женский'),('men','Мужской')], max_length=10, default='women')
    active = models.BooleanField('Показывать', default=True)
    order = models.PositiveSmallIntegerField('Порядок', default=0)
    class Meta:
        ordering = ['order','pk']
        verbose_name = 'услуга'
        verbose_name_plural = 'Услуги и стоимость'
    def __str__(self): return self.name


class NailOption(models.Model):
    kind = models.CharField('Категория', max_length=12, choices=[('shape','Форма'),('length','Длина'),('color','Цвет'),('coating','Покрытие')])
    name = models.CharField('Название', max_length=70)
    value = models.CharField('Значение', max_length=30, help_text='Для цвета: HEX, например #A8233A. Для остальных: короткое латинское имя.')
    extra_price = models.PositiveIntegerField('Доплата, ₽', default=0)
    extra_minutes = models.PositiveSmallIntegerField('Дополнительное время, минут', default=0, validators=[MaxValueValidator(120)])
    order = models.PositiveSmallIntegerField('Порядок', default=0)
    class Meta:
        ordering = ['order','pk']
        constraints = [models.UniqueConstraint(fields=['kind','value'],name='unique_option')]
        verbose_name = 'вариант маникюра'
        verbose_name_plural = 'Форма, длина, цвет и покрытие'
    def __str__(self): return f'{self.get_kind_display()}: {self.name}'
    def clean(self):
        import re
        if self.kind == 'color' and not re.fullmatch(r'#[0-9a-fA-F]{6}',self.value): raise ValidationError({'value':'Цвет должен быть в формате #A8233A.'})


class GalleryImage(models.Model):
    title = models.CharField('Название', max_length=100)
    caption = models.CharField('Подпись', max_length=180)
    image = models.ImageField('Изображение', upload_to='gallery/')
    order = models.PositiveSmallIntegerField('Порядок', default=0)
    class Meta:
        ordering = ['order','pk']
        verbose_name = 'изображение вдохновения'
        verbose_name_plural = 'Галерея вдохновения'
    def __str__(self): return self.title


class Booking(models.Model):
    token = models.UUIDField('Код управления', default=uuid.uuid4, unique=True, editable=False)
    service = models.ForeignKey(Service, on_delete=models.PROTECT, verbose_name='Услуга')
    date = models.DateField('Дата', db_index=True)
    start = models.TimeField('Начало')
    end = models.TimeField('Конец с перерывом')
    duration = models.PositiveSmallIntegerField('Длительность процедуры')
    price = models.PositiveIntegerField('Стоимость, ₽')
    options = models.JSONField('Пожелания', default=dict)
    fake_name = models.CharField('Вымышленное имя', max_length=100)
    fake_contact = models.CharField('Вымышленный контакт', max_length=100)
    reference_count = models.PositiveSmallIntegerField('Число локальных референсов', default=0)
    status = models.CharField('Статус',max_length=12, choices=[('confirmed','Подтверждено'),('cancelled','Отменено'),('completed','Завершено')],default='confirmed')
    created_at = models.DateTimeField('Создано',auto_now_add=True)
    class Meta:
        ordering = ['-date','start']
        verbose_name = 'запись'
        verbose_name_plural = 'Записи клиентов'
    def __str__(self): return f'{self.date} {self.start:%H:%M} · {self.fake_name}'


class IntegrationEvent(models.Model):
    operation = models.CharField('Операция',max_length=100)
    result = models.CharField('Результат',max_length=250)
    created_at = models.DateTimeField('Время',auto_now_add=True)
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'операция интеграции'
        verbose_name_plural = 'Журнал интеграций'
    def __str__(self): return self.operation
