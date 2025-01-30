import React, { useState, useEffect, useCallback } from "react";
import api from "../../API";
import ResultsTable from "../ResultTable/ResultsTable";
import styles from "./Analyze.module.css";
import Logout from "./Logout";

const CONFIG = {
  WEBSOCKET_URL:
    "wss://he7ifebjve.execute-api.us-east-1.amazonaws.com/production/",
  RECONNECT_DELAY: 3000,
  MAX_RECONNECT_ATTEMPTS: 5,
};

const DEFAULT_ERROR_MESSAGE = "An unexpected error occurred. Please try again.";

const AnalyzePage = () => {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [wsConnection, setWsConnection] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    const connectWebSocket = () => {
      const ws = new WebSocket(CONFIG.WEBSOCKET_URL);

      ws.onopen = () => {
        console.log("WebSocket connected");
        setWsConnection(ws);
        setWsConnected(true);
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected");
        setWsConnected(false);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };

      return ws;
    };

    const ws = connectWebSocket();

    return () => {
      if (ws) ws.close();
    };
  }, []);

  const subscribeToTask = useCallback(
    (taskId) => {
      if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        wsConnection.send(
          JSON.stringify({
            action: "subscribe",
            taskId: taskId,
          })
        );
      }
    },
    [wsConnection]
  );

  const handleWebSocketMessage = useCallback((message) => {
    if (!message || typeof message !== "object") {
      console.error("Received invalid WebSocket message:", message);
      return;
    }

    const {
      taskId,
      status,
      problems = [],
      currentStep = "",
      progress = 0,
      timestamp = new Date().toISOString(),
    } = message;

    if (!taskId || !status) {
      console.error("Message is missing required fields:", message);
      return;
    }

    setData((prevData) => ({
      ...prevData,
      status,
      problems,
      currentStep,
      progress,
      timestamp,
      loading: status !== "completed" && status !== "error",
    }));

    if (status === "completed" || status === "error") {
      setIsLoading(false);
    }

    if (status === "error" && message.error) {
      setError(`Analysis failed: ${message.error}`);
    }
  }, []);

  const handleAnalyze = async (e) => {
    if (e) e.preventDefault();

    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setError("Please enter a valid URL.");
      return;
    }

    if (!isValidUrl(trimmedUrl)) {
      setError("Please enter a valid URL format (e.g., https://example.com)");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const response = await api.post("/analyze", { url: trimmedUrl });
      const taskId = response.data.taskId;

      setData({
        taskId,
        url: trimmedUrl,
        status: "pending",
        timestamp: new Date().toISOString(),
        problems: [],
        loading: true,
        progress: 0,
        currentStep: "Initializing analysis...",
      });

      subscribeToTask(taskId);
      setUrl("");
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || err.message || DEFAULT_ERROR_MESSAGE;
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (err) {
      return false;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.logoutWrapper}>
        <Logout />
      </div>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.iconContainer}>
            <div className={styles.globeIcon}></div>
          </div>
          <h1 className={styles.title}>Spike AI Backend Portal</h1>
          {/* <p className={styles.description}>
            Analyze your website for conversion optimization opportunities
          </p> */}
        </div>

        <div className={styles.content}>
          <form onSubmit={handleAnalyze} className={styles.inputContainer}>
            <input
              type="url"
              placeholder="Enter your website URL (e.g., https://example.com)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={styles.input}
              disabled={isLoading || !wsConnected}
            />
            <button
              type="submit"
              disabled={isLoading || !wsConnected}
              className={styles.button}
            >
              {isLoading
                ? "Analyzing..."
                : wsConnected
                ? "Analyze"
                : "Connecting..."}
            </button>
          </form>

          {error && (
            <div className={styles.alert}>
              <div className={styles.alertIcon}>!</div>
              <p className={styles.alertText}>{error}</p>
            </div>
          )}

          <div className={styles.resultsContainer}>
            <ResultsTable data={data} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyzePage;
