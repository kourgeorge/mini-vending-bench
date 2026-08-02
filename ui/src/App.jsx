import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import RunBrowser from './components/RunBrowser.jsx';
import RunDashboard from './components/RunDashboard.jsx';
import Leaderboard from './components/Leaderboard.jsx';
import styles from './App.module.css';

function HeroStats() {
  const { data = [] } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => fetch('/api/leaderboard').then(r => r.json()),
    refetchInterval: 15000,
  });

  const totalRuns = data.reduce((s, m) => s + m.runs, 0);
  const modelCount = data.length;
  const bestNetWorth = data.length > 0
    ? Math.max(...data.map(m => m.avgNetWorth ?? 0))
    : null;

  return (
    <div className={styles.heroStats}>
      <div className={styles.heroStat}>
        <span className={styles.heroStatNum}>{modelCount}</span>
        <span className={styles.heroStatLabel}>Models Tested</span>
      </div>
      <div className={styles.heroStat}>
        <span className={styles.heroStatNum}>{totalRuns}</span>
        <span className={styles.heroStatLabel}>Total Runs</span>
      </div>
      <div className={styles.heroStat}>
        <span className={styles.heroStatNum}>
          {bestNetWorth != null ? `$${bestNetWorth.toFixed(0)}` : '—'}
        </span>
        <span className={styles.heroStatLabel}>Best Net Worth</span>
      </div>
      <div className={styles.heroStat}>
        <span className={styles.heroStatNum}>30</span>
        <span className={styles.heroStatLabel}>Day Simulation</span>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState('home'); // 'home' | 'runs' | 'run'
  const [selectedRun, setSelectedRun] = useState(null);

  function handleSelectRun(run) {
    setSelectedRun(run);
    setPage('run');
  }

  function handleBack() {
    setSelectedRun(null);
    setPage('runs');
  }

  return (
    <div className={styles.page}>
      {/* ── Nav ── */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <a className={styles.navLogo} href="#" onClick={e => { e.preventDefault(); setPage('home'); }}>
            <span className={styles.navLogoIcon}>🏪</span>
            <span className={styles.navLogoText}>Mini Vending Bench</span>
          </a>

          <div className={styles.navLinks}>
            <a
              href="#"
              className={`${styles.navLink} ${page === 'home' ? styles.navLinkActive : ''}`}
              onClick={e => { e.preventDefault(); setPage('home'); }}
            >Home</a>
            <a
              href="#"
              className={`${styles.navLink} ${page === 'runs' ? styles.navLinkActive : ''}`}
              onClick={e => { e.preventDefault(); setPage('runs'); }}
            >Runs</a>
            <div className={styles.navDivider} />
            <a
              className={styles.navLink}
              href="/benchmark.html"
              target="_blank"
              rel="noreferrer"
            >📄 Docs</a>
          </div>
        </div>
      </nav>

      {/* ── Home: Hero + Leaderboard ── */}
      {page === 'home' && (
        <>
          <section className={styles.hero}>
            <div className={styles.container}>
              <div className={styles.heroBadge}>
                <span className={styles.heroBadgeDot} />
                Open Benchmark
              </div>
              <h1 className={styles.heroTitle}>
                Can your AI run<br />a vending machine?
              </h1>
              <p className={styles.heroSub}>
                A 30-day agentic benchmark that puts AI models in charge of a real
                vending machine business — ordering stock, setting prices, managing
                cash flow, and surviving the market.
              </p>
              <div className={styles.heroCta}>
                <button
                  className={styles.ctaPrimary}
                  onClick={() => setPage('runs')}
                >View All Runs</button>
                <a
                  className={styles.ctaSecondary}
                  href="/benchmark.html"
                  target="_blank"
                  rel="noreferrer"
                >Read the Docs →</a>
              </div>
              <HeroStats />
            </div>
          </section>

          <section className={styles.leaderboardSection}>
            <div className={styles.containerWide}>
              <Leaderboard embedded onSelectRun={handleSelectRun} />
            </div>
          </section>

          <footer className={styles.footer}>
            <div className={`${styles.container} ${styles.footerInner}`}>
              <span className={styles.footerLogo}>🏪 Mini Vending Bench</span>
              <span className={styles.footerRight}>
                An agentic AI benchmark ·{' '}
                <a href="/benchmark.html" target="_blank" rel="noreferrer">Docs</a>
              </span>
            </div>
          </footer>
        </>
      )}

      {/* ── Runs sub-page ── */}
      {page === 'runs' && (
        <main className={styles.subPage}>
          <div className={styles.subPageContent}>
            <RunBrowser onSelect={handleSelectRun} />
          </div>
        </main>
      )}

      {/* ── Run detail sub-page ── */}
      {page === 'run' && selectedRun && (
        <main className={styles.subPage}>
          <div className={styles.subPageContent}>
            <RunDashboard
              subdir={selectedRun.subdir}
              runId={selectedRun.runId}
              status={selectedRun.status}
              model={selectedRun.model}
            />
          </div>
        </main>
      )}
    </div>
  );
}
