package errors

import (
	"fmt"
	"net/http"
)

type FieldError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

type APIError struct {
	HTTPStatus  int          `json:"-"`
	Code        string       `json:"code"`
	Message     string       `json:"message"`
	FieldErrors []FieldError `json:"field_errors,omitempty"`
	RequestID   string       `json:"request_id,omitempty"`
}

func (e *APIError) Error() string {
	return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

func NewBadRequest(code, message string, fieldErrors ...FieldError) *APIError {
	return &APIError{
		HTTPStatus:  http.StatusBadRequest,
		Code:        code,
		Message:     message,
		FieldErrors: fieldErrors,
	}
}

func NewUnauthorized(message string) *APIError {
	return &APIError{
		HTTPStatus: http.StatusUnauthorized,
		Code:       "UNAUTHORIZED",
		Message:    message,
	}
}

func NewForbidden(message string) *APIError {
	return &APIError{
		HTTPStatus: http.StatusForbidden,
		Code:       "FORBIDDEN",
		Message:    message,
	}
}

func NewNotFound(message string) *APIError {
	return &APIError{
		HTTPStatus: http.StatusNotFound,
		Code:       "NOT_FOUND",
		Message:    message,
	}
}

func NewConflict(code, message string) *APIError {
	return &APIError{
		HTTPStatus: http.StatusConflict,
		Code:       code,
		Message:    message,
	}
}

func NewUnprocessable(code, message string, fieldErrors ...FieldError) *APIError {
	return &APIError{
		HTTPStatus:  http.StatusUnprocessableEntity,
		Code:        code,
		Message:     message,
		FieldErrors: fieldErrors,
	}
}

func NewInternal(message string) *APIError {
	return &APIError{
		HTTPStatus: http.StatusInternalServerError,
		Code:       "INTERNAL_ERROR",
		Message:    message,
	}
}
