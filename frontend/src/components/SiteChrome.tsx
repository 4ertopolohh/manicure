import { useState } from "react";
import s from "../App.module.scss";
export function Header({
  openBooking,
  onManage,
  name = "Тихая форма",
  bookable = true,
}: {
  openBooking: () => void;
  onManage: () => void;
  name?: string;
  bookable?: boolean;
}) {
  const [menu, setMenu] = useState(false);
  const closeMenu = () => setMenu(false);
  return (
    <header className={s.header}>
      <div className={"container " + s.headerInner}>
        <a className={s.logo} href="#" aria-label={name + " — главная"}>
          {name.toLocaleLowerCase("ru")}
          <span>СТУДИЯ МАНИКЮРА</span>
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
              onManage();
            }}
          >
            Моя запись
          </button>
        </nav>
        <button
          className={"button " + s.headerCta}
          onClick={() => openBooking()}
          disabled={!bookable}
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
  );
}
export function Footer({
  onManage,
  name = "Тихая форма",
}: {
  onManage: () => void;
  name?: string;
}) {
  return (
    <footer className={s.footer}>
      <div className="container">
        <div className={s.footerTop}>
          <a className={s.logo} href="#">
            {name.toLocaleLowerCase("ru")}
            <span>КРАСОТА В ДЕТАЛЯХ</span>
          </a>
          <p>
            Немного времени.
            <br />
            Много заботы о себе.
          </p>
          <button className="textButton" onClick={() => onManage()}>
            Моя запись
          </button>
          <a href="/admin/">Вход для администратора</a>
        </div>
        <div className={s.disclaimer}>
          <p>
            Демонстрационная версия, а не реальный коммерческий продукт. Сайт не
            собирает и не хранит реальные персональные данные: введённые
            контакты заменяются вымышленными до отправки, фотографии остаются в
            браузере. Внешняя аналитика и карты не загружаются.
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
            © {new Date().getFullYear()} {name} · демонстрация
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
  );
}
