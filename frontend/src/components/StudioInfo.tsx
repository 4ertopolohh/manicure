import { MapPin } from "lucide-react";
import type { Content } from "../types";
import Photo from "./Photo";
import s from "../App.module.scss";
export default function StudioInfo({
  content,
  openBooking,
}: {
  content: Content;
  openBooking: () => void;
}) {
  return (
    <>
      {" "}
      <section id="master" className={"container " + s.master}>
        <div className={"reveal motion-image " + s.masterVisual}>
          <Photo
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
        <div className={"reveal motion-right motion-stagger " + s.masterCopy}>
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
              <span>Личное пространство</span>Один мастер и один гость. Можно
              поговорить, а можно просто побыть в тишине.
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
      <section className={"container reveal motion-stagger " + s.faq}>
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
          ].map(([q, a], i) => (
            <details key={q} className="reveal motion-row" style={{ "--motion-delay": `${i * 75}ms` } as React.CSSProperties}>
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
        <div className={"container reveal motion-stagger " + s.contactsInner}>
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
            <span className={s.mapTag}><img src="/images/project-logo-03-2048.png" alt={content.studio.name} /></span>
            <p>Локальная схема · интеграция Яндекс Карт подготовлена</p>
          </div>
        </div>
      </section>
    </>
  );
}
