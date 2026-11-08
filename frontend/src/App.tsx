import { lazy, Suspense, useEffect, useState } from "react";
import { loadContent } from "./api";
import type { Content, Selection } from "./types";
import StudioPage from "./components/StudioPage";
import { Header, Footer } from "./components/SiteChrome";
import s from "./App.module.scss";
const BookingDialog = lazy(() => import("./components/BookingDialog"));

export default function App() {
  const [content, setContent] = useState<Content | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
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
    const service =
      content.services.find((v) => v.audience === audience) ||
      content.services[0];
    if (!service) return;
    setBooking({
      service: service.id,
      options:
        service.audience === "women"
          ? ["shape", "length", "color", "coating"]
              .map((k) => content.options.find((o) => o.kind === k)?.id)
              .filter((v): v is number => v !== undefined)
          : [],
    });
  };
  return (
    <>
      <a href="#main" className={s.skip}>
        Перейти к содержанию
      </a>
      <Header
        name={content?.studio.name}
        bookable={!!content?.services.length}
        openBooking={() => openBooking()}
        onManage={() => setManage(true)}
      />
      {error && !content ? (
        <main id="main" className={"container " + s.loadError}>
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
          id="main"
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
        <StudioPage
          content={content}
          openBooking={openBooking}
          setBooking={setBooking}
        />
      )}
      <Footer name={content?.studio.name} onManage={() => setManage(true)} />
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
