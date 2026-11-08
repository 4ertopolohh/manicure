"""One scheduler for public bookings and administrative rescheduling."""
import secrets
from datetime import date, datetime, timedelta
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from .models import Booking, NailOption, Service, SiteSettings, TimeOff, WorkPeriod


class BookingError(Exception):
    def __init__(self, message, status=400):
        self.message, self.status = message, status


def quote(service_id, option_ids):
    try: service = Service.objects.get(pk=service_id, active=True)
    except (Service.DoesNotExist, ValueError, TypeError): raise BookingError('Выберите доступную услугу.')
    if not isinstance(option_ids, list) or len(option_ids) > 4 or any(type(i) is not int for i in option_ids): raise BookingError('Проверьте варианты маникюра.')
    options = list(NailOption.objects.filter(pk__in=option_ids))
    if len(options) != len(option_ids) or len({o.kind for o in options}) != len(options): raise BookingError('Проверьте варианты маникюра.')
    if service.audience == 'women' and {o.kind for o in options} != {'shape','length','color','coating'}: raise BookingError('Выберите форму, длину, цвет и покрытие.')
    if service.audience == 'men' and options: raise BookingError('Для мужского маникюра дополнительные варианты не нужны.')
    return service, options, service.price + sum(o.extra_price for o in options), service.duration + sum(o.extra_minutes for o in options)


def parse_date(value):
    try: return date.fromisoformat(value)
    except (ValueError, TypeError): raise BookingError('Некорректная дата.')


def slots(day, duration, config=None, exclude=None):
    config = config or SiteSettings.load()
    today = timezone.localdate()
    if not today <= day <= today + timedelta(days=config.horizon): return []
    periods = WorkPeriod.objects.filter(weekday=day.weekday())
    offs = list(TimeOff.objects.filter(date=day))
    if any(o.start is None for o in offs): return []
    busy = list(Booking.objects.filter(date=day).exclude(status='cancelled').exclude(pk=exclude).values_list('start','end'))
    busy += [(o.start,o.end) for o in offs]
    result = []
    now = timezone.localtime().replace(tzinfo=None)
    for period in periods:
        current = datetime.combine(day,period.start)
        limit = datetime.combine(day,period.end)
        while current + timedelta(minutes=duration+config.buffer) <= limit:
            end = (current + timedelta(minutes=duration+config.buffer)).time()
            available = current > now and not any(current.time() < e and end > s for s,e in busy)
            result.append({'time':current.strftime('%H:%M'),'available':available})
            current += timedelta(minutes=config.step)
    return result


def reserve(payload):
    day = parse_date(payload.get('date'))
    service, options, price, duration = quote(payload.get('service'),payload.get('options',[]))
    start = payload.get('time')
    count = payload.get('reference_count',0)
    if type(count) is not int or not 0 <= count <= 3: raise BookingError('Можно выбрать не более трёх референсов.')
    # Acquire the SQLite write lock before reading occupancy: concurrent writers
    # re-evaluate against committed bookings, including partially overlapping starts.
    with transaction.atomic():
        SiteSettings.objects.filter(pk=1).update(updated_at=timezone.now())
        config = SiteSettings.load()
        if not any(s['time'] == start and s['available'] for s in slots(day,duration,config)):
            raise BookingError('Это время уже недоступно. Выберите другое.',409)
        st = datetime.strptime(start,'%H:%M')
        booking = Booking.objects.create(service=service,date=day,start=st.time(),end=(st+timedelta(minutes=duration+config.buffer)).time(),duration=duration,price=price,options={o.kind:o.name for o in options},fake_name=f'Гость {secrets.randbelow(90000)+10000}',fake_contact=f'guest-{secrets.token_hex(5)}@example.invalid',reference_count=count)
    return booking


def save_admin_booking(obj):
    with transaction.atomic():
        SiteSettings.objects.filter(pk=1).update(updated_at=timezone.now())
        if obj.status != 'cancelled':
            available = slots(obj.date,obj.duration,exclude=obj.pk)
            if not any(s['time']==obj.start.strftime('%H:%M') and s['available'] for s in available):
                raise ValidationError('Это время недоступно. Проверьте расписание и соседние записи.')
        end = datetime.combine(obj.date,obj.start)+timedelta(minutes=obj.duration+SiteSettings.load().buffer)
        obj.end = end.time()
        obj.save()
