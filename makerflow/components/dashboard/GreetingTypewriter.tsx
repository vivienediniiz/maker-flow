"use client";

import { useEffect, useState } from "react";

const TYPE_MS = 55;

export function GreetingTypewriter({ name }: { name: string }) {
  const [typed, setTyped] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setTyped("");
    setDone(false);

    function typeChar(charIdx: number) {
      if (cancelled) return;
      setTyped(name.slice(0, charIdx));
      if (charIdx < name.length) {
        setTimeout(() => typeChar(charIdx + 1), TYPE_MS);
      } else {
        setDone(true);
      }
    }

    typeChar(0);
    return () => {
      cancelled = true;
    };
  }, [name]);

  return (
    <>
      {typed}
      {!done && <span className="animate-caret-blink ml-0.5 inline-block h-[1em] w-[2px] translate-y-0.5 bg-neon-pink align-middle" />}
    </>
  );
}
