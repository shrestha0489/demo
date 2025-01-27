import React, { useMemo } from "react";
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

const Loader = ({ progress, currentStep }) => (
  <div className={styles.loaderWrapper}>
    <div className={styles.progressContainer}>
      <div 
        className={styles.progressBar} 
        style={{ 
          width: `${progress}%`,
          backgroundColor: "#0066cc",
          transition: "width 0.5s ease-in-out" // Added smooth transition
        }}
      ></div>
    </div>
    <div className={styles.loaderDetails}>
      <div className={styles.loader}></div>
      <span>{currentStep || "Analyzing..."} ({progress}%)</span>
    </div>
  </div>
);

const TableLoader = () => (
  <div className={styles.tableLoaderWrapper}>
    <div className={styles.loader}></div>
    <span>Fetching previous analyses...</span>
  </div>
);

const ResultsTable = ({ data, isLoading }) => {
  // Sort data by timestamp in descending order
  const sortedData = React.useMemo(() => {
    return [...data].sort((a, b) => {
      // Put loading items at the top
      if (a.loading && !b.loading) return -1;
      if (!a.loading && b.loading) return 1;
      
      // Sort by timestamp for non-loading items
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA;
    });
  }, [data]);
  
  const analyzedCount = useMemo(() => {
    return sortedData.filter((item) => !item.loading).length;
  }, [sortedData]);

  if (isLoading) {
    return (
      <div className={styles.resultsTable}>
        <div className={styles.header}>
          <h2 className={styles.title}>Analysis Results</h2>
        </div>
        <TableLoader />
      </div>
    );
  }

  return (
    <div className={styles.resultsTable}>
      <div className={styles.header}>
        <h2 className={styles.title}>Analysis Results</h2>
        <div className={styles.badge}>
          {analyzedCount} {analyzedCount===1 ? "URL" : "URLs"} analyzed
        </div>
      </div>

      {sortedData.length > 0 ? (
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
              {sortedData.map((item, index) => (
                <React.Fragment key={index}>
                  {item.loading ? (
                    // Case 1: URL is in loading state
                    <tr>
                      <td className={styles.url} rowSpan="1">
                        <div className={styles.urlWrapper}>
                          <span className={styles.urlText}>{item.url}</span>
                          <span className={styles.timestamp}>
                            {new Date(item.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td colSpan="3" className={styles.loadingRow}>
                        <Loader 
                          progress={item.progress || 0} 
                          currentStep={item.currentStep} 
                        />
                      </td>
                    </tr>
                  ) : item.problems.length > 0 ? (
                    // Case 2: URL has multiple problems
                    item.problems.map((problem, problemIndex) => (
                      <tr key={`${index}-${problemIndex}`}>
                        {problemIndex === 0 && (
                          <td
                            className={styles.url}
                            rowSpan={item.problems.length}
                          >
                            <div className={styles.urlWrapper}>
                              <span className={styles.urlText}>{item.url}</span>
                              <span className={styles.timestamp}>
                                {new Date(item.timestamp).toLocaleString()}
                              </span>
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
                    // Case 3: URL has no problems
                    <tr>
                      <td className={styles.url}>
                        <div className={styles.urlWrapper}>
                          <span className={styles.urlText}>{item.url}</span>
                          <span className={styles.timestamp}>
                            {new Date(item.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td colSpan="3" className={styles.noProblems}>
                        <div className={styles.successMessage}>
                          ✓ No problems found
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.emptyState}>
          <EmptyStateIcon />
          <p className={styles.emptyText}>No results to display yet.</p>
          <p className={styles.emptySubtext}>Enter a URL above to begin analysis</p>
        </div>
      )}
    </div>
  );
};

export default ResultsTable;