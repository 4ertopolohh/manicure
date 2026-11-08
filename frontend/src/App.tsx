import { lazy, Suspense, useEffect, useState } from "react";
import { MapPin, Check, Clock3, ShieldCheck } from "lucide-react";
import { loadContent, money } from "./api";
import type { Content, Selection } from "./types";
import Designer from "./components/Designer";
import s from "./App.module.scss";
const BookingDialog = lazy(() => import("./components/BookingDialog"));

export default function App() {
  const [content, setContent] = useState<Content | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [menu, setMenu] = useState(false);
  const [booking, setBooking] = useState<Selection | null>(null);
  const [manage, setManage] = useState(false);
  useEffect(() => {
    const c = new AbortController();
    loadContent(c.signal)
      .then(setContent)
      .catch((e) => {
        if (e.name !== "AbortError") setError(true);
      });
    return () => c.abort();
  }, [retry]);
  useEffect(() => {
    if (!content) return;
    document.title = content.studio.seo_title;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", content.studio.seo_description);
    let r = document.querySelector('meta[name="robots"]');
    if (!r) {
      r = document.createElement("meta");
      r.setAttribute("name", "robots");
      document.head.append(r);
    }
    r.setAttribute(
      "content",
      content.studio.indexable ? "index,follow" : "noindex,nofollow",
    );
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            observer.unobserve(e.target);
          }
        }),
      { threshold: 0.08 },
    );
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [content]);
  const openBooking = (audience: "women" | "men" = "women") => {
    if (!content) return;
    const service = content.services.find((v) => v.audience === audience);
    if (!service) return;
    setBooking({
      service: service.id,
      options:
        audience === "women"
          ? ["shape", "length", "color", "coating"]
              .map((k) => content.options.find((o) => o.kind === k)?.id)
              .filter((v): v is number => v !== undefined)
          : [],
    });
  };
  const closeMenu = () => setMenu(false);
  return (
    <>
      <a href="#main" className={s.skip}>
        Перейти к содержанию
      </a>
      <header className={s.header}>
        <div className={"container " + s.headerInner}>
          <a className={s.logo} href="#" aria-label="Тихая форма — главная">
            тихая форма<span>СТУДИЯ МАНИКЮРА</span>
          </a>
          <nav
            className={`${s.nav} ${menu ? s.open : ""}`}
            aria-label="Основная навигация"
          >
            <a href="#services" onClick={closeMenu}>
              Услуги
            </a>
            <a href="#inspiration" onClick={closeMenu}>
              Вдохновение
            </a>
            <a href="#master" onClick={closeMenu}>
              О мастере
            </a>
            <a href="#contacts" onClick={closeMenu}>
              Контакты
            </a>
            <button
              onClick={() => {
                closeMenu();
                setManage(true);
              }}
            >
              Моя запись
            </button>
          </nav>
          <button
            className={"button " + s.headerCta}
            onClick={() => openBooking()}
          >
            Выбрать время
          </button>
          <button
            className={s.menuButton}
            onClick={() => setMenu(!menu)}
            aria-label={menu ? "Закрыть меню" : "Открыть меню"}
            aria-expanded={menu}
          >
            {menu ? "Закрыть" : "Меню"}
          </button>
        </div>
      </header>
      {error && !content ? (
        <main className={"container " + s.loadError}>
          <h1 className="sectionTitle">
            Немного тишины.
            <br />
            Мы скоро вернёмся.
          </h1>
          <p>Не удалось загрузить студию. Проверьте, что Django запущен.</p>
          <button
            className="button"
            onClick={() => {
              setError(false);
              setRetry((v) => v + 1);
            }}
          >
            Попробовать снова
          </button>
        </main>
      ) : !content ? (
        <main
          className={"container " + s.loading}
          aria-label="Загружаем студию"
          aria-busy="true"
        >
          <div>
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
          <div className="skeleton" />
        </main>
      ) : (
        <main id="main">
          <section className={"container " + s.hero}>
            <div className={s.heroCopy}>
              <h1>
                {content.studio.hero_title.split(" ").slice(0, 2).join(" ")}
                <br />
                <span className="script">
                  {content.studio.hero_title.split(" ").slice(2).join(" ")}
                </span>
              </h1>
              <p>{content.studio.hero_text}</p>
              <div className={s.heroActions}>
                <button className="button" onClick={() => openBooking()}>
                  Записаться на маникюр
                </button>
                <a href="#atelier">Подобрать свой образ</a>
              </div>
              <div className={s.heroNote}>
                <span className={s.smallLine} />
                <p>
                  Без спешки. Без лишнего.
                  <br />С вниманием к тебе.
                </p>
              </div>
            </div>
            <div className={s.heroVisual}>
              <div className={s.heroImage}>
                <img
                  src="/images/hero.webp"
                  alt="Нежный маникюр в молочном оттенке на ухоженных руках"
                  width="1000"
                  height="1250"
                  fetchPriority="high"
                />
                <span className={s.imageCaption}>
                  маленький ритуал заботы о себе
                </span>
              </div>
              <div className={s.heroStamp}>
                <span>твоя форма</span>
                <span className="script">твоё настроение</span>
              </div>
              <div className={s.verticalNote}>
                NATURAL NAILS. PERSONAL TOUCH.
              </div>
            </div>
          </section>
          <div className={s.promise}>
            <div className={"container " + s.promiseInner}>
              <span>Всё начинается с заботы</span>
              <p>
                <ShieldCheck size={19} strokeWidth={1.3} />
                Внимание к гигиене
              </p>
              <p>
                <Clock3 size={19} strokeWidth={1.3} />
                Время только для тебя
              </p>
              <p>
                <Check size={19} strokeWidth={1.3} />
                Стоимость до записи
              </p>
            </div>
          </div>
          <section id="services" className={"container reveal " + s.services}>
            <div className={s.sectionHeading}>
              <h2 className="sectionTitle">
                Красиво.
                <br />
                <span className="script">По-твоему.</span>
              </h2>
              <p>
                От чистого маникюра до любимого оттенка.
                <br />
                Выбери, что хочется сегодня.
              </p>
            </div>
            <div className={s.serviceList}>
              {content.services
                .filter((v) => v.audience === "women")
                .map((v) => (
                  <article className={s.service} key={v.id}>
                    <div>
                      <h3>{v.name}</h3>
                      <p>{v.description}</p>
                    </div>
                    <div className={s.servicePrice}>
                      <strong>{money(v.price)}</strong>
                      <span>{v.duration} минут</span>
                    </div>
                    <button
                      className="textButton"
                      onClick={() =>
                        setBooking({
                          service: v.id,
                          options: ["shape", "length", "color", "coating"].map(
                            (k) =>
                              content.options.find((o) => o.kind === k)!.id,
                          ),
                        })
                      }
                    >
                      Выбрать
                    </button>
                  </article>
                ))}
            </div>
            <p className={s.priceNote}>
              Доплата за среднюю длину — 200 ₽, за длинную — 400 ₽. Итоговая
              стоимость видна перед записью.
            </p>
          </section>
          <Designer content={content} onBook={setBooking} />
          <section
            id="inspiration"
            className={"container reveal " + s.inspiration}
          >
            <div className={s.sectionHeading}>
              <h2 className="sectionTitle">
                Чуть-чуть
                <br />
                <span className="script">вдохновения</span>
              </h2>
              <div>
                <p>
                  Настроение в деталях.
                  <br />
                  Сохрани идею или придумай свою.
                </p>
                <span className={s.stockNote}>
                  Фотографии для вдохновения, не работы мастера.
                </span>
              </div>
            </div>
            <div className={s.gallery}>
              {content.gallery.map((g, i) => (
                <article key={g.id} className={i === 1 ? s.lower : ""}>
                  <div className={s.galleryImage}>
                    <img
                      src={g.image}
                      loading="lazy"
                      alt={g.title}
                      width="700"
                      height="850"
                      onError={(e) => {
                        e.currentTarget.src = "/images/hero.webp";
                      }}
                    />
                    <button
                      aria-label={"Подобрать маникюр: " + g.title}
                      onClick={() =>
                        document
                          .getElementById("atelier")
                          ?.scrollIntoView({ behavior: "smooth" })
                      }
                    >
                      Подобрать похожий
                    </button>
                  </div>
                  <h3>{g.title}</h3>
                  <p>{g.caption}</p>
                </article>
              ))}
            </div>
          </section>
          <section className={s.men}>
            <div className={"container " + s.menInner}>
              <div className={s.menGraphic} aria-hidden="true">
                <svg viewBox="0 0 360 300" fill="none">
                  <path
                    d="M80 278V125c0-24 30-25 30 0v68-111c0-25 30-25 30 0v104-130c0-27 31-27 31 0v130-105c0-25 31-25 31 0v126l28-39c21-25 45-4 28 21l-44 71-7 18"
                    stroke="currentColor"
                    strokeWidth="1.3"
                  />
                  <path
                    d="M87 130v-12c0-12 16-12 16 0v12H87Zm30-44v-12c0-12 16-12 16 0v12h-16Zm31-27V47c0-12 16-12 16 0v12h-16Zm31 27V74c0-12 16-12 16 0v12h-16Z"
                    fill="currentColor"
                  />
                  <circle
                    cx="160"
                    cy="140"
                    r="128"
                    stroke="currentColor"
                    strokeOpacity=".15"
                  />
                </svg>
                <span>ЧИСТАЯ РАБОТА.</span>
              </div>
              <div>
                <h2>
                  Мужской маникюр.
                  <br />
                  Без лишних слов.
                </h2>
                <p>
                  Аккуратная длина, чистая обработка и естественный вид. Просто
                  часть заботы о себе.
                </p>
                {content.services
                  .filter((v) => v.audience === "men")
                  .map((v) => (
                    <div className={s.menBooking} key={v.id}>
                      <button
                        className="button"
                        onClick={() => openBooking("men")}
                      >
                        Выбрать время
                      </button>
                      <span>
                        {money(v.price)} <small>/ {v.duration} минут</small>
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </section>
          <section id="master" className={"container reveal " + s.master}>
            <div className={s.masterVisual}>
              <img
                src="/images/detail.webp"
                loading="lazy"
                alt="Детали аккуратного маникюра — иллюстрация подхода студии"
                width="700"
                height="900"
              />
              <span className="script">
                Внимание —<br />в каждом касании.
              </span>
            </div>
            <div className={s.masterCopy}>
              <h2 className="sectionTitle">
                Приятно
                <br />
                <span className="script">познакомиться.</span>
              </h2>
              <p className={s.masterIntro}>
                Я {content.studio.master}, твой мастер.
              </p>
              <p>{content.studio.master_text}</p>
              <div className={s.masterDetails}>
                <p>
                  <span>Личное пространство</span>Один мастер и один гость.
                  Можно поговорить, а можно просто побыть в тишине.
                </p>
                <p>
                  <span>Внимание к процессу</span>Форма и покрытие подбираются
                  вместе с тобой — под привычки, настроение и ритм жизни.
                </p>
              </div>
              <small>
                Алина — вымышленный образ мастера для этой демонстрации.
              </small>
            </div>
          </section>
          <section className={"container reveal " + s.faq}>
            <h2 className="sectionTitle">Перед встречей</h2>
            <div>
              {[
                [
                  "Как проходит запись?",
                  "Выберите услугу и пожелания, затем дату и свободное время. Стоимость и длительность будут видны заранее. После подтверждения вы получите код управления записью.",
                ],
                [
                  "Можно ли принести свою идею?",
                  "Конечно. При записи можно выбрать до трёх фотографий референсов. В этой демонстрации они видны только вам в браузере и не загружаются на сервер.",
                ],
                [
                  "Как перенести или отменить запись?",
                  "Откройте «Моя запись» и введите сохранённый код. Отменить можно самостоятельно, а перенести — через администратора. В демоверсии можно отменить и выбрать новое время.",
                ],
                [
                  "Это настоящая студия?",
                  "Нет. Это демонстрация сайта, созданная Триад Студио. Название, мастер, адрес и цены вымышлены. Реальных встреч и уведомлений не будет.",
                ],
              ].map(([q, a]) => (
                <details key={q}>
                  <summary>
                    {q}
                    <span>Подробнее</span>
                  </summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </section>
          <section id="contacts" className={s.contacts}>
            <div className={"container " + s.contactsInner}>
              <div>
                <h2 className="sectionTitle">
                  Твоё место
                  <br />
                  <span className="script">для паузы.</span>
                </h2>
                <p className={s.address}>
                  <MapPin size={19} strokeWidth={1.5} />
                  {content.studio.address}
                </p>
                <p className={s.contactNote}>{content.studio.address_note}</p>
                <button className="button" onClick={() => openBooking()}>
                  Найти время для себя
                </button>
                <p className={s.contactNote}>
                  Доступные дни и часы — в календаре записи.
                </p>
              </div>
              <div
                className={s.map}
                role="img"
                aria-label="Локальная иллюстративная схема адреса, не настоящая карта"
              >
                <svg viewBox="0 0 600 380" aria-hidden="true">
                  <rect width="600" height="380" fill="#e7e3d8" />
                  <path
                    d="M-20 70L620 320M-20 310L620 80M160-10L285 400M430-10L365 400"
                    stroke="#f9f6f0"
                    strokeWidth="26"
                  />
                  <path
                    d="M-20 70L620 320M-20 310L620 80"
                    stroke="#d5cec0"
                    strokeWidth="1"
                  />
                  <path
                    d="M40 145l84-32 38 75-88 35Z M440 230l87-24 26 78-90 20Z"
                    fill="#cad1bb"
                  />
                  <path
                    d="M300 146c-18 0-31 13-31 30 0 24 31 50 31 50s31-26 31-50c0-17-13-30-31-30Z"
                    fill="#722f40"
                  />
                  <circle cx="300" cy="175" r="8" fill="#f4f0e9" />
                  <text x="330" y="152" fontSize="14" fill="#666058">
                    Большая Никитская
                  </text>
                </svg>
                <span className={s.mapTag}>тихая форма</span>
                <p>Локальная схема · интеграция Яндекс Карт подготовлена</p>
              </div>
            </div>
          </section>
        </main>
      )}
      <footer className={s.footer}>
        <div className="container">
          <div className={s.footerTop}>
            <a className={s.logo} href="#">
              тихая форма<span>КРАСОТА В ДЕТАЛЯХ</span>
            </a>
            <p>
              Немного времени.
              <br />
              Много заботы о себе.
            </p>
            <button className="textButton" onClick={() => setManage(true)}>
              Моя запись
            </button>
            <a href="/admin/">Вход для администратора</a>
          </div>
          <div className={s.disclaimer}>
            <p>
              Демонстрационная версия, а не реальный коммерческий продукт. Сайт
              не собирает и не хранит реальные персональные данные: введённые
              контакты заменяются вымышленными до отправки, фотографии остаются
              в браузере. Внешняя аналитика и карты не загружаются.
            </p>
            <p>
              Для приобретения такого сайта обратитесь в{" "}
              <a
                href="https://nemida-studio.com/ru/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Триад Студио
              </a>
              .
            </p>
          </div>
          <div className={s.footerBottom}>
            <span>
              © {new Date().getFullYear()} Тихая форма · демонстрация
            </span>
            <a
              href="https://nemida-studio.com/ru/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Разраработано Триад Студио
            </a>
          </div>
        </div>
      </footer>
      {(booking || manage) && content && (
        <Suspense
          fallback={
            <div className={s.dialogLoading} role="status">
              Подготавливаем запись…
            </div>
          }
        >
          <BookingDialog
            content={content}
            selection={booking}
            manage={manage}
            onClose={() => {
              setBooking(null);
              setManage(false);
            }}
          />
        </Suspense>
      )}
    </>
  );
}
