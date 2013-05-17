var io = require('socket.io').listen(8001);

io.sockets.on('connection', function (socket) {
  socket.on('post', function (data) {
    io.sockets.emit('get', data);
  });
  socket.on('gotoNext', function() {
    io.sockets.emit('slideNext');
  });
  socket.on('gotoPrevious', function() {
    io.sockets.emit('slidePrevious');
  });
});
