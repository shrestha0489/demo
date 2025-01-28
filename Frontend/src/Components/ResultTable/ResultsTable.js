import React from "react";
import styles from "./ResultsTable.module.css";

const EmptyStateIcon = () => (
  <svg
    className={styles.emptyIcon}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" />
    <line x1="16" y1="5" x2="22" y2="5" />
    <line x1="19" y1="2" x2="19" y2="8" />
    <circle cx="9" cy="9" r="2" />
    <path d="M3 20h7l3-3 3 3h4" />
  </svg>
);

const TableLoader = ({ progress, currentStep }) => (
  <div className={styles.tableLoaderOverlay}>
    <div className={styles.tableLoaderContent}>
      <div className={styles.spinnerLarge}></div>
      <div className={styles.progressContainer}>
        <div
          className={styles.progressBarFull}
          style={{
            width: `${progress}%`,
            backgroundColor: "#0066cc",
            transition: "width 0.5s ease-in-out",
          }}
        ></div>
      </div>
      <p className={styles.loaderText}>
        {currentStep || "Analyzing..."} ({progress}%)
      </p>
    </div>
  </div>
);

const ResultsTable = ({ data }) => {
  if (!data) {
    return (
      <div className={styles.resultsTable}>
        <div className={styles.header}>
          <h2 className={styles.title}>Analysis Results</h2>
        </div>
        <div className={styles.emptyState}>
          <EmptyStateIcon />
          <p className={styles.emptyText}>No results to display yet.</p>
          <p className={styles.emptySubtext}>
            Enter a URL above to begin analysis
          </p>
        </div>
      </div>
    );
  }

  const { loading, problems, progress, currentStep,url } = data;

  return (
    <div className={`${styles.resultsTable} ${styles.tableLoaderContainer}`}>
      <div className={styles.header}>
        <h2 className={styles.title}>Analysis Results</h2>
      </div>

      <div className={styles.emptyState}>
        {loading ? (
          <TableLoader progress={progress || 0} currentStep={currentStep} />
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.urlColumn}>URL</th>
                  <th>Problem Description</th>
                  <th>Solution</th>
                  <th>Impact</th>
                </tr>
              </thead>
              <tbody>
                {problems && problems.length > 0 ? (
                  problems.map((problem, problemIndex) => (
                    <tr key={problemIndex}>
                      {problemIndex === 0 && (
                        <td className={styles.url} rowSpan={problems.length}>
                          <div className={styles.urlWrapper}>
                            <span className={styles.urlText}>{url}</span>
                          </div>
                        </td>
                      )}
                      <td>
                        <div className={styles.problemCell}>
                          {problem.problemDescription}
                        </div>
                      </td>
                      <td>
                        <div className={styles.solutionCell}>
                          {problem.solutionText}
                        </div>
                      </td>
                      <td>
                        <div className={styles.impactCell}>
                          {problem.impactText}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className={styles.url}>
                      <div className={styles.urlWrapper}>
                        <span className={styles.urlText}>{url}</span>
                      </div>
                    </td>
                    <td colSpan="3" className={styles.noProblems}>
                      <div className={styles.successMessage}>
                        ✓ No problems found
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsTable;
