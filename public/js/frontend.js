const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')

const socket = io();

const scoreEl = document.querySelector('#scoreEl')

canvas.width = innerWidth
canvas.height = innerHeight

const x = canvas.width / 2
const y = canvas.height / 2
 
// render all players onto the screen
const frontendPlayers = {}
const frontendProjectiles = {}

// receving projectiles from backend and dislpaying on frontend
socket.on('updateProjectiles', (backendProjectiles) => {
  for (const id in backendProjectiles) {
    const backendProjectile = backendProjectiles[id]

    // if backend projectile with this id not present in frontend,
    // create new projectile on frontend
    if (!frontendProjectiles[id]) {
      frontendProjectiles[id] = new Projectile({
        x: backendProjectile.x,
        y: backendProjectile.y,
        radius: 4,
        color: frontendPlayers[backendProjectile.playerId]?.color,
        velocity: backendProjectile.velocity
      })
    } 
    // else, just update position of projectile
    else {
      frontendProjectiles[id].x += backendProjectiles[id].velocity.x
      frontendProjectiles[id].y += backendProjectiles[id].velocity.y
    }
  }

  // check if any projectile deleted from backend, if yes, delete it from frontend as well
  for (const frontEndProjectileId in frontendProjectiles) {
    if (!backendProjectiles[frontEndProjectileId]) {
      delete frontendProjectiles[frontEndProjectileId]
    }
  }
})

// receive player info from backend and display on frontend
socket.on('updatePlayers', (backendPlayers) => {

  // add player
  for(const id in backendPlayers){
    const backendPlayer = backendPlayers[id]

    // if backendPlayer with this id does not exist on frontend, add to frontend
    if(!frontendPlayers[id]){
      frontendPlayers[id] = new Player({
        x: backendPlayer.x, 
        y: backendPlayer.y, 
        radius: 10, 
        color: backendPlayer.color,
        username: backendPlayer.username
      })

      document.querySelector(
        '#playerLabels'
      ).innerHTML += `<div data-id="${id}" data-score="${backendPlayer.score}">${backendPlayer.username}: ${backendPlayer.score}</div>`

    }
    // update scoreboard
    else {
      document.querySelector(
        `div[data-id="${id}"]`
      ).innerHTML = `${backendPlayer.username}: ${backendPlayer.score}`

      document
        .querySelector(`div[data-id="${id}"]`)
        .setAttribute('data-score', backendPlayer.score)

      // sorts the players divs
      const parentDiv = document.querySelector('#playerLabels')
      const childDivs = Array.from(parentDiv.querySelectorAll('div'))

      childDivs.sort((a, b) => {
        const scoreA = Number(a.getAttribute('data-score'))
        const scoreB = Number(b.getAttribute('data-score'))

        return scoreB - scoreA
      })

      // removes old elements
      childDivs.forEach((div) => {
        parentDiv.removeChild(div)
      })

      // adds sorted elements
      childDivs.forEach((div) => {
        parentDiv.appendChild(div)
      })

      // send the clients position to backend
      frontendPlayers[id].target = {
        x: backendPlayer.x,
        y: backendPlayer.y
      }

      if(id == socket.id){
        const lastBackendInputIndex = playerInputs.findIndex((input) => {
          return backendPlayer.sequenceNumber === input.sequenceNumber
        })

        if (lastBackendInputIndex > -1)
          playerInputs.splice(0, lastBackendInputIndex + 1)

        playerInputs.forEach((input) => {
          frontendPlayers[id].target.x += input.dx
          frontendPlayers[id].target.y += input.dy
        })
      }
    }
  }

  // delete player from frontend
  for(const id in frontendPlayers){

    // if player with this id does not exist on backend
    if(!backendPlayers[id]){
      const divToDelete = document.querySelector(`div[data-id="${id}"]`)
      divToDelete.parentNode.removeChild(divToDelete)

      if (id === socket.id) {
        document.querySelector('#usernameForm').style.display = 'block'
      }

      delete frontendPlayers[id]  
    }
  }

  // console.log(frontendPlayers);
})

let animationId

function animate() { 
  c.fillStyle = 'rgba(0,0,0,0.1)';
  c.fillRect(0,0,canvas.width,canvas.height)
  
  // render all players
  for(const id in frontendPlayers){
    const frontendPlayer = frontendPlayers[id]

     // linear interpolation
     if (frontendPlayer.target) {
      frontendPlayers[id].x +=
        (frontendPlayers[id].target.x - frontendPlayers[id].x) * 0.5
      frontendPlayers[id].y +=
        (frontendPlayers[id].target.y - frontendPlayers[id].y) * 0.5
    }

    frontendPlayer.draw()
  }
  
  // render all projectiles
  for (const id in frontendProjectiles) {
    const frontendProjectile = frontendProjectiles[id]
    frontendProjectile.draw()
  }

  requestAnimationFrame(animate)
}

animate()

const keys = {
  w: {
    pressed: false
  },
  a: {
    pressed: false
  },
  s: {
    pressed: false
  },
  d: {
    pressed: false
  }
}

// when key pressed, update position of player and projectiles on user's frontend and send updated position to backend
const SPEED = 5
const playerInputs = []
let sequenceNumber = 0
setInterval(() => {
  if (keys.w.pressed) {
    sequenceNumber++
    playerInputs.push({ sequenceNumber, dx: 0, dy: -SPEED })
    frontendPlayers[socket.id].y -= SPEED
    socket.emit('keydown', { keycode: 'KeyW', sequenceNumber })
  }

  if (keys.a.pressed) {
    sequenceNumber++
    playerInputs.push({ sequenceNumber, dx: -SPEED, dy: 0 })
    frontendPlayers[socket.id].x -= SPEED
    socket.emit('keydown', { keycode: 'KeyA', sequenceNumber })
  }

  if (keys.s.pressed) {
    sequenceNumber++
    playerInputs.push({ sequenceNumber, dx: 0, dy: SPEED })
    frontendPlayers[socket.id].y += SPEED
    socket.emit('keydown', { keycode: 'KeyS', sequenceNumber })
  }

  if (keys.d.pressed) {
    sequenceNumber++
    playerInputs.push({ sequenceNumber, dx: SPEED, dy: 0 })
    frontendPlayers[socket.id].x += SPEED
    socket.emit('keydown', { keycode: 'KeyD', sequenceNumber })
  }
}, 15)

// when key pressed
window.addEventListener('keydown', (event) => {
  if (!frontendPlayers[socket.id]) return

  switch (event.code) {
    case 'KeyW':
      keys.w.pressed = true
      break

    case 'KeyA':
      keys.a.pressed = true
      break

    case 'KeyS':
      keys.s.pressed = true
      break

    case 'KeyD':
      keys.d.pressed = true
      break
  }
})

// when key released
window.addEventListener('keyup', (event) => {
  if (!frontendPlayers[socket.id]) return

  switch (event.code) {
    case 'KeyW':
      keys.w.pressed = false
      break

    case 'KeyA':
      keys.a.pressed = false
      break

    case 'KeyS':
      keys.s.pressed = false
      break

    case 'KeyD':
      keys.d.pressed = false
      break
  }
})

// initialise game after getting name from user
document.querySelector('#usernameForm').addEventListener('submit', (event) => {
  event.preventDefault()

  // hide form when we click 'submit'
  document.querySelector('#usernameForm').style.display = 'none'
  socket.emit('initGame', {
    width: canvas.width,
    height: canvas.height,
    username: document.querySelector('#usernameInput').value
  })
})

