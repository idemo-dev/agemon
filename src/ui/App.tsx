import { useState, useEffect } from "react";
import type { DashboardData, AgemonProfile } from "../engine/types.js";
import { PartyTab } from "./components/PartyTab.js";
import { SearchTab } from "./components/SearchTab.js";
import { AgemonDetail } from "./components/AgemonDetail.js";
import "./theme.css";

type Tab = "party" | "search";
type View = { type: "tabs" } | { type: "detail"; profile: AgemonProfile };

export function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("party");
  const [view, setView] = useState<View>({ type: "tabs" });

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          Failed to load dashboard data: {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.title}>AGEMON</h1>
        <p style={styles.subtitle}>
          Visualize, Grow, and Evolve your AI Dev Environment
        </p>
      </header>

      {/* Main content */}
      <main style={styles.main}>
        {view.type === "detail" ? (
          <AgemonDetail
            profile={view.profile}
            onBack={() => setView({ type: "tabs" })}
          />
        ) : (
          <>
            {/* Tab bar */}
            <div style={styles.tabBar}>
              <button
                onClick={() => setActiveTab("party")}
                style={{
                  ...styles.tab,
                  ...(activeTab === "party" ? styles.tabActive : {}),
                }}
              >
                PARTY
              </button>
              <button
                onClick={() => setActiveTab("search")}
                style={{
                  ...styles.tab,
                  ...(activeTab === "search" ? styles.tabActive : {}),
                }}
              >
                SEARCH
              </button>
            </div>

            {/* Tab content */}
            {activeTab === "party" ? (
              <PartyTab
                data={data}
                onSelectAgemon={(profile) =>
                  setView({ type: "detail", profile })
                }
              />
            ) : (
              <SearchTab
                data={data}
                onSelectAgemon={(profile) =>
                  setView({ type: "detail", profile })
                }
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        Scanned at {new Date(data.generatedAt).toLocaleString()}
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    background: "var(--bg-primary, #fff)",
    color: "var(--text-primary, #1a1a2e)",
    fontFamily: "var(--font-mono, monospace)",
  },
  header: {
    textAlign: "center",
    padding: "32px 16px 16px",
    borderBottom: "1px solid var(--border-color, #e0e0e8)",
  },
  title: {
    margin: 0,
    fontSize: "28px",
    fontWeight: 800,
    letterSpacing: "4px",
    color: "var(--color-brand, #e74c3c)",
  },
  subtitle: {
    margin: "4px 0 0",
    fontSize: "12px",
    color: "var(--text-muted, #9e9eae)",
  },
  main: {
    maxWidth: "800px",
    margin: "0 auto",
    padding: "20px 16px",
  },
  tabBar: {
    display: "flex",
    gap: "4px",
    marginBottom: "20px",
    borderBottom: "1px solid var(--border-color, #e0e0e8)",
  },
  tab: {
    padding: "10px 20px",
    border: "none",
    background: "none",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 700,
    letterSpacing: "1px",
    color: "var(--text-muted, #9e9eae)",
    borderBottom: "2px solid transparent",
    fontFamily: "var(--font-mono, monospace)",
    transition: "color 0.15s, border-color 0.15s",
  },
  tabActive: {
    color: "var(--color-brand, #e74c3c)",
    borderBottom: "2px solid var(--color-brand, #e74c3c)",
  },
  footer: {
    textAlign: "center",
    padding: "16px",
    fontSize: "11px",
    color: "var(--text-muted, #9e9eae)",
    borderTop: "1px solid var(--border-color, #e0e0e8)",
  },
  loading: {
    textAlign: "center",
    padding: "64px",
    color: "var(--text-muted, #9e9eae)",
    fontSize: "14px",
  },
  error: {
    textAlign: "center",
    padding: "64px",
    color: "var(--color-brand, #e74c3c)",
    fontSize: "14px",
  },
};
