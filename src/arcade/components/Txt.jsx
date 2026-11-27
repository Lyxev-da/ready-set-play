/**
 * Sentence text with its numbers set in the display font. The body pixel font
 * draws "5" almost exactly like "S", so every figure gets the clearer numerals.
 */
export function Txt({ children }) {
    const parts = children.split(/((?:[×+])?\d[\d,.]*(?:[%KMB])?)/g);
    return (<>
      {parts.map((p, i) => i % 2 ? (<span key={i} className="num">
            {p}
          </span>) : (p))}
    </>);
}
