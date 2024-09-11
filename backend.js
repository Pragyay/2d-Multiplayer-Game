//install and get our app running on express
const express = require('express')
const app = express()

//socket.io setup
//creating a http server and wrapping it around our express server so we can use express functionalities
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {pingInterval: 2000, pingTimeout: 5000});

const port = 3000;

app.use(express.static('public'))

//serve html file
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html')
})

const backendPlayers = {}
const backendProjectiles = {}

const SPEED = 5
const RADIUS = 10
const PROJECTILE_RADIUS = 3
let projectileId = 0

io.on('connection', (socket) => {
  console.log('a user connected')

  //emit event from server to every player
  io.emit('updatePlayers', backendPlayers)

  // when player shoots
  socket.on('shoot', ({ x, y, angle }) => {
    projectileId++

    const velocity = {
      x: Math.cos(angle) * 2,
      y: Math.sin(angle) * 2
    }

    backendProjectiles[projectileId] = {
      x,
      y,
      velocity,
      playerId: socket.id
    }

    console.log(backendProjectiles)
  })


  // when user submits their name
  socket.on('initGame', ({ username, width, height}) => {
    backendPlayers[socket.id] = {
      x: 500 * Math.random(),
      y: 500 * Math.random(),
      color: `hsl(${360 * Math.random()}, 100%, 50%)`,
      sequenceNumber: 0,
      score: 0,
      username
    }

    // where we init our canvas
    backendPlayers[socket.id].canvas = {
      width,
      height
    }

    backendPlayers[socket.id].radius = RADIUS

  })


  // in case a player disconnects
  socket.on('disconnect', (reason) => {
    console.log(reason)

    // remove disconnected player from backend
    delete backendPlayers[socket.id]
    
    // emit event to delete disconnected player from frontend
    io.emit('updatePlayers', backendPlayers)
  })

  // listen to keydown event from frontend, and update player position at server
  socket.on('keydown', ({ keycode, sequenceNumber }) => {

    if (!backendPlayers[socket.id]) return

    backendPlayers[socket.id].sequenceNumber = sequenceNumber

    switch (keycode) {

      case 'KeyW':
        backendPlayers[socket.id].y -= SPEED
        break

      case 'KeyA':
        backendPlayers[socket.id].x -= SPEED
        break

      case 'KeyS':
        backendPlayers[socket.id].y += SPEED
        break

      case 'KeyD': 
        backendPlayers[socket.id].x += SPEED
        break
    }
  })

  // emit player and projectiles positions to frontend every 15 ms 
  // also, check for collision detections
  setInterval(() => {
     // update projectile positions
  for (const id in backendProjectiles) {

    // update position
    backendProjectiles[id].x += backendProjectiles[id].velocity.x
    backendProjectiles[id].y += backendProjectiles[id].velocity.y

    const PROJECTILE_RADIUS = 4

    // if player hit with projectile
    if (
      backendProjectiles[id].x - PROJECTILE_RADIUS >=
        backendPlayers[backendProjectiles[id].playerId]?.canvas?.width ||
      backendProjectiles[id].x + PROJECTILE_RADIUS <= 0 ||
      backendProjectiles[id].y - PROJECTILE_RADIUS >=
        backendPlayers[backendProjectiles[id].playerId]?.canvas?.height ||
      backendProjectiles[id].y + PROJECTILE_RADIUS <= 0
    ) {
      // increase score of player
      backendProjectiles[id].score++
      continue
    }

    // updating scoreboard
    for (const playerId in backendPlayers) {
      const backendPlayer = backendPlayers[playerId]

      const DISTANCE = Math.hypot(
        backendProjectiles[id].x - backendPlayer.x,
        backendProjectiles[id].y - backendPlayer.y
      )
      
      // garbage collection 
      if ( DISTANCE < PROJECTILE_RADIUS + backendPlayer.radius &&
          backendProjectiles[id].playerId !== playerId) {

        // if projectile hits player, update score
        if (backendPlayers[backendProjectiles[id].playerId])
          backendPlayers[backendProjectiles[id].playerId].score++

        console.log(backendPlayers[backendProjectiles[id].playerId])

        /// delete projectile that has collided or moved out of screen
        delete backendProjectiles[id]
        break
      }
    }
  }

  io.emit('updateProjectiles', backendProjectiles)
    io.emit('updatePlayers', backendPlayers)
  }, 15)

})

server.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

