const express = require('express');
const app = express();

var mysql = require('mysql');

const conInfo = 
{
  host: process.env.IP,
  user: process.env.C9_USER,
  password: "",
  database: "STATSDB"
};

// install session module first using 'npm install express-session'
var session = require('express-session'); 
app.use(session({ secret: 'happy jungle', 
                  resave: false, 
                  saveUninitialized: false, 
                  cookie: { maxAge: 60000 }}))

app.get('/', instructions);                  
app.get('/game', game);
app.get('/stats', stats);
app.listen(process.env.PORT,  process.env.IP, startHandler())

function startHandler()
{
  console.log('Server listening on port ' + process.env.PORT)
}

function game(req, res)
{
  let result = {};
  try
  {
        // if we have not picked a secret number, restart the game...
        if (req.session.answer == undefined)
        {
          req.session.guesses = 0;
          req.session.answer = Math.floor(Math.random() * 100) + 1;
        }
          
        // if a guess was not made, restart the game...
        if (req.query.guess == undefined)
        {
         // writeResult(req,res, {'gameStatus' : 'Pick a number from 1 to 100.'}); 
          req.session.guesses = 0;
          req.session.answer = Math.floor(Math.random() * 100) + 1;
          writeResult(req,res, {'gameStatus' : 'Pick a number from 1 to 100.'}); 
        }
        // a guess was made, check to see if it is correct...
        else if (req.query.guess == req.session.answer)
        {
          req.session.guesses = req.session.guesses + 1;
          //writeResult(req,res,{'gameStatus' : `Correct! It took you ${req.session.guesses} guesses. Play Again!`});
          //req.session.answer = undefined;
          
          var con = mysql.createConnection(conInfo);
          con.connect(function(e)
          {
            con.query('INSERT INTO STATS (GUESS) VALUES (?)', [req.session.guesses], function(e, result, fields)
            {
              
              writeResult(req,res,{'gameStatus' : `Correct! It took you ${req.session.guesses} guesses. Play Again!`});
              req.session.answer = undefined;
              
            });
          });
        }
        // a guess was made, check to see if too high...
        else if (req.query.guess > req.session.answer)
        {
          req.session.guesses = req.session.guesses + 1;
          writeResult(req,res,{'gameStatus' : 'To High. Guess Again!', 'guesses' : req.session.guesses}); 
        }
        // a guess was made, it must be too low...
        else
        {
          req.session.guesses = req.session.guesses + 1;
          writeResult(req,res,{'gameStatus' : 'To Low. Guess Again!', 'guesses' : req.session.guesses}); 
        }
  }
  catch (e)
  {
    writeResult(req,res,{'error' : e.message});
  }
  /*
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.write(JSON.stringify(result));
  res.end('');
  */
}

function stats(req,res)
{
  let result = {};
  
  var con = mysql.createConnection(conInfo);
  con.connect(function(e) 
  {
    con.query("SELECT MIN(GUESS) AS A FROM STATS", function (e, result1, fields)
    {
      con.query("SELECT MAX(GUESS) AS B FROM STATS", function (e, result2, fields)
      {
        con.query("SELECT COUNT(GUESS) AS  C FROM STATS", function (e, result3, fields)
        {
            result ={"result" : {"Best" : result1[0].A, "Worst" : result2[0].B, "gamesPlayed" : result3[0].C}};
            writeResult(req, res, result); 
          //writeResult(req,res,{"Best" : result1[0].A, "Worst" : result2[0].B, "gamesPlayed" : result3[0].C});
        });
      });
    });
  });
}

function writeResult(req,res,obj)
{
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.write(JSON.stringify(obj));
  res.end('');
}

function instructions(req, res)
{
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.write("<h1>Number Guessing Game</h1>");
  res.write("<p>Use /game to start a new game.</p>");
  res.write("<p>Use /game?guess=num to make a guess.</p>");
  res.end('');
}