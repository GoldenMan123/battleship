/// DEPENDENCES

const http = require('http')
const url = require('url')
const fs = require('fs')
const mongo = require('mongodb').MongoClient
const querystring = require('querystring')
const battleship = require('./battleship.js')
const ws = require('ws')
const https = require('https')
const concat = require('concat-stream')
const database = require('./database.js')

const create_user = database.create_user
const get_user_from_db = database.get_user_from_db
const get_game_from_db = database.get_game_from_db

/// HTTP SERVER PART

function authorize_vk(code, response) {
    https.get("https://oauth.vk.com/access_token?client_id=5422303&client_secret=SECRET&redirect_uri=http://localhost:8080&code=" + code, function(vk_res) {
        vk_res.pipe(concat(function (d) {
            try {
                token = JSON.parse(d.toString()).access_token
                response.writeHead(301,
                  { Location: 'http://localhost:8080/#access_token=' + token }
                )
            } finally {
                response.end()
            }
        }))
    })
}

function http_send(response, filename, mimetype) {
    response.writeHead(200, { 'Content-Type' : mimetype })
    var file = fs.createReadStream('./data' + filename)
    file.pipe(response)
}

function server_callback(request, response) {
    const files = {
        '/index.html' : 'text/html;charset=utf-8',
        '/empty.png' : 'image/png',
        '/hit.png' : 'image/png',
        '/full.png' : 'image/png',
        '/miss.png' : 'image/png',
        '/main.css' : 'text/css;charset=utf-8',
        '/main.js' : 'text/javascript'
    }

    var u = url.parse(request.url, true)
    if (request.method == 'GET') {
        var file = null
        if (u.pathname == '/') {
            if (u.query.code) {
                authorize_vk(u.query.code, response)
                return
            }
            file = '/index.html'
        }
        if (u.pathname in files) {
            file = u.pathname
        }
        if (file) {
            http_send(response, file, files[file])
        }  else {
            response.writeHead(404)
            response.end()
        }
    } else {
        response.end()
    }
}


/// GAME SERVER PART

function send_game(ws, player, game) {
    gamecopy = JSON.parse(JSON.stringify(game))
    gamecopy.myplayer = player
    gamecopy.player[1 - player].grid = null
    if (ws.readyState == ws.OPEN) {
        ws.send(JSON.stringify({'action': 'game', 'game': gamecopy, 'player': player}))
    }
}

function broadcast_users(user_table, user_info) {
    var list = []
    for (i in user_table) {
        list.push({'uid': i, 'info': user_info[i]})
    }
    for (i in user_table) {
        var ws = user_table[i]
        if (ws && (ws.readyState == ws.OPEN)) {
            ws.send(JSON.stringify({'action': 'users', 'data': list}))
        }
    }
}


/// START SERVER

