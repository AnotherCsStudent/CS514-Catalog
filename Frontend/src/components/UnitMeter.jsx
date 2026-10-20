export default function UnitMeter({ units, limit }) {
  const over = units > limit;
  const percent = Math.min(100, (units / limit) * 100);

  return (
    <div className={`unit-meter ${over ? "over" : ""}`}>
      <div className="unit-meter-label">
        <span>
          <strong>{units}</strong> / {limit} units
        </span>
        {over && <span className="warning-text">Over your limit</span>}
      </div>
      <div
        className="unit-meter-track"
        role="meter"
        aria-label="Units planned"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={units}
      >
        <div className="unit-meter-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
