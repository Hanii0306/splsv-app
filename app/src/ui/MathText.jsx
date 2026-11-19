// Keeps an equation run (e.g. "x + 9 = 17") on one line so text and maths stay readable together (EL02).
const EQ_RUN = /[^\s]+(?:\s[=+−×:<>≤≥-]\s[^\s]+)+/g;
export default function MathText({ text }) {
  const out = [];
  let last = 0;
  for (const m of String(text).matchAll(EQ_RUN)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(<span key={m.index} className="nowrap">{m[0]}</span>);
    last = m.index + m[0].length;
  }
  out.push(text.slice(last));
  return <>{out}</>;
}
