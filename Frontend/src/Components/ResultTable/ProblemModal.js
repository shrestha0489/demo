import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import styles from "./ProblemModal.module.css";
import Markdown from "react-markdown";

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
          <h5>Problem Description</h5>
          <Markdown>{problem.problemDescription}</Markdown>
          <h5>Proposed Solution</h5>
          <Markdown>{problem.solutionText}</Markdown>
          <h5>Problem Impact</h5>
          <Markdown>{problem.impactText}</Markdown>
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

export default ProblemModal;
