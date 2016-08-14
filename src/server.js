var fs = require("fs");
var http = require("http");
var socketio = require("socket.io");
var sleep = require('sleep-async')();
var io;
var config;
var startTime;
var stopTime;
var isInQuestion = false;
var question;
var logFile;
var cnt = 0;
var MAX = 100;

if (!Number.prototype.timeFormat) {
  Number.prototype.timeFormat = function timeFormat(){
    var time = this;
    var HH = Math.floor(time / (60 * 60 * 1000));
    time -= HH * 60 * 60 * 1000;
    var MM = Math.floor(time / (60 * 1000));
    time -= MM * 60 * 1000;
    var SS = Math.floor(time / 1000);
    var MS = time % 1000;
    return ""
        + (HH < 10 ? "0" + HH: HH)
        + ":" + (MM < 10 ? "0" + MM: MM)
        + ":" + (SS < 10 ? "0" + SS: SS)
        + "." + Array(3-MS.toString().length+1).join('0') + MS;
  };
}

main();

function main(){
  fs.readFile("./config.json", function (err, content){
    if(err) {
      throw err;
      process.exit();
    }
    try{
      config = JSON.parse(content.toString());
      //console.log(config);
      setupServer();
    }
    catch(err){
      throw err;
      process.exit();
    }
  });
}

function getElapsedTime(s, e){
  var time = e.getTime() - s.getTime();
  return {
    elapsedTime: time.timeFormat(),
    time: time
  };
  return time.timeFormat();
}

function getQuestion(){
  var s = "LR";
  question = s[Math.floor(Math.random()+0.5)];
  return question;
}

function writeLog(result, data){
  var s = '' + result.time + ',"' + question + '","' + data + '",'+ (question==data);
  console.log(s);
  fs.appendFile(logFile, s + '\n','utf8', function(err){
    if(err){
      console.log(err);
      process.exit();
    }
  });
}

function setupServer(){
  var date = new Date();
  logFile = "./log/" + date.toISOString() + ".csv";
  fs.writeFile(logFile, '"elapsedTime","question","Answer","isCorrect"\n', function(err){
    if(err){
      console.log(err);
      process.exit();
    }
  });
  var server = http.createServer(function(req, res){
    res.writeHead(200, {"Content-Type": "text/html"});
    var output = fs.readFileSync(config.http.html_path, "utf-8");
    res.end(output);
  }).listen(config.http.port);
  io = socketio.listen(server);
  io.sockets.on("connection", function(socket){
    socket.on('start', function(data) {
      if(isInQuestion) return;
      io.sockets.emit("question", getQuestion());
      startTime = new Date();
      isInQuestion = true;
    });
    socket.on("stop", function(data){
      if(!isInQuestion) return;
      stopTime = new Date();
      isInQuestion = false;
      var result = getElapsedTime(startTime, stopTime);
      //console.log(result.elapsedTime, result.time);
      io.sockets.emit("reset", "");
      writeLog(result, data);
      if(++cnt >= MAX){
        io.sockets.emit("finish", "");
      }
    });
    socket.on('msg', function(data) {
      io.sockets.emit('msg', data);
    });
    socket.on('finish', function(data) {
      io.sockets.emit('msg', "finish");
    });
  });
}

