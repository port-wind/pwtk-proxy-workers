import { html } from 'hono/html'

export const Template = html`
  <!DOCTYPE html>
  <html>
    <body>
      <div id="id_tag"></div>
      <div id="output_div"></div>
      <script type="text/javascript">
        let currentWebSocket = null

        const id = Math.random().toString(36).substring(7)

        const hostname = window.location.host
        const protocol = window.location.protocol
        const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:'

        const outputDiv = document.getElementById('output_div')
        const idTagDiv = document.getElementById('id_tag')

        idTagDiv.innerText = 'id: ' + id

        function insertMessage(message) {
          console.log(message)
          const span = document.createElement('span')
          span.innerText = message.timestamp + ': '
          const p = document.createElement('p')
          const formattedData = JSON.stringify(message.data, null, 2)
          p.innerText = formattedData
          p.prepend(span)
          outputDiv.appendChild(p)
        }

        function join() {
          const ws = new WebSocket(wsProtocol + '//' + hostname + '/notifications/websocket?id=' + id)
          let rejoined = false
          const startTime = Date.now()

          ws.addEventListener('open', event => {
            currentWebSocket = ws
          })

          ws.addEventListener('message', event => {
            insertMessage(JSON.parse(event.data))
            // insertMessage(event.data)
          })

          ws.addEventListener('close', event => {
            console.log('WebSocket closed, reconnecting:', event.code, event.reason)
            rejoin()
          })

          ws.addEventListener('error', event => {
            console.log('WebSocket  error, reconnecting:', event)
            rejoin()
          })

          const rejoin = async () => {
            if (!rejoined) {
              rejoined = true
              currentWebSocket = null

              let timeSinceLastJoin = Date.now() - startTime
              if (timeSinceLastJoin < 5000) {
                await new Promise(resolve => setTimeout(resolve, 5000 - timeSinceLastJoin))
              }

              join()
            }
          }
        }

        join()
      </script>
    </body>
  </html>
`
