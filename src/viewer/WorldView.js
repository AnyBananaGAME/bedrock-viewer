const EventEmitter = require('events')
const { chunkPos, ViewRect, spiral } = require('../simpleUtils')
const { Vec3 } = require('vec3')

class WorldView extends EventEmitter {
    constructor (world, viewDistance, position = new Vec3(0, 0, 0), emitter = null) {
        super()
        this.world = world
        this.viewDistance = viewDistance
        this.loadedChunks = {}
        this.lastPos = new Vec3(0, 0, 0).update(position)
        this.emitter = emitter || this
    }



    listenToClient (client) {
        const worldView = this
        this.listeners[client.entityId] = {
          add_entity: function (e) {
            if (e === bot.entity) return
            const height = e.getMetaDataValue("boundingbox_height");
            const width = e.getMetaDataValue("boundingbox_width");
              e.position.x = e.position.x+64;
              worldView.emitter.emit('entity', { id: String(e.runtime_id), name: e.type, pos: e.position, width: width, height: height, username: e.type })
            },
            move_entity: function (e) {
                worldView.emitter.emit('entity', { id: String(e.runtime_entity_id), pos: e.position, pitch: e.rotation.pitch, yaw: e.rotation.yaw })
            },
            remove_entity: function(e) {
                worldView.emitter.emit('entity', { id: String(e.entity_id_self), delete: true })
            },
            chunkColumnLoad: function (pos) {
                worldView.loadChunk(pos)
            },
            update_block: function (e) {
                worldView.emitter.emit('update_block', { pos: e.position, stateId: e.block_runtime_id})
            }
        }
        
        for (const [evt, listener] of Object.entries(this.listeners[client.entityId])) {
            client.on(evt, listener)
        }

        for (const id in client.data.entities) {
            const e = client.data.entities[id]
            if (e && e !== client.entity) {
              const height = e.getMetaDataValue("boundingbox_height");
              const width = e.getMetaDataValue("boundingbox_width");
              const name = e.getType();
              const pos = e.getPosition();
              pos.x = pos.x+64;
              this.emitter.emit('entity', { id: String(id), name: name, pos: pos, width: width, height: height, username: name});
            }
        }
    }

    
    removeListenersFromBot (client) {
        for (const [evt, listener] of Object.entries(this.listeners[client.entityId])) {
            client.removeListener(evt, listener)
        }
        delete this.listeners[client.entityId]
    }

    async init (pos) {
        const [clientX, clientZ] = chunkPos(pos)
        const positions = []
        spiral(this.viewDistance * 2, this.viewDistance * 2, (x, z) => {
            const p = new Vec3((clientX + x) * 16, 0, (clientZ + z) * 16)
            positions.push(p)
        })
    
        this.lastPos.update(pos)
        await this._loadChunks(positions)
    }

    async _loadChunks (positions, sliceSize = 5, waitTime = 0) {
        for (let i = 0; i < positions.length; i += sliceSize) {
          await new Promise((resolve) => setTimeout(resolve, waitTime))
          await Promise.all(positions.slice(i, i + sliceSize).map(p => this.loadChunk(p)))
        }
    }

    async loadChunk (pos) {
        const [botX, botZ] = chunkPos(this.lastPos)
        const dx = Math.abs(botX - Math.floor(pos.x / 16))
        const dz = Math.abs(botZ - Math.floor(pos.z / 16))
        if (dx < this.viewDistance && dz < this.viewDistance) {
          const column = await this.world.getColumnAt(pos)
          if (column) {
            const chunk = column.toJson()
            this.emitter.emit('loadChunk', { x: pos.x, z: pos.z, chunk })
            this.loadedChunks[`${pos.x},${pos.z}`] = true
          }
        }
    }

    unloadChunk (pos) {
        this.emitter.emit('unloadChunk', { x: pos.x, z: pos.z })
        delete this.loadedChunks[`${pos.x},${pos.z}`]
    }

    async updatePosition (pos, force = false) {
        const [lastX, lastZ] = chunkPos(this.lastPos)
        const [botX, botZ] = chunkPos(pos)

        if (lastX !== botX || lastZ !== botZ || force) {
          const newView = new ViewRect(botX, botZ, this.viewDistance)
          for (const coords of Object.keys(this.loadedChunks)) {
            const x = parseInt(coords.split(',')[0])
            const z = parseInt(coords.split(',')[1])
            const p = new Vec3(x, 0, z)
            if (!newView.contains(Math.floor(x / 16), Math.floor(z / 16))) {
              this.unloadChunk(p)
            }
          }
          const positions = []
          spiral(this.viewDistance * 2, this.viewDistance * 2, (x, z) => {
            const p = new Vec3((botX + x) * 16, 0, (botZ + z) * 16)
            if (!this.loadedChunks[`${p.x},${p.z}`]) {
              positions.push(p)
            }
          })
          this.lastPos.update(pos)
          await this._loadChunks(positions)
        } else {
          this.lastPos.update(pos)
        }
    }
}
module.exports = {WorldView}