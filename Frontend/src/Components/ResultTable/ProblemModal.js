import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import styles from "./ProblemModal.module.css";

function ProblemModal({ problem, show, handleClose }) {
  if (!problem) return null;
  console.log("PROBLEM ", problem);
  return (
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>Problem</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div>
          <h5>Problem Description</h5>
          <p>{problem.problemDescription}</p>
          <h5>Problem Solution</h5>
          <p className={styles.prewrap}>{problem.solutionText}</p>
          <h5>Problem Impact</h5>
          <p>{problem.impactText}</p>
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
