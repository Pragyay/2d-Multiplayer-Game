//install and get our app running on express
const express = require('express')
const app = express()

//socket.io setup
//creating a http server and wrapping it around our express server so we can use express functionalities
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {pingInterval: 2000, pingTimeout: 5000});

const port = 3000

app.use(express.static('public'))

//serve html file
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html')
})

const backendPlayers = {}

io.on('connection', (socket) => {
  console.log('a user connected')
  backendPlayers[socket.id] = {
    x: 500*Math.random(),
    y: 500*Math.random(),
    color: `hsl(${360*Math.random()}, 100%, 50%)`
  }

  //emit event from server to every player
  io.emit('updatePlayers', backendPlayers)

  // in case a player disconnects
  socket.on('disconnect', (reason) => {
    console.log(reason)

    // remove disconnected player from backend
    delete backendPlayers[socket.id]
    
    // emit event to delete disconnected player from frontend
    io.emit('updatePlayers', backendPlayers)
  })

  console.log(backendPlayers);

});

server.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

