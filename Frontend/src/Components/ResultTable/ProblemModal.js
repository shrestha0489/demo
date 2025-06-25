import React, { useState } from "react";
import PropTypes from "prop-types";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import styles from "./ProblemModal.module.css";
import Markdown from "react-markdown";
import rehypeRaw from 'rehype-raw';
import Badge from 'react-bootstrap/Badge';
import { FaChevronDown, FaChevronRight, FaCode, FaCopy, FaCheck } from 'react-icons/fa';

const CustomLink = ({ node, href, children, title, ...props }) => {
  return (
    <a
      href={href}
      title={title}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      {...props}
    >
      {children}
    </a>
  );
};


const CopyButton = ({ textToCopy }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };

  return (
    <button
      className={styles.copyButton}
      onClick={handleCopy}
      title="Copy to clipboard"
    >
      {copied ? <FaCheck /> : <FaCopy />}
    </button>
  );
};


const CollapsibleSection = ({ title, children, defaultExpanded = false, badge = null }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={styles.collapsibleSection}>
      <div
        className={styles.collapsibleHeader}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className={styles.expandIcon}>
          {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
        </span>
        <h6 className={styles.collapsibleTitle}>{title}</h6>
        {badge && <span className={styles.headerBadge}>{badge}</span>}
      </div>
      {isExpanded && (
        <div className={styles.collapsibleContent}>
          {children}
        </div>
      )}
    </div>
  );
};

function ProblemModal({ problem, show, handleClose }) {
  if (!problem) return null;


  const experiment = problem.experiments && problem.experiments[0];

  return (
    <Modal show={show} onHide={handleClose} dialogClassName={styles.modal60w}>
      <Modal.Header closeButton>
        <Modal.Title>
          <Markdown
            rehypePlugins={[rehypeRaw]}
            components={{
              a: CustomLink
            }}
          >
            {problem.theme ? problem.theme : "Problem Details"}
          </Markdown>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className={styles.problemContainer}>
          {problem.path && (
            <div className={styles.urlSection}>
              <strong>URL:</strong>{" "}
              <a
                onClick={(e) => e.stopPropagation()}
                href={problem.path}
                target="_blank"
                rel="noopener noreferrer"
              >
                {problem.path}
              </a>
            </div>
          )}


          <div className={styles.sectionWrapper}>
            <h5>Problem Description</h5>
            <Markdown
              rehypePlugins={[rehypeRaw]}
              components={{
                a: CustomLink
              }}
            >
              {problem.problemDescription}
            </Markdown>
          </div>


          <div className={styles.sectionWrapper}>
            <h5>Proposed Solution</h5>
            <Markdown
              rehypePlugins={[rehypeRaw]}
              components={{
                a: CustomLink
              }}
            >
              {problem.solutionText}
            </Markdown>
          </div>


          <div className={styles.sectionWrapper}>
            <h5>Problem Impact</h5>
            <Markdown
              rehypePlugins={[rehypeRaw]}
              components={{
                a: CustomLink
              }}
            >
              {problem.impactText}
            </Markdown>
          </div>
        </div>

        {experiment && (
          <div className={styles.experimentSection}>
            <h5>Experiment Information</h5>
            <div className={styles.experimentDetails}>
              <p><strong>Name:</strong> {experiment.name}</p>
              <p>
                <strong>Duration:</strong> {new Date(experiment.startDate).toLocaleDateString()} to {new Date(experiment.endDate).toLocaleDateString()}
              </p>


              {experiment.variants && experiment.variants.length > 0 && (
                <CollapsibleSection
                  title="Variants"
                  defaultExpanded={true}
                >
                  {experiment.variants.map((variantItem, variantIndex) => (
                    <div key={`variant-${variantIndex}`} className={styles.variantItem}>
                      <CollapsibleSection
                        title={variantItem.name}
                        badge={
                          <Badge bg={variantItem.status === "Active" ? "success" : "secondary"}>
                            {variantItem.status}
                          </Badge>
                        }
                        defaultExpanded={true}
                      >

                        {variantItem.changes && variantItem.changes.length > 0 && (
                          <div className={styles.changesSection}>
                            {variantItem.changes.map((change, changeIndex) => (
                              <CollapsibleSection
                                key={`change-${changeIndex}`}
                                title={
                                  <span>
                                    Change {changeIndex + 1}: <code>{change.selector}</code>
                                  </span>
                                }
                                defaultExpanded={true}
                              >
                                <div className={styles.changeDetails}>
                                  {change.webpageUrl && (
                                    <p>
                                      <strong>Webpage URL:</strong>{" "}
                                      <a
                                        href={change.webpageUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {change.webpageUrl}
                                      </a>
                                    </p>
                                  )}
                                  <p>
                                    <strong>Selector:</strong> <code>{change.selector}</code>
                                  </p>
                                  <p>
                                    <strong>Placement:</strong> {change.placement}
                                  </p>

                                  {change.html && (
                                    <CollapsibleSection
                                      title={
                                        <div className={styles.codeHeaderWithCopy}>
                                          <span><FaCode /> HTML Content</span>
                                          <CopyButton textToCopy={change.html} />
                                        </div>
                                      }
                                      defaultExpanded={false}
                                    >
                                      <div className={styles.codeWrapper}>
                                        <pre className={styles.codeBlock}>
                                          <code>{change.html}</code>
                                        </pre>
                                      </div>
                                    </CollapsibleSection>
                                  )}

                                  {change.script && change.script.trim() !== "" && (
                                    <CollapsibleSection
                                      title={
                                        <div className={styles.codeHeaderWithCopy}>
                                          <span> JavaScript</span>
                                          <CopyButton textToCopy={change.script} />
                                        </div>
                                      }
                                      defaultExpanded={false}
                                    >
                                      <div className={styles.codeWrapper}>
                                        <pre className={styles.codeBlock}>
                                          <code>{change.script}</code>
                                        </pre>
                                      </div>
                                    </CollapsibleSection>
                                  )}
                                </div>
                              </CollapsibleSection>
                            ))}
                          </div>
                        )}
                      </CollapsibleSection>
                    </div>
                  ))}
                </CollapsibleSection>
              )}
            </div>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

ProblemModal.propTypes = {
  problem: PropTypes.shape({
    path: PropTypes.string,
    theme: PropTypes.string,
    problemDescription: PropTypes.string,
    solutionText: PropTypes.string,
    impactText: PropTypes.string,
    variantHTML: PropTypes.string,
    experiments: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string,
        startDate: PropTypes.string,
        endDate: PropTypes.string,
        variants: PropTypes.arrayOf(
          PropTypes.shape({
            name: PropTypes.string,
            status: PropTypes.string,
            changes: PropTypes.arrayOf(
              PropTypes.shape({
                selector: PropTypes.string,
                html: PropTypes.string,
                placement: PropTypes.string,
                script: PropTypes.string,
                webpageUrl: PropTypes.string
              })
            )
          })
        )
      })
    )
  }),
  show: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
};

CopyButton.propTypes = {
  textToCopy: PropTypes.string.isRequired
};

export default ProblemModal;