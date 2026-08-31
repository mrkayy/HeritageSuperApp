package handler

import (
	"net/http"

	"github.com/hofchurchng/church-backend/app"
)

func Handler(w http.ResponseWriter, r *http.Request) {
	app.ServerlessHandler(w, r)
}
