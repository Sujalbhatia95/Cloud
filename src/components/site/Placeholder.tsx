/** Renders unverified / missing details so they are unmistakable on the page. */
export function Placeholder({ text, dark = false }: { text: string; dark?: boolean }) {
  return (
    <span
      className={dark ? "rounded-sm bg-amber-300/15 px-1 font-semibold text-amber-200" : "placeholder-text"}
      title="This information has not been provided or verified yet"
    >
      {text}
    </span>
  );
}

/** Splits text containing "[DEMO ONLY — …]" tokens and highlights them. */
export function WithPlaceholders({ text }: { text: string }) {
  const parts = text.split(/(\[DEMO ONLY[^\]]*\])/g);
  return (
    <>
      {parts.map((p, i) => (p.startsWith("[DEMO ONLY") ? <Placeholder key={i} text={p} /> : <span key={i}>{p}</span>))}
    </>
  );
}
