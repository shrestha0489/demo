import React, { useState, useEffect, useCallback } from "react";
import api from "../../API";
import ResultsTable from "../ResultTable/ResultsTable";
import styles from "./Analyze.module.css";

const CONFIG = {
  WEBSOCKET_URL: "wss://hfpbr7oc1m.execute-api.us-east-1.amazonaws.com/dev/",
  RECONNECT_DELAY: 3000,
  MAX_RECONNECT_ATTEMPTS: 5,
};

const DEFAULT_ERROR_MESSAGE = "An unexpected error occurred. Please try again.";

const AnalyzePage = () => {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(true);
  const [data, setData] = useState([]);
  const [error, setError] = useState("");
  const [wsConnection, setWsConnection] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [hasAttemptedConnection, setHasAttemptedConnection] = useState(false); // New state

  useEffect(() => {
    fetchHistoricalRecords();
  }, []);

  const fetchHistoricalRecords = async () => {
    try {
      setIsFetchingHistory(true);
      const response = await api.get("/fetchRecords");
      if (response.data.success) {
        const transformedData = response.data.data.map((record) => ({
          taskId: record.taskId,
          url: record.url,
          status: record.status,
          timestamp: record.timestamp,
          problems: record.problems || [],
          loading: false,
        }));
        setData(transformedData);
      }
    } catch (err) {
      console.error("Error fetching historical records:", err);
      setError("Failed to load historical analysis records");
    } finally {
      setIsFetchingHistory(false);
    }
  };

  useEffect(() => {
    let reconnectTimer;
  
    const connectWebSocket = () => {
      if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        console.log("WebSocket already connected. No need to reconnect.");
        return;
      }
  
      const ws = new WebSocket(CONFIG.WEBSOCKET_URL);
  
      ws.onopen = () => {
        console.log("WebSocket connected");
        setWsConnection(ws); // Update wsConnection
        setIsConnected(true);
        setReconnectAttempts(0); // Reset reconnect attempts on success
        setError("");
      };
  
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };
  
      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setError("Connection error. Please check your API key and try again.");
        setIsConnected(false);
      };
  
      ws.onclose = (event) => {
        console.log(`WebSocket closed with code ${event.code}`, event.reason);
        setIsConnected(false);
        if (reconnectAttempts < CONFIG.MAX_RECONNECT_ATTEMPTS) {
          setHasAttemptedConnection(true);
          reconnectTimer = setTimeout(() => {
            setReconnectAttempts((prev) => prev + 1);
            connectWebSocket();
          }, CONFIG.RECONNECT_DELAY);
        } else {
          setError(
            "Maximum reconnection attempts reached. Please refresh the page.",
          );
        }
      };
    };
  
    connectWebSocket(); // Initial connection
  
    return () => {
      if (wsConnection) {
        wsConnection.close(); // Clean up existing connection
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer); // Clean up any pending reconnect attempts
      }
    };
  }, [reconnectAttempts]);

  const subscribeToTask = useCallback(
    (taskId) => {
      if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        wsConnection.send(
          JSON.stringify({
            action: "subscribe",
            taskId: taskId,
          }),
        );
      }
    },
    [wsConnection],
  );

  const handleWebSocketMessage = useCallback((message) => {
    if (!message || typeof message !== "object") {
      console.error("Received invalid WebSocket message:", message);
      return;
    }

    console.log("WebSocket Message Received:", message);

    const {
      taskId,
      status,
      problems = [],
      currentStep = "",
      progress = 0,
      timestamp = new Date().toISOString(),
    } = message;

    if (!taskId || !status) {
      console.error(
        "Message is missing required fields (taskId or status):",
        message,
      );
      return;
    }

    setData((prevData) =>
      prevData.map((item) =>
        item.taskId === taskId
          ? {
              ...item,
              status,
              problems, // Update problems if present
              currentStep, // Update the current step
              progress, // Update progress if present
              timestamp, // Always update timestamp
              loading: status !== "completed" && status !== "error", // Update loading based on status
            }
          : item,
      ),
    );

    // If task is completed or errored, stop loading
    if (status === "completed" || status === "error") {
      setIsLoading(false);
    }

    // Handle error case with detailed feedback
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

    if (!isConnected) {
      setError("Warning: WebSocket disconnected. Results may be delayed.");
    }

    setError("");
    setIsLoading(true);

    try {
      const response = await api.post("/analyze", { url: trimmedUrl });
      const taskId = response.data.taskId;

      setData((prevData) => [
        {
          taskId,
          url: trimmedUrl,
          status: "pending",
          timestamp: new Date().toISOString(),
          problems: [],
          loading: true,
        },
        ...prevData,
      ]);

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
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.iconContainer}>
            <div className={styles.globeIcon}></div>
          </div>
          <h1 className={styles.title}>Spike AI Sales Demo</h1>
          <p className={styles.description}>
            Analyze your website for conversion optimization opportunities
          </p>
        </div>

        <div className={styles.content}>
          <form onSubmit={handleAnalyze} className={styles.inputContainer}>
            <input
              type="url"
              placeholder="Enter your website URL (e.g., https://example.com)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={styles.input}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading}
              className={styles.button}
            >
              {isLoading && <div className={styles.spinner}></div>}
              {isLoading ? "Analyzing..." : "Analyze"}
            </button>
          </form>

          {error && (
            <div className={styles.alert}>
              <div className={styles.alertIcon}>!</div>
              <p className={styles.alertText}>{error}</p>
            </div>
          )}

          {!isConnected && hasAttemptedConnection && (
            <div className={styles.alert}>
              <div className={styles.alertIcon}>⚠️</div>
              <p className={styles.alertText}>
                Connection lost. Attempting to reconnect...
              </p>
            </div>
          )}

          <div className={styles.resultsContainer}>
            <ResultsTable data={data} isLoading={isFetchingHistory} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyzePage;
