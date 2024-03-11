const EventEmitter = require('events')
const { WorldView } = require('./viewer/index')
const { cli } = require('webpack')

module.exports = (client, { viewDistance = 1, firstPerson = false, port = 3000, prefix = '' }) => {
    const express = require('express')
    const app = express()
    const http = require('http').createServer(app)
  
    const io = require('socket.io')(http, { path: prefix + '/socket.io' })
  
    const { setupRoutes } = require('./viewer/common')
    setupRoutes(app, prefix);

    const sockets = []
    const primitives = {}
  
    client.viewer = new EventEmitter()
  
    client.viewer.erase = (id) => {
        delete primitives[id]
        for (const socket of sockets) {
          socket.emit('primitive', { id })
        }
    }

    client.viewer.drawBoxGrid = (id, start, end, color = 'aqua') => {
        primitives[id] = { type: 'boxgrid', id, start, end, color }
        for (const socket of sockets) {
          socket.emit('primitive', primitives[id])
        }
    }

    client.viewer.drawLine = (id, points, color = 0xff0000) => {
        primitives[id] = { type: 'line', id, points, color }
        for (const socket of sockets) {
          socket.emit('primitive', primitives[id])
        }
    }
    
    client.viewer.drawPoints = (id, points, color = 0xff0000, size = 5) => {
        primitives[id] = { type: 'points', id, points, color, size }
        for (const socket of sockets) {
          socket.emit('primitive', primitives[id])
        }
    }
    
    io.on('connection', (socket) => {
        console.log("SOCKET CONNECTED!")
        socket.emit('version', '1.20.0')
        sockets.push(socket)

        const worldView = new WorldView(client.world, viewDistance, client.entity.position, socket)
        worldView.init(client.entity.position)
    
        worldView.on('blockClicked', (block, face, button) => {
            bot.viewer.emit('blockClicked', block, face, button)
        })

        for (const id in primitives) {
            socket.emit('primitive', primitives[id])
        }


        function botPosition () {
            const packet = { pos: client.entity.position, yaw: client.entity.yaw, addMesh: true }
            if (firstPerson) {
              packet.pitch = client.entity.pitch
            }
            socket.emit('position', packet)
            worldView.updatePosition(client.entity.position)
        }
       
        client.on('move', botPosition)
        worldView.listenToClient(client)
        
        socket.on('disconnect', () => {
            client.removeListener('move', botPosition)
            worldView.removeListenersFromBot(client)
            sockets.splice(sockets.indexOf(socket), 1)
          })
    })

    
    http.listen(port, () => {
        console.log(`Bedrock viewer web server running on *:${port}`)
    })

    client.viewer.close = () => {
        http.close()
        for (const socket of sockets) {
            socket.disconnect()
        }
    }
}