mongo.connect("mongodb://localhost:27017/battleship", function (err, db) {
    if (err) {
        return console.dir(err)
    }

    var collection = db.collection("game")
    
    var server = http.createServer(function (req, res) {
        server_callback(req, res)
    })

    var webserver = new ws.Server({server: server})
    var ws_table = {}
    var user_table = {}
    var user_info = {}
    var next_id = 0

    function send_gamerequest(uid) {
        var ws = user_table[uid]
        if (ws && ws.readyState == ws.OPEN) {
            ws.send(JSON.stringify({'action': 'gamerequest'}))
        }
    }

    webserver.on('connection', function (ws) {
        var connection_id = next_id++
        var selected_game = null
        var selected_player = null

        const action_handlers = {
            'getUsers' : function (req) {
                var list = []
                for (i in user_table) {
                    list.push({'uid': i, 'info': user_info[i]})
                }
                if (ws.readyState == ws.OPEN) {
                    ws.send(JSON.stringify({'action': 'users', 'data': list}))
                }
            },
            'getGame' : function (req) {
                if (!ws_table[connection_id]) {
                    return
                }
                if (!req.uid) {
                    return
                }
                if (req.uid == ws_table[connection_id]) {
                    return
                }
                get_user_from_db(db, +req.uid, function(user) {
                    var uid1 = +req.uid
                    var uid2 = +ws_table[connection_id]
                    if (uid2 < uid1) {
                        var c = uid2
                        uid2 = uid1
                        uid1 = c
                    }
                    get_game_from_db(db, uid1, uid2, function(game) {
                        selected_player = 0
                        if (uid1 == +req.uid) {
                            selected_player = 1
                        }
                        selected_game = game
                        send_game(ws, selected_player, selected_game)
                    }, false)
                }, false)
            },
            'finishgame' : function (req) {
                if (selected_game && ws_table[connection_id]) {
                    var uid1 = selected_game.uid1
                    var uid2 = selected_game.uid2
                    if (!selected_game.finished) {
                        selected_game.finished = true
                        selected_game.result = 1 - selected_player
                        collection.updateOne({_id: selected_game._id}, selected_game, function(err, results) {})
                    }
                    get_game_from_db(db, uid1, uid2, function(game) {
                        send_gamerequest(uid1)
                        send_gamerequest(uid2)
                    }, true)
                }
            },
            'place' : function (req) {
                if ((req.x >= "0") && (req.x <= "9") && (req.y >= "0") &&
                    (req.y <= "9") && ((req.orientation == "0") ||
                    (req.orientation == "1")) && (req.ship >= "0") &&
                    (req.ship <= "9") && ws_table[connection_id] &&
                    selected_game) {
                        battleship.placeShip(selected_game, selected_player, +req.ship, +req.orientation, +req.x, +req.y)
                        collection.updateOne({_id: selected_game._id}, selected_game, function(err, results) {
                            send_gamerequest(selected_game.uid1)
                            send_gamerequest(selected_game.uid2)
                        })
                }
            },
            'gameStart' : function (req) {
                if (selected_game) {
                    battleship.startGame(selected_game)
                    collection.updateOne({_id: selected_game._id}, selected_game, function(err, results) {
                        send_gamerequest(selected_game.uid1)
                        send_gamerequest(selected_game.uid2)
                    })
                } 
            },
            'turn' : function (req) {
                if ((req.x >= "0") && (req.x <= "9") && (req.y >= "0") &&
                    (req.y <= "9") && selected_game) {
                        battleship.doTurn(selected_game, selected_player, +req.x, +req.y)
                        collection.updateOne({_id: selected_game._id}, selected_game, function(err, results) {
                            send_gamerequest(selected_game.uid1)
                            send_gamerequest(selected_game.uid2)
                        })
                }
            }
        }

        function user_login(user) {
            ws_table[connection_id] = user.uid
            if (user_table[user.uid]) {
                if (ws.readyState == ws.OPEN) {
                    user_table[user.uid].close()
                }
            }
            user_table[user.uid] = ws
            user_info[user.uid] = {'first_name': user.first_name, 'last_name': user.last_name}
            get_user_from_db(db, user.uid, function() {
                if (ws.readyState == ws.OPEN) {
                    console.log(String(user.uid) + ": log in")
                    ws.send(JSON.stringify({'action': 'auth', 'uid': user.uid,
                        'first_name': user.first_name, 'last_name': user.last_name}))
                    broadcast_users(user_table, user_info)
                }
            }, true)
        }

        ws.on('message', function (msg) {
            if (msg.length == 0) {
                return
            }
            if (msg[0] == '#') {
                var hash = querystring.parse(msg.substr(1))
                var token = hash.access_token
                if (!token) {
                    return
                }
                try {
                    https.get('https://api.vk.com/method/users.get?access_token=' + token, function (response) {
                        response.pipe(concat(function(d) {
                            try {
                                vkres = JSON.parse(d.toString())
                                if (vkres.response) {
                                    user = vkres.response[0]
                                    if (user.uid) {
                                        user_login(user) 
                                    }
                                }
                            } finally {}
                        }))
                    })
                } finally {}
            } else {
                try {
                    var req = JSON.parse(msg)
                    if (req.action in action_handlers) {
                        action_handlers[req.action](req)
                    }
                } finally {}
            }
        })
        ws.on('close', function () {
            if (ws_table[connection_id] && (ws == user_table[ws_table[connection_id]])) {
                delete user_table[ws_table[connection_id]]
                delete user_info[ws_table[connection_id]]
                broadcast_users(user_table, user_info)
            }
            if (ws_table[connection_id]) {
                console.log(String(ws_table[connection_id] + ": log out"))
            }
            delete ws_table[connection_id]
        }) 
        ws.on('error', function(err) {
        })
    })
    server.listen(8080)
})

