import { useRef, useState } from "react";
import type { ImgHTMLAttributes } from "react";
import s from "./Photo.module.scss";

export default function Photo(props: ImgHTMLAttributes<HTMLImageElement>) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const image = useRef<HTMLImageElement>(null);
  return (
    <div className={s.frame}>
      {!loaded && !failed && (
        <span className={"skeleton " + s.placeholder} aria-hidden="true" />
      )}
      {failed ? (
        <div className={s.fallback}>Изображение временно недоступно</div>
      ) : (
        <img
          {...props}
          ref={image}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setFailed(true);
            setLoaded(true);
          }}
        />
      )}
    </div>
  );
}
