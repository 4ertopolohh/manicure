import s from "./NailShapeChoice.module.scss";

const outlines: Record<string, string> = {
  square: "M17 39V9Q17 6 20 6H44Q47 6 47 9V39C47 59 17 59 17 39Z",
  oval: "M17 39V22C17 0 47 0 47 22V39C47 59 17 59 17 39Z",
  almond: "M17 39C16 24 23 10 32 4C41 10 48 24 47 39C47 59 17 59 17 39Z",
};

export default function NailShapeChoice({
  value,
  name,
  selected,
  onSelect,
}: {
  value: string;
  name: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={s.choice}
      aria-label={name}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false">
        <path d={outlines[value] || outlines.square} className={s.nail} />
        <path d="M23 43Q32 49 41 43" className={s.cuticle} />
      </svg>
      <span className={s.tooltip} aria-hidden="true">
        {name}
      </span>
    </button>
  );
}
