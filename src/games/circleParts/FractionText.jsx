// Renders a numerator/denominator pair as a proper stacked fraction (a bar
// between them) instead of a plain "n/d" slash string.
export function FractionText({ numerator, denominator }) {
  return (
    <span className="frac-text">
      <span className="frac-num">{numerator}</span>
      <span className="frac-den">{denominator}</span>
    </span>
  )
}

// A circle fact's percent equivalent is a mixed number (e.g. 66 + 2/3%) -
// this renders the whole part as plain text and, when there is one, the
// fractional remainder as a proper stacked fraction before the "%" sign.
export function PercentText({ percent }) {
  return (
    <>
      {percent.whole}
      {percent.fracNumerator != null && (
        <>
          {' '}
          <FractionText numerator={percent.fracNumerator} denominator={percent.fracDenominator} />
        </>
      )}
      %
    </>
  )
}
