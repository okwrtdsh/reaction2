var fs = require("fs");
var http = require("http");
var socketio = require("socket.io");
var sleep = require('sleep-async')();
var io;
var config;
var startTime;
var stopTime;
var isInQuestion = false;
var questionType = 0;
var question;
var questionAnswer;
var logFile;
var cnt = 0;

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
    if(err){
      console.log(err);
      process.exit();
    }
    try{
      config = JSON.parse(content.toString());
      //console.log(config);
      setupServer();
    }
    catch(error){
      console.log(error);
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
  if(questionType == 0){
    var s = "ABEFGHMPRTabefghmprt";
    question = s[Math.floor(Math.random() * s.length)];
    return question;
  }
  else if(questionType == 1){
    var s = "ABEFGHMPRTadefghmprt";
    if(Math.floor(Math.random()+0.5)){
      questionAnswer = true;
      var c = s[Math.floor(Math.random() * s.length)];
      question = c + " " + c;
      return question;
    }
    else{
      questionAnswer = false;
      var rnd = Math.floor(Math.random() * s.length);
      var rnd2 = Math.floor(Math.random() * s.length);
      while(rnd == rnd2){
        rnd2 = Math.floor(Math.random() * s.length);
      }
      question = s[rnd] + " " + s[rnd2];
      return question;
    }
  }
  else if(questionType == 2){
    var s = "ABEFGHMPRTabefghmprt";
    if(Math.floor(Math.random()+0.5)){
      questionAnswer = true;
      var rnd = Math.floor(Math.random() * s.length);
      var rnd2 = Math.floor(Math.random() + 0.5);
      question = s[rnd] + " " + s[(rnd + (s.length / 2) * rnd2) % (s.length)];
      return question;
    }
    else{
      questionAnswer = false;
      var rnd = Math.floor(Math.random() * s.length);
      var rnd2 = Math.floor(Math.random() * s.length);
      while(s[rnd].toLowerCase() == s[rnd2].toLowerCase()){
        rnd2 = Math.floor(Math.random() * s.length);
      }
      question = s[rnd] + " " + s[rnd2];
      return question;
    }
  }
  else if(questionType == 3){
    if(Math.floor(Math.random()+0.5)){
      questionAnswer = true;
      var rnd = Math.floor(Math.random() * 3);
      if(rnd == 0){
        var s = "ABEFGHMPRT";
        question = s[Math.floor(Math.random() * s.length)] + " " + s[Math.floor(Math.random() * s.length)];
        return question;
      }
      else if(rnd == 1){
        var s = "abefghmprt";
        question = s[Math.floor(Math.random() * s.length)] + " " + s[Math.floor(Math.random() * s.length)];
        return question;
      }
      else if(rnd == 2){
        var s = "!@#$%&*+=?";
        question = s[Math.floor(Math.random() * s.length)] + " " + s[Math.floor(Math.random() * s.length)];
        return question;
      }
    }
    else{
      var s = "ABEFGHMPRTabefghmprt!@#$%&*+=?";
      questionAnswer = false;
      var rnd = Math.floor(Math.random() * s.length);
      if(rnd < 10){
        var rnd2 = 10 + Math.floor(Math.random() * 20);
      }
      else if(rnd < 20){
        var rnd2 = (20 + Math.floor(Math.random() * 20)) % s.length;
      }
      else{
        var rnd2 = Math.floor(Math.random() * 20);
      }
      question = s[rnd] + " " + s[rnd];
      return question;
    }
  }
}

function writeLog(result, data){
  if(questionType == 0){
    var s = '' + result.time + ',' + questionType + ',"' + question + '",,,';
  }
  else{
    var s = '' + result.time + ',' + questionType + ',"' + question + '",'
    + questionAnswer + ',' + data + ','+ (questionAnswer == data);
  }
  console.log(s);
  fs.appendFile(logFile, s + '\n','utf8', function (err) {
    if(err){
      throw err;
      process.exit();
    }
  });
}

function setupServer(){
  var date = new Date();
  logFile = "./log/" + date.toISOString() + ".csv";
  fs.writeFile(
    logFile,
    '"elapsedTime","questionType","question","expectedAnswer","Answer","isCorrect"\n',
    function (err) {
      if(err){
        throw err;
        process.exit();
      }
    }
  );
  var server = http.createServer(function(req, res){
    res.writeHead(200, {"Content-Type": "text/html"});
    var output = fs.readFileSync(config.http.html_path, "utf-8");
    res.end(output);
  }).listen(config.http.port);
  io = socketio.listen(server);
  io.sockets.on("connection", function(socket){
    socket.on("start", function(){
      io.sockets.emit("msg", 3);
      sleep.sleep(1000, function(){
        io.sockets.emit("msg", 2);
      });
      sleep.sleep(2000, function(){
        io.sockets.emit("msg", 1);
      });
      sleep.sleep(3000, function(){
        io.sockets.emit("msg", 0);
      });
      sleep.sleep(4000, function(){
        io.sockets.emit("msg", "");
      });
      sleep.sleep(4000 + Math.random() * 2000, function(){
        startTime = new Date();
        isInQuestion = true;
        cnt = 0;
        io.sockets.emit("question", getQuestion());
      });
    });
    socket.on("answer", function(data){
      if(isInQuestion){
        stopTime = new Date();
        var result = getElapsedTime(startTime, stopTime);
        //console.log(result.elapsedTime, result.time);
        io.sockets.emit("msg", "");
        isInQuestion = false;
        if(++cnt > 100){
          io.sockets.emit("msg", "finish");
          io.sockets.emit("finish");
          return;
        }
        writeLog(result, data);
        sleep.sleep(Math.random() * 2000 + 1000, function(){
          startTime = new Date();
          isInQuestion = true;
          io.sockets.emit("question", getQuestion());
        });
      }
    });
    socket.on("finish", function(){
      if(isInQuestion){
        io.sockets.emit("msg", "finish");
        isInQuestion = false;
      }
    });
    socket.on("change", function(){
      if(!isInQuestion){
        questionType = (questionType + 1) % 4;
        io.sockets.emit("msg", "Question Type: " + questionType);
      }
    });
    socket.on('msg', function(data) {
      io.sockets.emit('msg', data);
    });
  });
}

