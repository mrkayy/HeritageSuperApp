package middleware

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"os"
	"time"

	"github.com/gin-gonic/gin"
)

// LogEntry represents a structured log line for request/response details.
type LogEntry struct {
	Timestamp    string `json:"timestamp"`
	ClientIP     string `json:"client_ip"`
	Method       string `json:"method"`
	URI          string `json:"uri"`
	Status       int    `json:"status"`
	LatencyMs    int64  `json:"latency_ms"`
	RequestBody  string `json:"request_body,omitempty"`
	ResponseBody string `json:"response_body,omitempty"`
	Error        string `json:"error,omitempty"`
}

type ginBodyLogWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w *ginBodyLogWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

func (w *ginBodyLogWriter) WriteString(s string) (int, error) {
	w.body.WriteString(s)
	return w.ResponseWriter.WriteString(s)
}

// RequestResponseLogger creates a middleware that logs all requests, responses,
// and their bodies to a file and stdout in a structured JSON format.
func RequestResponseLogger(logWriter io.Writer) gin.HandlerFunc {
	var writer io.Writer
	if logWriter != nil {
		writer = io.MultiWriter(os.Stdout, logWriter)
	} else {
		writer = os.Stdout
	}
	logger := log.New(writer, "", 0)

	return func(c *gin.Context) {
		req := c.Request

		// Read request body
		var reqBody []byte
		if req.Body != nil {
			reqBody, _ = io.ReadAll(req.Body)
			// Restore request body so other handlers can read it
			req.Body = io.NopCloser(bytes.NewBuffer(reqBody))
		}

		// Intercept response body
		resBodyBuf := new(bytes.Buffer)
		blw := &ginBodyLogWriter{ResponseWriter: c.Writer, body: resBodyBuf}
		c.Writer = blw

		start := time.Now()
		c.Next()
		latency := time.Since(start).Milliseconds()

		// Build log entry
		entry := LogEntry{
			Timestamp:    time.Now().Format(time.RFC3339),
			ClientIP:     c.ClientIP(),
			Method:       req.Method,
			URI:          req.RequestURI,
			Status:       c.Writer.Status(),
			LatencyMs:    latency,
			RequestBody:  string(reqBody),
			ResponseBody: resBodyBuf.String(),
		}

		// Clean up sensitive fields like passwords from the log payload
		entry.RequestBody = sanitizeJSON(entry.RequestBody)

		if len(c.Errors) > 0 {
			entry.Error = c.Errors.String()
		}

		logData, logErr := json.Marshal(entry)
		if logErr == nil {
			logger.Println(string(logData))
		} else {
			logger.Printf("Failed to marshal log entry: %v\n", logErr)
		}
	}
}

// sanitizeJSON redacts "password" field from request bodies to prevent security leaks
func sanitizeJSON(input string) string {
	var data map[string]interface{}
	if err := json.Unmarshal([]byte(input), &data); err != nil {
		return input // Return as-is if not valid JSON
	}

	redactFields := []string{"password", "password_hash", "token"}
	for _, field := range redactFields {
		if _, ok := data[field]; ok {
			data[field] = "[REDACTED]"
		}
	}

	sanitized, err := json.Marshal(data)
	if err != nil {
		return input
	}
	return string(sanitized)
}
