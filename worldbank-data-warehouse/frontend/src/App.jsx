import { useEffect, useMemo, useState } from "react";
import { api } from "./api.js";

const NAV = [
  { id: "overview", label: "Overview" },
  { id: "import", label: "Import" },
  { id: "jobs", label: "Jobs" },
  { id: "compare", label: "Compare" },
  { id: "trends", label: "Trends" },
  { id: "rankings", label: "Rankings" },
  { id: "export", label: "Export" },
];

const STARTER_COUNTRIES = ["US", "CN", "IN", "DE", "BR", "NG", "JP", "GB", "KE", "ID"];

export default function App() {
  const [page, setPage] = useState("overview");
  const [stats, setStats] = useState(null);
  const [countries, setCountries] = useState([]);
  const [localCountries, setLocalCountries] = useState([]);
  const [indicators, setIndicators] = useState([]);
  const [defaults, setDefaults] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState("");

  async function refresh() {
    try {
      const [s, c, lc, ind, d, j] = await Promise.all([
        api.stats(),
        api.countries(),
        api.countries("local"),
        api.localIndicators(),
        api.defaults(),
        api.jobs(),
      ]);
      setStats(s);
      setCountries(c.countries || []);
      setLocalCountries(lc.countries || []);
      setIndicators(ind.indicators || []);
      setDefaults(d.indicators || []);
      setJobs(j.jobs || []);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="shell">
      <aside>
        <p className="kicker">Project 5</p>
        <h1>Development Warehouse</h1>
        <p className="lede">World Bank indicators, stored locally, queried from your database.</p>
        <nav>
          {NAV.map((item) => (
            <button key={item.id} className={page === item.id ? "active" : ""} onClick={() => setPage(item.id)}>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="aside-meta">
          <span>{stats?.facts ?? 0} fact rows</span>
          <span>{stats?.countries ?? 0} countries cached</span>
        </div>
      </aside>
      <main>
        {error && <div className="banner">{error}</div>}
        {page === "overview" && <Overview stats={stats} jobs={jobs} />}
        {page === "import" && (
          <ImportPage
            countries={countries}
            defaults={defaults}
            onStarted={() => {
              setPage("jobs");
              refresh();
            }}
          />
        )}
        {page === "jobs" && <JobsPage jobs={jobs} onChange={refresh} />}
        {page === "compare" && (
          <ComparePage countries={localCountries} indicators={indicators} />
        )}
        {page === "trends" && <TrendsPage countries={localCountries} indicators={indicators} />}
        {page === "rankings" && <RankingsPage indicators={indicators} />}
        {page === "export" && <ExportPage countries={localCountries} indicators={indicators} />}
      </main>
    </div>
  );
}

function Overview({ stats, jobs }) {
  return (
    <section>
      <header className="page-head">
        <h2>Local warehouse</h2>
        <p>Analytics never hit the World Bank API. Import first, then compare, rank, and export from SQLite.</p>
      </header>
      <div className="stat-grid">
        <Stat label="Countries" value={stats?.countries ?? 0} />
        <Stat label="Indicators" value={stats?.indicators ?? 0} />
        <Stat label="Fact rows" value={stats?.facts ?? 0} />
        <Stat label="Import jobs" value={stats?.jobs ?? 0} />
        <Stat label="Year min" value={stats?.yearMin ?? "—"} />
        <Stat label="Year max" value={stats?.yearMax ?? "—"} />
      </div>
      <h3>Recent jobs</h3>
      <JobTable jobs={jobs.slice(0, 6)} compact />
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <article className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function ImportPage({ countries, defaults, onStarted }) {
  const [selectedCountries, setSelectedCountries] = useState(STARTER_COUNTRIES);
  const [allCountries, setAllCountries] = useState(false);
  const [selectedIndicators, setSelectedIndicators] = useState(["SP.POP.TOTL", "NY.GDP.MKTP.CD"]);
  const [customIndicator, setCustomIndicator] = useState("");
  const [yearStart, setYearStart] = useState(2000);
  const [yearEnd, setYearEnd] = useState(2023);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const regions = useMemo(() => {
    const map = new Map();
    for (const c of countries) {
      const key = c.regionName || "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(c);
    }
    return [...map.entries()];
  }, [countries]);

  function toggleCountry(code) {
    setSelectedCountries((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  }

  function toggleIndicator(code) {
    setSelectedIndicators((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const job = await api.startImport({
        allCountries,
        countryCodes: selectedCountries,
        indicatorCodes: selectedIndicators,
        yearStart: Number(yearStart),
        yearEnd: Number(yearEnd),
      });
      setMessage(`Queued job ${job.job.id}`);
      onStarted();
    } catch (err) {
      setMessage(err.message + (err.details?.jobId ? ` (active job ${err.details.jobId})` : ""));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <header className="page-head">
        <h2>Import configuration</h2>
        <p>Choose countries, indicators, and years. The job fetches World Bank pages with retry/backoff, then upserts into the local warehouse.</p>
      </header>
      <form className="stack" onSubmit={submit}>
        <label className="check">
          <input type="checkbox" checked={allCountries} onChange={(e) => setAllCountries(e.target.checked)} />
          Import all countries (large dataset; still paged, never held in one array)
        </label>
        {!allCountries && (
          <div className="panel">
            <div className="row-between">
              <h3>Countries ({selectedCountries.length})</h3>
              <button type="button" className="ghost" onClick={() => setSelectedCountries(STARTER_COUNTRIES)}>
                Starter 10
              </button>
            </div>
            <div className="country-list">
              {regions.map(([region, list]) => (
                <details key={region} open={region.includes("Europe") || region.includes("Asia") || region.includes("America")}>
                  <summary>{region}</summary>
                  <div className="chips">
                    {list.map((c) => (
                      <label key={c.iso2Code} className={selectedCountries.includes(c.iso2Code) ? "chip on" : "chip"}>
                        <input type="checkbox" checked={selectedCountries.includes(c.iso2Code)} onChange={() => toggleCountry(c.iso2Code)} />
                        {c.iso2Code} {c.name}
                      </label>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </div>
        )}
        <div className="panel">
          <h3>Indicators</h3>
          <div className="chips">
            {defaults.map((ind) => (
              <label key={ind.code} className={selectedIndicators.includes(ind.code) ? "chip on" : "chip"}>
                <input type="checkbox" checked={selectedIndicators.includes(ind.code)} onChange={() => toggleIndicator(ind.code)} />
                {ind.code} — {ind.name}
              </label>
            ))}
          </div>
          <div className="inline">
            <input
              value={customIndicator}
              onChange={(e) => setCustomIndicator(e.target.value)}
              placeholder="Add World Bank code, e.g. SI.POV.DDAY"
            />
            <button
              type="button"
              className="ghost"
              onClick={() => {
                const code = customIndicator.trim();
                if (code && !selectedIndicators.includes(code)) setSelectedIndicators((p) => [...p, code]);
                setCustomIndicator("");
              }}
            >
              Add code
            </button>
          </div>
          <p className="hint">Unknown codes are rejected against the World Bank catalog before a job starts.</p>
        </div>
        <div className="inline">
          <label>
            Start year
            <input type="number" value={yearStart} onChange={(e) => setYearStart(e.target.value)} />
          </label>
          <label>
            End year
            <input type="number" value={yearEnd} onChange={(e) => setYearEnd(e.target.value)} />
          </label>
        </div>
        <button type="submit" disabled={busy}>
          {busy ? "Starting…" : "Queue import"}
        </button>
        {message && <p className="hint">{message}</p>}
      </form>
    </section>
  );
}

function JobsPage({ jobs, onChange }) {
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    if (!selected) return;
    let live = true;
    api.job(selected).then((d) => live && setDetail(d.job));
    const t = setInterval(() => {
      api.job(selected).then((d) => live && setDetail(d.job));
    }, 2500);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [selected]);

  return (
    <section>
      <header className="page-head">
        <h2>Import jobs</h2>
        <p>Each job ends success, partial, failed, or cancelled. Counters explain imported / updated / unchanged / skipped / failed.</p>
      </header>
      <JobTable
        jobs={jobs}
        onSelect={setSelected}
        selected={selected}
        onCancel={async (id) => {
          await api.cancelJob(id);
          onChange();
        }}
      />
      {detail && (
        <div className="panel">
          <h3>Job {detail.id}</h3>
          <p>
            {detail.status} · {detail.yearStart}–{detail.yearEnd} · {detail.indicatorCodes.join(", ")}
          </p>
          <div className="stat-grid compact">
            {Object.entries(detail.counters).map(([k, v]) => (
              <Stat key={k} label={k} value={v} />
            ))}
          </div>
          <p className="hint">
            Pages {detail.pagesFetched}/{detail.pagesExpected ?? "?"}
            {detail.checkpoint ? ` · checkpoint ${detail.checkpoint.indicatorCode} p${detail.checkpoint.page}` : ""}
          </p>
          {detail.errorSummary && <p className="warn">{detail.errorSummary}</p>}
          {detail.errors?.length > 0 && (
            <ul className="errors">
              {detail.errors.map((e) => (
                <li key={e.id}>
                  {e.message}
                  {e.indicatorCode ? ` [${e.indicatorCode}]` : ""}
                  {e.page ? ` page ${e.page}` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function JobTable({ jobs, compact, onSelect, selected, onCancel }) {
  if (!jobs?.length) return <p className="hint">No jobs yet.</p>;
  return (
    <table>
      <thead>
        <tr>
          <th>Status</th>
          <th>Years</th>
          <th>Indicators</th>
          <th>Imported</th>
          <th>Updated</th>
          <th>Skipped</th>
          <th>Failed</th>
          {!compact && <th></th>}
        </tr>
      </thead>
      <tbody>
        {jobs.map((job) => (
          <tr key={job.id} className={selected === job.id ? "selected" : ""} onClick={() => onSelect?.(job.id)}>
            <td>
              <span className={`pill ${job.status}`}>{job.status}</span>
            </td>
            <td>
              {job.yearStart}–{job.yearEnd}
            </td>
            <td>{job.indicatorCodes.join(", ")}</td>
            <td>{job.counters.imported}</td>
            <td>{job.counters.updated}</td>
            <td>{job.counters.skipped}</td>
            <td>{job.counters.failed}</td>
            {!compact && (
              <td>
                {["queued", "running", "stalled"].includes(job.status) && (
                  <button
                    type="button"
                    className="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCancel?.(job.id);
                    }}
                  >
                    Cancel
                  </button>
                )}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ComparePage({ countries, indicators }) {
  const [a, setA] = useState("US");
  const [b, setB] = useState("IN");
  const [indicator, setIndicator] = useState(indicators[0]?.code || "SP.POP.TOTL");
  const [yearStart, setYearStart] = useState(2000);
  const [yearEnd, setYearEnd] = useState(2023);
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (indicators[0] && !indicators.find((i) => i.code === indicator)) setIndicator(indicators[0].code);
  }, [indicators, indicator]);

  async function run(e) {
    e.preventDefault();
    setErr("");
    try {
      const q = new URLSearchParams({ countries: `${a},${b}`, indicator, yearStart, yearEnd });
      setData(await api.compare(q));
    } catch (error) {
      setErr(error.message);
    }
  }

  return (
    <section>
      <header className="page-head">
        <h2>Country comparison</h2>
        <p>Missing years stay null. Rankings and charts must not coerce missing values to zero.</p>
      </header>
      <form className="inline" onSubmit={run}>
        <CountrySelect countries={countries} value={a} onChange={setA} />
        <CountrySelect countries={countries} value={b} onChange={setB} />
        <IndicatorSelect indicators={indicators} value={indicator} onChange={setIndicator} />
        <label>
          From
          <input type="number" value={yearStart} onChange={(e) => setYearStart(e.target.value)} />
        </label>
        <label>
          To
          <input type="number" value={yearEnd} onChange={(e) => setYearEnd(e.target.value)} />
        </label>
        <button type="submit">Compare</button>
      </form>
      {err && <p className="warn">{err}</p>}
      {data && (
        <table>
          <thead>
            <tr>
              <th>Year</th>
              {Object.values(data.countries).map((c) => (
                <th key={c.iso2Code}>{c.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.countries[a]?.series.map((point, idx) => (
              <tr key={point.year}>
                <td>{point.year}</td>
                {Object.values(data.countries).map((c) => {
                  const p = c.series[idx];
                  return <td key={c.iso2Code}>{p.missing ? "—" : formatNum(p.value)}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function TrendsPage({ countries, indicators }) {
  const [country, setCountry] = useState("US");
  const [picked, setPicked] = useState([]);
  const [yearStart, setYearStart] = useState(2000);
  const [yearEnd, setYearEnd] = useState(2023);
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (indicators.length && picked.length === 0) setPicked([indicators[0].code]);
  }, [indicators, picked.length]);

  async function run(e) {
    e.preventDefault();
    setErr("");
    try {
      const q = new URLSearchParams({ country, indicators: picked.join(","), yearStart, yearEnd });
      setData(await api.trends(q));
    } catch (error) {
      setErr(error.message);
    }
  }

  return (
    <section>
      <header className="page-head">
        <h2>Trends</h2>
        <p>One country, multiple indicators, local SQL only.</p>
      </header>
      <form className="stack" onSubmit={run}>
        <div className="inline">
          <CountrySelect countries={countries} value={country} onChange={setCountry} />
          <label>
            From
            <input type="number" value={yearStart} onChange={(e) => setYearStart(e.target.value)} />
          </label>
          <label>
            To
            <input type="number" value={yearEnd} onChange={(e) => setYearEnd(e.target.value)} />
          </label>
          <button type="submit">Load trend</button>
        </div>
        <div className="chips">
          {indicators.map((ind) => (
            <label key={ind.code} className={picked.includes(ind.code) ? "chip on" : "chip"}>
              <input
                type="checkbox"
                checked={picked.includes(ind.code)}
                onChange={() =>
                  setPicked((prev) => (prev.includes(ind.code) ? prev.filter((c) => c !== ind.code) : [...prev, ind.code]))
                }
              />
              {ind.code}
            </label>
          ))}
        </div>
      </form>
      {err && <p className="warn">{err}</p>}
      {data?.series.map((s) => (
        <div key={s.code} className="panel">
          <h3>
            {s.name} <small>{s.code}</small>
          </h3>
          <Sparkline points={s.points} />
          <p className="hint">{s.points.filter((p) => p.missing).length} missing years in range</p>
        </div>
      ))}
    </section>
  );
}

function RankingsPage({ indicators }) {
  const [indicator, setIndicator] = useState(indicators[0]?.code || "SP.POP.TOTL");
  const [year, setYear] = useState(2022);
  const [order, setOrder] = useState("desc");
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  async function run(e) {
    e.preventDefault();
    setErr("");
    try {
      const q = new URLSearchParams({ indicator, year, order, pageSize: 25 });
      setData(await api.rankings(q));
    } catch (error) {
      setErr(error.message);
    }
  }

  return (
    <section>
      <header className="page-head">
        <h2>Rankings</h2>
        <p>Missing values are excluded unless you ask otherwise. Ties break by country name, then ISO3.</p>
      </header>
      <form className="inline" onSubmit={run}>
        <IndicatorSelect indicators={indicators} value={indicator} onChange={setIndicator} />
        <label>
          Year
          <input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
        </label>
        <label>
          Order
          <select value={order} onChange={(e) => setOrder(e.target.value)}>
            <option value="desc">Top</option>
            <option value="asc">Bottom</option>
          </select>
        </label>
        <button type="submit">Rank</button>
      </form>
      {err && <p className="warn">{err}</p>}
      {data && (
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Country</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {data.ranking.map((r) => (
              <tr key={r.iso3Code}>
                <td>{r.rank}</td>
                <td>
                  {r.countryName} ({r.iso3Code})
                </td>
                <td>{r.missing ? "—" : formatNum(r.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function ExportPage({ countries, indicators }) {
  const [country, setCountry] = useState("");
  const [indicator, setIndicator] = useState("");
  const [yearStart, setYearStart] = useState(2000);
  const [yearEnd, setYearEnd] = useState(2023);
  const href = `/api/export/csv?yearStart=${yearStart}&yearEnd=${yearEnd}${country ? `&countries=${country}` : ""}${
    indicator ? `&indicators=${indicator}` : ""
  }`;

  return (
    <section>
      <header className="page-head">
        <h2>CSV export</h2>
        <p>Streamed from the local database. Disconnecting the client aborts the stream.</p>
      </header>
      <div className="inline">
        <CountrySelect countries={[{ iso2Code: "", name: "All local countries" }, ...countries]} value={country} onChange={setCountry} />
        <IndicatorSelect indicators={[{ code: "", name: "All local indicators" }, ...indicators]} value={indicator} onChange={setIndicator} />
        <label>
          From
          <input type="number" value={yearStart} onChange={(e) => setYearStart(e.target.value)} />
        </label>
        <label>
          To
          <input type="number" value={yearEnd} onChange={(e) => setYearEnd(e.target.value)} />
        </label>
        <a className="button" href={href}>
          Download CSV
        </a>
      </div>
    </section>
  );
}

function CountrySelect({ countries, value, onChange }) {
  return (
    <label>
      Country
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {countries.map((c) => (
          <option key={c.iso2Code || "all"} value={c.iso2Code}>
            {c.name} {c.iso2Code ? `(${c.iso2Code})` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

function IndicatorSelect({ indicators, value, onChange }) {
  return (
    <label>
      Indicator
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {indicators.map((i) => (
          <option key={i.code || "all"} value={i.code}>
            {i.code ? `${i.code} — ${i.name}` : i.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function Sparkline({ points }) {
  const nums = points.filter((p) => !p.missing).map((p) => p.value);
  const min = Math.min(...nums, 0);
  const max = Math.max(...nums, 1);
  const w = 640;
  const h = 80;
  const path = points
    .map((p, i) => {
      const x = (i / Math.max(points.length - 1, 1)) * w;
      const y = p.missing ? null : h - ((p.value - min) / (max - min || 1)) * (h - 8) - 4;
      return y === null ? null : `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .filter(Boolean)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="spark">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function formatNum(n) {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
}
