import server from '../dist/server/server.js'

export default {
  fetch(request: Request) {
    return server.fetch(request)
  },
}
