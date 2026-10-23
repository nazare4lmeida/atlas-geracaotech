// Gráficos simples em SVG, sem biblioteca. Cores vêm do tema (variáveis CSS), então funcionam no claro e no escuro.

const PALETTE = ['var(--primary)', 'var(--highlight)', 'var(--success)', 'var(--danger)', 'var(--text-soft)'];

export function ChartEmpty({ text = 'Sem dados para mostrar ainda.' }) {
  return <p className="chart-empty">{text}</p>;
}

// Colunas verticais. max define a escala (ex.: 100 para percentuais).
export function ColumnChart({ data = [], max, suffix = '', ariaLabel }) {
  if (!data.length) return <ChartEmpty />;
  const top = max ?? Math.max(1, ...data.map((d) => d.value));
  const W = 640;
  const H = 240;
  const padX = 12;
  const padTop = 22;
  const padBottom = 34;
  const slot = (W - padX * 2) / data.length;
  const barW = Math.min(44, slot * 0.6);
  return (
    <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} preserveAspectRatio="xMidYMid meet">
      <line x1={padX} x2={W - padX} y1={H - padBottom} y2={H - padBottom} className="chart-axis" />
      {data.map((d, i) => {
        const h = ((H - padTop - padBottom) * d.value) / top;
        const x = padX + i * slot + (slot - barW) / 2;
        const y = H - padBottom - h;
        return (
          <g key={`${d.label}-${i}`}>
            <rect x={x} y={y} width={barW} height={Math.max(h, 1)} rx="6" fill="var(--primary)" opacity={d.value ? 1 : 0.25}>
              <title>{`${d.label}: ${d.value}${suffix}`}</title>
            </rect>
            <text x={x + barW / 2} y={y - 6} textAnchor="middle" className="chart-value">
              {d.value}{suffix}
            </text>
            <text x={x + barW / 2} y={H - 12} textAnchor="middle" className="chart-label">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// Barras horizontais: bom para rankings (ex.: matrículas por curso).
export function BarList({ data = [] }) {
  if (!data.length) return <ChartEmpty />;
  const top = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="bar-list">
      {data.map((d) => (
        <li key={d.label}>
          <div className="bar-list-top">
            <span>{d.label}</span>
            <strong>{d.value}</strong>
          </div>
          <div className="bar-list-track">
            <span style={{ width: `${(d.value / top) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

// Rosca com legenda: partes de um total (ex.: situação das matrículas).
export function DonutChart({ data = [], labels = {}, ariaLabel }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (!total) return <ChartEmpty />;
  const R = 62;
  const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="donut">
      <svg viewBox="0 0 160 160" className="donut-svg" role="img" aria-label={ariaLabel}>
        <circle cx="80" cy="80" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="22" />
        {data.map((d, i) => {
          const len = (d.value / total) * C;
          const el = (
            <circle
              key={d.label}
              cx="80"
              cy="80"
              r={R}
              fill="none"
              stroke={PALETTE[i % PALETTE.length]}
              strokeWidth="22"
              strokeDasharray={`${len} ${C - len}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 80 80)"
            >
              <title>{`${labels[d.label] || d.label}: ${d.value}`}</title>
            </circle>
          );
          offset += len;
          return el;
        })}
        <text x="80" y="78" textAnchor="middle" className="donut-total">{total}</text>
        <text x="80" y="96" textAnchor="middle" className="donut-caption">total</text>
      </svg>
      <ul className="donut-legend">
        {data.map((d, i) => (
          <li key={d.label}>
            <span className="donut-dot" style={{ background: PALETTE[i % PALETTE.length] }} />
            <span>{labels[d.label] || d.label}</span>
            <strong>{d.value}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
