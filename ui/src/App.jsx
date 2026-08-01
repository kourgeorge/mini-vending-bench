import { useState } from 'react';
import RunBrowser from './components/RunBrowser.jsx';
import RunDashboard from './components/RunDashboard.jsx';
import Leaderboard from './components/Leaderboard.jsx';
import styles from './App.module.css';

export default function App() {
  const [page, setPage] = useState('runs'); // 'runs' | 'leaderboard'
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
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>🏪</span>
            <span className={styles.logoText}>Mini Vending Bench</span>
          </div>
          <nav className={styles.nav}>
            {page === 'run' ? (
              <button className={styles.navBtn} onClick={handleBack}>← All Runs</button>
            ) : (
              <>
                <button
                  className={`${styles.navBtn} ${page === 'runs' ? styles.navActive : ''}`}
                  onClick={() => setPage('runs')}
                >Runs</button>
                <button
                  className={`${styles.navBtn} ${page === 'leaderboard' ? styles.navActive : ''}`}
                  onClick={() => setPage('leaderboard')}
                >🏆 Leaderboard</button>
                <a
                  className={styles.navBtn}
                  href="/benchmark.html"
                  target="_blank"
                  rel="noreferrer"
                >📄 Benchmark</a>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        {page === 'run' && selectedRun && (
          <RunDashboard
            subdir={selectedRun.subdir}
            runId={selectedRun.runId}
            status={selectedRun.status}
            model={selectedRun.model}
          />
        )}
        {page === 'runs' && <RunBrowser onSelect={handleSelectRun} />}
        {page === 'leaderboard' && <Leaderboard onSelectRun={handleSelectRun} />}
      </main>
    </div>
  );
}
