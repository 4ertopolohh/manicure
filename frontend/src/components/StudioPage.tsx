import { Check, Clock3, ShieldCheck } from "lucide-react";
import { money } from "../api";
import type { Content, Selection } from "../types";
import Designer from "./Designer";
import Photo from "./Photo";
import StudioInfo from "./StudioInfo";
import s from "../App.module.scss";
export default function StudioPage({
  content,
  openBooking,
  setBooking,
}: {
  content: Content;
  openBooking: (audience?: "women" | "men") => void;
  setBooking: (s: Selection) => void;
}) {
  return (
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
            <button
              className="button"
              disabled={!content.services.length}
              onClick={() => openBooking()}
            >
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
            <Photo
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
                        (k) => content.options.find((o) => o.kind === k)!.id,
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
      <section id="inspiration" className={"container reveal " + s.inspiration}>
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
                <Photo
                  src={g.image}
                  loading="lazy"
                  alt={g.title}
                  width="700"
                  height="850"
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
                  <button className="button" onClick={() => openBooking("men")}>
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
      <StudioInfo content={content} openBooking={openBooking} />{" "}
    </main>
  );
}
