import React from "react";
import PropTypes from "prop-types"; 
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import styles from "./ProblemModal.module.css";
import Markdown from "react-markdown";
import rehypeRaw from 'rehype-raw';

const CustomLink = ({node, href, children, title, ...props}) => {
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

function ProblemModal({ problem, show, handleClose }) {
  if (!problem) return null;
  console.log("PROBLEM ", problem);

  return (
    <Modal show={show} onHide={handleClose} dialogClassName={styles.modal60w}>
      <Modal.Header closeButton>
        <Modal.Title>Problem</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div>
          <div style={{ marginBottom: "9px" }}>
            URL:{" "}
            <a
              onClick={(e) => e.stopPropagation()}
              href={problem.path}
              target="_blank"
              rel="noopener noreferrer"
            >
              {problem.path}
            </a>
          </div>
          <h5>Problem Description</h5>
          <Markdown 
            rehypePlugins={[rehypeRaw]} 
            components={{
              a: CustomLink
            }}
          >
            {problem.problemDescription}
          </Markdown>
          <h5>Proposed Solution</h5>
          <Markdown 
            rehypePlugins={[rehypeRaw]} 
            components={{
              a: CustomLink
            }}
          >
            {problem.solutionText}
          </Markdown>
          <h5>Problem Impact</h5>
          <Markdown 
            rehypePlugins={[rehypeRaw]} 
            components={{
              a: CustomLink
            }}
          >
            {problem.impactText}
          </Markdown>
          <h5>Solution HTML</h5>
          <Markdown 
            rehypePlugins={[rehypeRaw]} 
            components={{
              a: CustomLink
            }}
          >
            {`\`\`\`html\n${problem.variantHTML}\n\`\`\``}
          </Markdown>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

// Add PropTypes validation
ProblemModal.propTypes = {
  problem: PropTypes.shape({
    path: PropTypes.string,
    problemDescription: PropTypes.string,
    solutionText: PropTypes.string,
    impactText: PropTypes.string,
    variantHTML: PropTypes.string,
  }),
  show: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
};

export default ProblemModal;
