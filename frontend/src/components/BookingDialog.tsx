import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Booking, Content, NailOption, Selection, Slot } from "../types";
import {
  availability,
  longDate,
  makeBooking,
  manageBooking,
  money,
} from "../api";
import Calendar from "./Calendar";
import NailShapeChoice from "./NailShapeChoice";
import s from "./BookingDialog.module.scss";

interface Props {
  content: Content;
  selection: Selection | null;
  manage: boolean;
  onClose: () => void;
}
interface Preview {
  url: string;
  id: string;
}
export default function BookingDialog({
  content,
  selection,
  manage,
  onClose,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<Selection>(
    selection || { service: content.services[0]?.id || 0, options: [] },
  );
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<number | undefined>(undefined);
  const [step, setStep] = useState(0);
  const [date, setDate] = useState(content.today);
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [slotError, setSlotError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [photos, setPhotos] = useState<Preview[]>([]);
  const photoRef = useRef<Preview[]>([]);
  const file = useRef<HTMLInputElement>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState("");
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const service = content.services.find((v) => v.id === selected.service) || {
    id: 0,
    name: "Услуга недоступна",
    price: 0,
    duration: 0,
    audience: "women",
  };
  const options = content.options.filter((o) =>
    selected.options.includes(o.id),
  );
  const price = service.price + options.reduce((n, o) => n + o.extra_price, 0);
  const duration =
    service.duration + options.reduce((n, o) => n + o.extra_minutes, 0);
  const chooseOption = (option: NailOption) => {
    setTime("");
    setSelected((current) => ({
      ...current,
      options: [
        ...current.options.filter(
          (id) =>
            content.options.find((candidate) => candidate.id === id)?.kind !==
            option.kind,
        ),
        option.id,
      ],
    }));
  };
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(closeTimer.current);
      document.body.style.overflow = old;
      previous?.focus();
      photoRef.current.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, []);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    if (dialog.current) dialog.current.scrollTop = 0;
  }, [step, booking]);
  useEffect(() => {
    if (manage || step !== 1 || booking) return;
    let controller = new AbortController();
    const load = (initial: boolean) => {
      controller.abort();
      controller = new AbortController();
      const signal = controller.signal;
      if (initial) setLoading(true);
      availability(selected, date, signal)
        .then((v) => {
          setSlots(v.slots);
          setSlotError("");
          setTime((t) =>
            v.slots.some((s) => s.available && s.time === t) ? t : "",
          );
        })
        .catch((e) => {
          if (e.name !== "AbortError") {
            setSlotError("Не удалось обновить время. Попробуйте ещё раз.");
            setSlots([]);
            setTime("");
          }
        })
        .finally(() => {
          if (!signal.aborted) setLoading(false);
        });
    };
    load(true);
    const timer = window.setInterval(() => load(false), 20000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [selected, date, step, manage, booking, refresh]);
  const updatePhotos = (items: Preview[]) => {
    photoRef.current = items;
    setPhotos(items);
  };
  const attach = (files: FileList | null) => {
    if (!files) return;
    setError("");
    const list = Array.from(files);
    if (photos.length + list.length > 3) {
      setError("Можно выбрать не более трёх фотографий.");
      return;
    }
    if (
      list.some(
        (f) =>
          !["image/jpeg", "image/png", "image/webp"].includes(f.type) ||
          f.size > 5 * 1024 * 1024,
      )
    ) {
      setError("Выберите JPG, PNG или WebP до 5 МБ каждое.");
      return;
    }
    updatePhotos([
      ...photos,
      ...list.map((f) => ({
        url: URL.createObjectURL(f),
        id: crypto.randomUUID(),
      })),
    ]);
  };
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const phone = form.elements.namedItem("phone") as HTMLInputElement;
    if (
      phone.value.replace(/\D/g, "").length < 10 ||
      phone.value.replace(/\D/g, "").length > 15
    ) {
      setError("Укажите телефон: от 10 до 15 цифр.");
      phone.focus();
      return;
    }
    // The contact values are used only by browser validation and cleared before fetch.
    form.reset();
    setPending(true);
    setError("");
    try {
      const b = await makeBooking(selected, date, time, photos.length);
      setBooking(b);
      updatePhotos([]);
      photoRef.current = [];
      photos.forEach((p) => URL.revokeObjectURL(p.url));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не удалось подтвердить запись.",
      );
      setStep(1);
      setRefresh((v) => v + 1);
    } finally {
      setPending(false);
    }
  };
  const lookup = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError("");
    try {
      setBooking(await manageBooking(code.trim(), "lookup"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Запись не найдена.");
    } finally {
      setPending(false);
    }
  };
  const cancel = async () => {
    if (!booking) return;
    setPending(true);
    setError("");
    try {
      setBooking(await manageBooking(booking.token, "cancel"));
      setCancelConfirm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось отменить запись.");
    } finally {
      setPending(false);
    }
  };
  const copy = async () => {
    if (!booking) return;
    try {
      await navigator.clipboard.writeText(booking.token);
      setNotice("Код скопирован. Сохраните его у себя.");
    } catch {
      setNotice("Выделите код ниже и скопируйте вручную.");
    }
  };
  const dismiss = () => {
    if (pending || closing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      dialog.current?.close();
      onClose();
      return;
    }
    setClosing(true);
    closeTimer.current = window.setTimeout(() => {
      dialog.current?.close();
      onClose();
    }, 220);
  };
  return (
    <dialog
      ref={dialog}
      className={`${s.dialog} ${closing ? s.closing : ""}`}
      aria-busy={pending}
      onCancel={(e) => {
        e.preventDefault();
        dismiss();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
      aria-labelledby="booking-title"
    >
      <div className={s.panel} inert={closing}>
        <div className={s.top}>
          <span className={s.brand}>
            <img src="/images/project-logo-03-2048.png" alt={content.studio.name} />
          </span>
          <button
            type="button"
            className={s.close}
            onClick={dismiss}
            disabled={pending}
          >
            Закрыть
          </button>
        </div>
        <h2 id="booking-title" className={s.title} ref={heading} tabIndex={-1}>
          {booking
            ? booking.status === "cancelled"
              ? "Запись отменена"
              : manage
                ? "Твоя запись"
                : "Время для тебя найдено."
            : manage
              ? "Моя запись"
              : "Твоя следующая пауза."}
        </h2>
        {booking ? (
          <div className={s.result}>
            <p>
              {booking.status === "cancelled"
                ? "Время снова доступно для записи."
                : manage
                  ? "Информация о демонстрационной записи."
                  : "Демонстрационная запись подтверждена. Реального визита и уведомлений не будет."}
            </p>
            <div className={s.summary}>
              <h3>{booking.service}</h3>
              <p>
                {longDate(booking.date)} · {booking.time} · {booking.duration}{" "}
                минут
              </p>
              <p>{Object.values(booking.options).join(" · ")}</p>
              <strong>{money(booking.price)}</strong>
              <small>Вымышленный клиент: {booking.guest}</small>
              {booking.reference_count > 0 && (
                <small>
                  Референсов выбрано: {booking.reference_count}. Оригиналы не
                  отправлялись.
                </small>
              )}
            </div>
            <label className={s.codeLabel}>
              Код управления записью
              <input
                readOnly
                value={booking.token}
                onFocus={(e) => e.currentTarget.select()}
                aria-label="Код управления записью"
              />
            </label>
            <p className={s.privacy}>
              Сохраните код: он нужен для просмотра и отмены. Сайт не сохраняет
              его в браузере автоматически.
            </p>
            <div className={s.resultActions}>
              <button className="button secondary" onClick={copy}>
                Скопировать код
              </button>
              {booking.status === "confirmed" && !cancelConfirm && (
                <button
                  className={s.cancelButton}
                  onClick={() => setCancelConfirm(true)}
                >
                  Отменить запись
                </button>
              )}
            </div>
            {cancelConfirm && (
              <div className={s.cancelPrompt}>
                <p>
                  Отменить запись на {longDate(booking.date)}, {booking.time}?
                </p>
                <button className="button" disabled={pending} onClick={cancel}>
                  {pending ? "Отменяем…" : "Да, отменить"}
                </button>
                <button
                  className="textButton"
                  onClick={() => setCancelConfirm(false)}
                >
                  Сохранить запись
                </button>
              </div>
            )}
            {notice && (
              <p role="status" className={s.notice}>
                {notice}
              </p>
            )}
          </div>
        ) : manage ? (
          <form className={s.manageForm} onSubmit={lookup}>
            <p>Введите код, полученный после подтверждения.</p>
            <label>
              Код записи
              <input
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                maxLength={36}
                minLength={36}
                autoComplete="off"
              />
            </label>
            <button className="button" disabled={pending}>
              {pending ? "Ищем…" : "Найти запись"}
            </button>
          </form>
        ) : (
          <>
            <nav className={s.steps} aria-label="Шаги записи">
              {["Маникюр", "Дата и время", "Подтверждение"].map((label, i) => (
                <button
                  type="button"
                  key={label}
                  className={step === i ? s.current : ""}
                  disabled={i > step || pending}
                  aria-current={step === i ? "step" : undefined}
                  onClick={() => setStep(i)}
                >
                  {label}
                </button>
              ))}
            </nav>
            {step === 0 && (
              <div key={step} className={s.stepContent}>
                <fieldset className={s.serviceField}>
                  <legend>Выберите услугу</legend>
                  {content.services.map((v) => (
                    <button
                      type="button"
                      key={v.id}
                      className={
                        v.id === selected.service ? s.selectedService : ""
                      }
                      aria-pressed={v.id === selected.service}
                      onClick={() => {
                        setTime("");
                        setSelected({
                          service: v.id,
                          options:
                            v.audience === "men"
                              ? []
                              : selected.options.length
                                ? selected.options
                                : ["shape", "length", "color", "coating"].map(
                                    (k) =>
                                      content.options.find((o) => o.kind === k)!
                                        .id,
                                  ),
                        });
                      }}
                    >
                      <span>
                        {v.name}
                        <small>{v.duration} минут</small>
                      </span>
                      <strong>{money(v.price)}</strong>
                    </button>
                  ))}
                </fieldset>
                {service.audience === "women" && (
                  <div className={s.optionGrid}>
                    {(["shape", "length", "color", "coating"] as const).map(
                      (kind) => (
                        <fieldset key={kind}>
                          <legend>
                            {
                              {
                                shape: "Форма",
                                length: "Длина",
                                color: "Цвет",
                                coating: "Покрытие",
                              }[kind]
                            }
                          </legend>
                          <div
                            className={
                              kind === "shape"
                                ? s.shapes
                                : kind === "color"
                                  ? s.colorChoices
                                  : s.optionChoices
                            }
                          >
                            {content.options
                              .filter((o) => o.kind === kind)
                              .map((o) =>
                                kind === "shape" ? (
                                  <NailShapeChoice
                                    key={o.id}
                                    value={o.value}
                                    name={o.name}
                                    selected={selected.options.includes(o.id)}
                                    onSelect={() => chooseOption(o)}
                                  />
                                ) : (
                                  <button
                                    type="button"
                                    key={o.id}
                                    aria-pressed={selected.options.includes(
                                      o.id,
                                    )}
                                    aria-label={o.name}
                                    title={o.name}
                                    className={
                                      selected.options.includes(o.id)
                                        ? s.chosenOption
                                        : ""
                                    }
                                    style={
                                      kind === "color"
                                        ? ({
                                            "--swatch": o.value,
                                          } as React.CSSProperties)
                                        : undefined
                                    }
                                    onClick={() => chooseOption(o)}
                                  >
                                    {kind === "color" ? <span /> : o.name}
                                  </button>
                                ),
                              )}
                          </div>
                        </fieldset>
                      ),
                    )}
                  </div>
                )}
                <div className={s.upload}>
                  <h3>Твоя идея в картинках</h3>
                  <p>
                    Можно прикрепить до трёх референсов. В демоверсии фотографии
                    остаются только в этом окне.
                  </p>
                  <input
                    ref={file}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    hidden
                    onChange={(e) => {
                      attach(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    className={s.uploadButton}
                    disabled={photos.length >= 3}
                    onClick={() => file.current?.click()}
                  >
                    Прикрепить фотографии <span>{photos.length} из 3</span>
                  </button>
                  <small>JPG, PNG, WebP · до 5 МБ на фото</small>
                  {photos.length > 0 && (
                    <div className={s.previews}>
                      {photos.map((p, i) => (
                        <div key={p.id}>
                          <img
                            src={p.url}
                            alt={"Локальный референс " + (i + 1)}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              URL.revokeObjectURL(p.url);
                              updatePhotos(photos.filter((v) => v.id !== p.id));
                            }}
                            aria-label={"Удалить референс " + (i + 1)}
                          >
                            Удалить
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className={s.bottom}>
                  <span>
                    {money(price)}
                    <small>{duration} минут</small>
                  </span>
                  <button className="button" onClick={() => setStep(1)}>
                    Выбрать время
                  </button>
                </div>
              </div>
            )}
            {step === 1 && (
              <div key={step} className={s.stepContent}>
                <div className={s.calendarLayout}>
                  <Calendar
                    today={content.today}
                    horizon={content.studio.horizon}
                    value={date}
                    onChange={(d) => {
                      setDate(d);
                      setTime("");
                    }}
                  />
                  <div className={s.times}>
                    <h3>{longDate(date)}</h3>
                    <p>Время Москвы · {duration} минут на процедуру</p>
                    {loading ? (
                      <div
                        className={s.timeSkeleton}
                        aria-label="Загружаем время"
                        aria-busy="true"
                      >
                        {Array.from({ length: 9 }, (_, i) => (
                          <div className="skeleton" key={i} />
                        ))}
                      </div>
                    ) : slotError ? (
                      <div className="error">
                        <p>{slotError}</p>
                        <button
                          className="textButton"
                          onClick={() => setRefresh((v) => v + 1)}
                        >
                          Повторить
                        </button>
                      </div>
                    ) : slots.length === 0 ||
                      !slots.some((v) => v.available) ? (
                      <div className={s.noTime}>
                        На этот день свободного времени нет. Выберите другую
                        дату.
                      </div>
                    ) : (
                      <div className={s.timeGrid}>
                        {slots.map((slot) => (
                          <button
                            type="button"
                            key={slot.time}
                            disabled={!slot.available}
                            aria-label={
                              slot.time +
                              (slot.available ? " — свободно" : " — недоступно")
                            }
                            aria-pressed={time === slot.time}
                            className={time === slot.time ? s.chosenTime : ""}
                            onClick={() => setTime(slot.time)}
                          >
                            {slot.time}
                          </button>
                        ))}
                      </div>
                    )}
                    <p className={s.timeHelp}>
                      Недоступные интервалы нельзя выбрать. Расписание
                      обновляется автоматически.
                    </p>
                  </div>
                </div>
                <div className={s.bottom}>
                  <span>
                    {money(price)}
                    <small>
                      {time
                        ? `${longDate(date)}, ${time}`
                        : "Выберите свободное время"}
                    </small>
                  </span>
                  <button
                    className="button"
                    disabled={!time || loading || !!slotError}
                    onClick={() => setStep(2)}
                  >
                    Продолжить
                  </button>
                </div>
              </div>
            )}
            {step === 2 && (
              <form
                key={step}
                className={s.stepContent}
                onSubmit={submit}
                autoComplete="off"
              >
                <div className={s.summary}>
                  <h3>{service.name}</h3>
                  <p>
                    {longDate(date)} · {time} · {duration} минут
                  </p>
                  <p>{options.map((o) => o.name).join(" · ")}</p>
                  <strong>{money(price)}</strong>
                  {photos.length > 0 && (
                    <small>
                      Локальных референсов: {photos.length}. Фотографии не
                      отправляются.
                    </small>
                  )}
                </div>
                <div className={s.contactFields}>
                  <label>
                    Как к тебе обращаться
                    <input
                      name="name"
                      placeholder="Твоё имя"
                      required
                      minLength={2}
                      maxLength={80}
                      autoComplete="off"
                      disabled={pending}
                    />
                  </label>
                  <label>
                    Телефон
                    <input
                      name="phone"
                      type="tel"
                      placeholder="+7 999 000-00-00"
                      required
                      pattern="[+0-9() \-]{10,25}"
                      maxLength={25}
                      autoComplete="off"
                      disabled={pending}
                    />
                  </label>
                </div>
                <p className={s.privacy}>
                  Это демонстрация записи. Введённые имя и телефон автоматически
                  заменяются случайными вымышленными контактами до отправки на
                  сервер. Они не сохраняются в базе, хранилище браузера или
                  аналитике. Уведомления не отправляются.
                </p>
                <div className={s.bottom}>
                  <button
                    className="textButton"
                    type="button"
                    disabled={pending}
                    onClick={() => setStep(1)}
                  >
                    Изменить время
                  </button>
                  <button className="button" disabled={pending}>
                    {pending ? "Подтверждаем…" : "Подтвердить запись"}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
        {error && (
          <div className={"error " + s.error} role="alert">
            {error}
          </div>
        )}
      </div>
    </dialog>
  );
}
