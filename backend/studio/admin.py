from django import forms
from django.conf import settings
from django.contrib import admin, messages
from django.core.exceptions import ValidationError
from django.http import HttpResponseRedirect
from django.utils.html import format_html
from .booking import slots, save_admin_booking
from .integrations import provider
from .models import Booking, GalleryImage, IntegrationEvent, NailOption, Service, SiteSettings, TimeOff, WorkPeriod

admin.site.site_header = 'Тихая форма · управление студией'
admin.site.site_title = 'Тихая форма'
admin.site.index_title = 'Расписание, записи и содержание сайта'

@admin.register(SiteSettings)
class SettingsAdmin(admin.ModelAdmin):
    readonly_fields = ['integration_status','updated_at']
    fieldsets = [('Студия',{'fields':['name','hero_title','hero_text','master','master_text','address','address_note']}),('Запись и расписание',{'fields':['step','buffer','horizon'],'description':'Рабочие часы на каждый день и перерывы редактируются в разделах «Рабочие периоды» и «Выходные и перерывы». Уже созданные записи сохраняются при изменении расписания.'}),('Интеграции и локальная проверка',{'fields':['local_test','integration_status','metrika_id','map_lon','map_lat'],'description':'Демонстрация не загружает внешние счётчики и карты. Тестовый режим доступен только локально и не отключает авторизацию.'}),('SEO',{'fields':['canonical','seo_title','seo_description','indexable','updated_at']})]
    def has_add_permission(self,request): return not SiteSettings.objects.exists()
    def has_delete_permission(self,request,obj=None): return False
    @admin.display(description='Состояние подключений')
    def integration_status(self,obj):
        states=provider(obj).status()
        label='ЛОКАЛЬНЫЙ ТЕСТОВЫЙ РЕЖИМ ВКЛЮЧЁН' if settings.LOCAL_DEMO_ALLOWED and obj.local_test else 'Имитация выключена'
        return format_html('<strong>{}</strong><br>Метрика: {}<br>Карты: {}<br>Уведомления: {}',label,states['metrika'],states['maps'],states['notification'])

@admin.register(WorkPeriod)
class WorkAdmin(admin.ModelAdmin):
    list_display=['weekday','start','end']
    list_filter=['weekday']

@admin.register(TimeOff)
class OffAdmin(admin.ModelAdmin):
    list_display=['date','start','end','reason']
    list_filter=['date']
    date_hierarchy='date'

@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display=['name','audience','price','duration','active','order']
    list_filter=['audience','active']
    list_editable=['price','duration','active','order']
    search_fields=['name']

@admin.register(NailOption)
class OptionAdmin(admin.ModelAdmin):
    list_display=['name','kind','value','extra_price','extra_minutes','order']
    list_filter=['kind']
    list_editable=['extra_price','extra_minutes','order']

@admin.register(GalleryImage)
class GalleryAdmin(admin.ModelAdmin):
    list_display=['title','preview','order']
    readonly_fields=['preview']
    @admin.display(description='Предпросмотр')
    def preview(self,obj): return format_html('<img src="{}" width="100" style="border-radius:8px" alt="">',obj.image.url) if obj.image else 'Нет изображения'

class BookingForm(forms.ModelForm):
    class Meta:
        model=Booking
        fields='__all__'
    def clean(self):
        data=super().clean()
        if self.errors: return data
        obj=self.instance
        if data.get('status') != 'cancelled' and (data.get('date') != obj.date or data.get('start') != obj.start or (obj.status=='cancelled' and data.get('status')!='cancelled')):
            if not any(s['time']==data['start'].strftime('%H:%M') and s['available'] for s in slots(data['date'],obj.duration,exclude=obj.pk)):
                raise forms.ValidationError('Выбранное время недоступно. Проверьте рабочие периоды, перерывы и другие записи.')
        return data

@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    form=BookingForm
    list_display=['date','start','service','fake_name','price','status']
    list_filter=['status','date','service']
    search_fields=['fake_name','=token']
    date_hierarchy='date'
    readonly_fields=['token','service','end','duration','price','options','fake_name','fake_contact','reference_count','created_at']
    fieldsets=[('Запись',{'fields':['date','start','status','service','duration','end','price']}),('Пожелания и демонстрационные контакты',{'fields':['options','fake_name','fake_contact','reference_count'],'description':'Оригиналы референсов и реальные контакты сюда не поступают. Число референсов демонстрирует сценарий вложения.'}),('Управление',{'fields':['token','created_at']})]
    actions=['cancel_bookings']
    def has_add_permission(self,request): return False
    @admin.action(description='Отменить выбранные записи и освободить время')
    def cancel_bookings(self,request,queryset): queryset.update(status='cancelled')
    def save_model(self,request,obj,form,change):
        if {'date','start','status'} & set(form.changed_data) and not (form.changed_data==['status'] and obj.status in ['cancelled','completed']): save_admin_booking(obj)
        else: obj.save()
    def changeform_view(self,request,object_id=None,form_url='',extra_context=None):
        try: return super().changeform_view(request,object_id,form_url,extra_context)
        except ValidationError as exc:
            self.message_user(request,'; '.join(exc.messages),level=messages.ERROR)
            return HttpResponseRedirect(request.path)

@admin.register(IntegrationEvent)
class EventAdmin(admin.ModelAdmin):
    list_display=['created_at','operation','result']
    readonly_fields=['created_at','operation','result']
    def has_add_permission(self,request): return False
    def has_change_permission(self,request,obj=None): return False
