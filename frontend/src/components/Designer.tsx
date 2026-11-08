import { useState } from "react";
import type { Content, Kind, Selection } from "../types";
import { money } from "../api";
import s from "./Designer.module.scss";

export function NailPreview({
  shape = "square",
  length = "short",
  color = "#E8D7CB",
  bare = false,
}: {
  shape?: string;
  length?: string;
  color?: string;
  bare?: boolean;
}) {
  const fill = bare ? "#d7b3a8" : color;
  const height = length === "long" ? 102 : length === "medium" ? 85 : 67;
  const nailPath =
    shape === "almond"
      ? `M-25 40 C-27 10 -23 ${-height + 20} 0 ${-height} C23 ${-height + 20} 27 10 25 40 Q25 67 0 67 Q-25 67 -25 40Z`
      : shape === "oval"
        ? `M-25 40 V${-height + 30} Q-25 ${-height} 0 ${-height} Q25 ${-height} 25 ${-height + 30} V40 Q25 67 0 67 Q-25 67-25 40Z`
        : `M-26 40 V${-height + 8} Q-26 ${-height} -18 ${-height} H18 Q26 ${-height} 26 ${-height + 8} V40 Q26 67 0 67 Q-26 67-26 40Z`;
  return (
    <svg
      viewBox="0 0 400 330"
      role="img"
      aria-label="Стилизованная примерка выбранной формы, длины и цвета ногтей"
      className={s.previewSvg}
    >
      <ellipse
        cx="202"
        cy="292"
        rx="140"
        ry="13"
        fill="#c9b7ac"
        opacity=".23"
      />
      {[
        { x: 92, y: 182, r: -15 },
        { x: 201, y: 162, r: 0 },
        { x: 307, y: 182, r: 15 },
      ].map(({ x, y, r }, i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
          <path d="M-40 150V10C-40-55 40-55 40 10v140" fill="#d5b29e" />
          <path d="M-33 150V16C-33-39 33-39 33 16v134" fill="#dfbdac" />
          <g transform="translate(0 -3)">
            <path
              d={nailPath}
              fill={fill}
              stroke="#a67c701f"
              strokeWidth="1.5"
            />
            <path
              d={`M-12 27 V${-height + 23}`}
              stroke="white"
              opacity=".4"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M-16 46Q0 57 16 46"
              fill="none"
              stroke="#fff"
              opacity=".2"
              strokeWidth="2"
            />
          </g>
        </g>
      ))}
    </svg>
  );
}

export default function Designer({
  content,
  onBook,
}: {
  content: Content;
  onBook: (v: Selection) => void;
}) {
  const [chosen, setChosen] = useState<Record<Kind, number>>(
    () =>
      Object.fromEntries(
        ["shape", "length", "color", "coating"].map((k) => [
          k,
          content.options.find((o) => o.kind === k)?.id,
        ]),
      ) as Record<Kind, number>,
  );
  const service = content.services.find((v) => v.audience === "women");
  const selected = content.options.filter((o) =>
    Object.values(chosen).includes(o.id),
  );
  const value = (kind: Kind) => selected.find((o) => o.kind === kind)?.value;
  const price =
    (service?.price || 0) + selected.reduce((n, o) => n + o.extra_price, 0);
  const duration =
    (service?.duration || 0) +
    selected.reduce((n, o) => n + o.extra_minutes, 0);
  const groups: [Kind, string][] = [
    ["shape", "Форма"],
    ["length", "Длина"],
    ["color", "Цвет"],
    ["coating", "Покрытие"],
  ];
  return (
    <section id="atelier" className={s.atelier}>
      <div className={"container " + s.inner}>
        <div className={s.visual}>
          <div className={s.visualHeading}>
            <h2 className="sectionTitle">
              Найди свою
              <br />
              <span className="script">тихую форму</span>
            </h2>
            <p>Попробуй оттенок. Почувствуй настроение.</p>
          </div>
          <div className={s.nails}>
            <NailPreview
              shape={value("shape")}
              length={value("length")}
              color={value("color")}
              bare={value("coating") === "bare"}
            />
          </div>
          <div className={s.swatchCaption}>
            <span>{selected.find((o) => o.kind === "color")?.name}</span>
            <span>Твой маленький акцент</span>
          </div>
          <p className={s.disclaimer}>
            Стилизованная примерка. Цвет на экране может отличаться от покрытия.
          </p>
        </div>
        <div className={s.controls}>
          <p className={s.controlsIntro}>Твой маникюр начинается здесь</p>
          {groups.map(([kind, label]) => (
            <fieldset key={kind}>
              <legend>
                {label}
                {kind === "color" && (
                  <span>{selected.find((o) => o.kind === "color")?.name}</span>
                )}
              </legend>
              <div className={kind === "color" ? s.colors : s.choices}>
                {content.options
                  .filter((o) => o.kind === kind)
                  .map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      aria-pressed={chosen[kind] === o.id}
                      aria-label={o.name}
                      title={
                        o.name + (o.extra_price ? ` +${o.extra_price} ₽` : "")
                      }
                      className={`${chosen[kind] === o.id ? s.selected : ""} ${kind === "color" ? s.color : ""}`}
                      style={
                        kind === "color"
                          ? ({ "--swatch": o.value } as React.CSSProperties)
                          : undefined
                      }
                      onClick={() => setChosen((v) => ({ ...v, [kind]: o.id }))}
                    >
                      {kind === "color" ? (
                        <span />
                      ) : (
                        <>
                          {o.name}
                          {o.extra_price > 0 && (
                            <small>+{o.extra_price} ₽</small>
                          )}
                        </>
                      )}
                    </button>
                  ))}
              </div>
            </fieldset>
          ))}
          <div className={s.total}>
            <div>
              <span>Твой маникюр</span>
              <strong>
                {money(price)}
                <small>{duration} минут</small>
              </strong>
            </div>
            <button
              className="button"
              disabled={!service || selected.length !== 4}
              onClick={() =>
                service &&
                onBook({ service: service.id, options: Object.values(chosen) })
              }
            >
              Выбрать дату и время
            </button>
          </div>
          <p className={s.footnote}>
            Фото своей идеи можно добавить на следующем шаге.
          </p>
        </div>
      </div>
    </section>
  );
}
