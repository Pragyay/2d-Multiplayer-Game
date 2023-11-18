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

// receive event (updatePlayers) emitted from server
socket.on('updatePlayers', (backendPlayers) => {

  // add player
  for(const id in backendPlayers){
    const backendPlayer = backendPlayers[id]

    // if backendPlayer with this id does not exist on frontend
    if(!frontendPlayers[id]){
      frontendPlayers[id] = new Player({
        x: backendPlayer.x, 
        y: backendPlayer.y, 
        radius: 10, 
        color: backendPlayer.color
      })
    }
  }

  // delete player
  for(const id in frontendPlayers){

    // if player with this id does not exist on backend
    if(!backendPlayers[id]){
      delete frontendPlayers[id]  
    }
  }

  console.log(frontendPlayers);
})

let animationId

function animate() {
  animationId = requestAnimationFrame(animate)
  c.fillStyle = 'rgba(0, 0, 0, 0.1)'
  c.fillRect(0, 0, canvas.width, canvas.height)

  for(const id in frontendPlayers){
    const frontendPlayer = frontendPlayers[id]
    frontendPlayer.draw()
  }
}

animate()

