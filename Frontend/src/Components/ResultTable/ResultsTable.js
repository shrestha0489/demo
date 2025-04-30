import React from "react";
import PropTypes from "prop-types"; // Import PropTypes
import styles from "./ResultsTable.module.css";
import ProblemModal from "./ProblemModal";

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

function trimText(sentence) {
  let words = sentence.split(" ").length;
  if (words > 10) {
    return sentence.split(" ").slice(0, 10).join(" ") + "...";
  }
  return sentence;
}

const ResultsTable = ({ data }) => {
  const [show, setShow] = React.useState(false);
  const [problem, setProblem] = React.useState(null);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

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

  const { loading, problems, progress, currentStep, url } = data;

  return (
    <div className={`${styles.resultsTable} ${styles.tableLoaderContainer}`}>
      <div className={styles.header}>
        <h2 className={styles.title}>Analysis Results</h2>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.urlText}
      >
        {url}
      </a>
      <div className={styles.emptyState}>
        {loading ? (
          <TableLoader progress={progress || 0} currentStep={currentStep} />
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Problem Description</th>
                  <th>Solution</th>
                  <th>Impact</th>
                  <th>URL</th>
                </tr>
              </thead>
              <tbody>
                {problems && problems.length > 0 ? (
                  problems.map((problem, problemIndex) => (
                    <tr
                      key={problemIndex}
                      onClick={() => {
                        setProblem(problem);
                        handleShow();
                      }}
                    >
                      <td>
                        <div className={styles.problemCell}>
                          {trimText(problem.problemDescription)}
                        </div>
                      </td>
                      <td>
                        <div className={styles.solutionCell}>
                          {trimText(problem.solutionText)}
                        </div>
                      </td>
                      <td>
                        <div className={styles.impactCell}>
                          {trimText(problem.impactText)}
                        </div>
                      </td>
                      <td>
                        <div className={styles.impactCell}>
                          <a
                            onClick={(e) => e.stopPropagation()}
                            href={problem.path}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {problem.path}
                          </a>
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
      <ProblemModal problem={problem} show={show} handleClose={handleClose} />
    </div>
  );
};

// Prop validation
ResultsTable.propTypes = {
  data: PropTypes.shape({
    loading: PropTypes.bool,
    problems: PropTypes.array,
    progress: PropTypes.number,
    currentStep: PropTypes.string,
    url: PropTypes.string,
  }),
};

TableLoader.propTypes = {
  progress: PropTypes.number.isRequired,
  currentStep: PropTypes.string,
};

export default ResultsTable;
