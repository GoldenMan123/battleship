/// DEPENDENCES

var http = require('http')
var url = require('url')
var fs = require('fs')
var mongo = require('mongodb').MongoClient
var querystring = require('querystring')
var battleship = require('./battleship.js')
var ws = require('ws')
var https = require('https')


/// HTTP SERVER PART

function send_html(response, filename) {
    response.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' })
    var file = fs.createReadStream('./data/' + filename)
    file.pipe(response)
}

function send_css(response, filename) {
    response.writeHead(200, { 'Content-Type': 'text/css;charset=utf-8' })
    var file = fs.createReadStream('./data' + filename)
    file.pipe(response)
}

function send_png(response, filename) {
    response.writeHead(200, { 'Content-Type': 'image/png' })
    var file = fs.createReadStream('./data' + filename)
    file.pipe(response)
}

function send_js(response, filename) {
    response.writeHead(200, { 'Content-Type': 'text/javascript' })
    var file = fs.createReadStream('./data' + filename)
    file.pipe(response)
}

function server_callback(request, response) {
    var u = url.parse(request.url, true)
    if (request.method == 'GET') {
        if (u.pathname == '/') {
            send_html(response, 'index.html')
        } else if ((u.pathname == '/empty.png') ||
                   (u.pathname == '/hit.png') ||
                   (u.pathname == '/full.png') ||
                   (u.pathname == '/miss.png')) {
            send_png(response, u.pathname)
        } else if (u.pathname == '/main.css') {
            send_css(response, u.pathname)
        } else if (u.pathname == '/main.js') {
            send_js(response, u.pathname)
        } else {
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
    gamecopy.player = player
    if (player == 1) {
        gamecopy.player2grid = null
    } else if (player == 2) {
        gamecopy.player1grid = null
    }
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


/// DATABASE PART

function create_user(uid) {
    var user = {}
    user.uid = uid
    return user
}

function get_user_from_db(db, uid, callback, create) {
    var users = db.collection('users')
    users.findOne({uid: uid}, function (err, doc) {
        if (doc) {
            callback(doc)
        } else {
            if (create) {
                users.insert(create_user(uid), {w:1}, function(err, response) {
                    if (!err) {
                        get_user_from_db(db, uid, callback)
                    }
                })
            }
        }
    })
}

function get_game_from_db(db, uid1, uid2, callback, create) {
    var games = db.collection("game")
    games.findOne({uid1: uid1, uid2: uid2}, function (err, doc) {
        if (doc) {
            if (create) {
                games.deleteOne(doc, {w:1}, function (err, response) {
                    game = battleship.newGame()
                    game.uid1 = uid1
                    game.uid2 = uid2
                    games.insert(game, {w:1}, function (err, response) {
                        if (!err) {
                            get_game_from_db(db, uid1, uid2, callback, false)
                        }
                    })
                })    
            } else {
                callback(doc)
            }
        } else {
            game = battleship.newGame()
            game.uid1 = uid1
            game.uid2 = uid2
            games.insert(game, {w:1}, function (err, response) {
                if (!err) {
                    get_game_from_db(db, uid1, uid2, callback, false)
                }
            })
        }
    })
}

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
        ws.on('message', function (msg) {
            if (msg.length > 0) {
                if (msg[0] == '#') {
                    var hash = querystring.parse(msg.substr(1))
                    var token = hash.access_token
                    if (token) {
                        try {
                            https.get('https://api.vk.com/method/users.get?access_token=' + token, function (response) {
                                response.on('data', function(d) {
                                    try {
                                        vkres = JSON.parse(d.toString())
                                        if (vkres.response) {
                                            user = vkres.response[0]
                                            if (user.uid) {
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
                                        }
                                    } finally {
                                    }
                                })
                            })
                        } finally {}
                    }
                } else {
                    try {
                        var req = JSON.parse(msg)
                        if (req.action == 'getUsers') {
                            var list = []
                            for (i in user_table) {
                                list.push({'uid': i, 'info': user_info[i]})
                            }
                            if (ws.readyState == ws.OPEN) {
                                ws.send(JSON.stringify({'action': 'users', 'data': list}))
                            }
                        } else if (req.action == 'getGame') {
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
                                    selected_player = 1
                                    if (uid1 == +req.uid) {
                                        selected_player = 2
                                    }
                                    selected_game = game
                                    send_game(ws, selected_player, selected_game)
                                }, false)
                            }, false)
                        } else if (req.action == "finishgame") {
                            if (selected_game && ws_table[connection_id]) {
                                var uid1 = selected_game.uid1
                                var uid2 = selected_game.uid2
                                if (!selected_game.finished) {
                                    selected_game.finished = true
                                    selected_game.result = 3 - selected_player
                                    collection.updateOne({}, selected_game, function(err, results) {})
                                }
                                get_game_from_db(db, uid1, uid2, function(game) {
                                    send_gamerequest(uid1)
                                    send_gamerequest(uid2)
                                }, true)
                            }
                        } else if (req.action == "place") {
                            if ((req.x >= "0") && (req.x <= "9") && (req.y >= "0") &&
                                (req.y <= "9") && ((req.orientation == "0") ||
                                (req.orientation == "1")) && (req.ship >= "0") &&
                                (req.ship <= "9") && ws_table[connection_id] &&
                                selected_game) {
                                    battleship.placeShip(selected_game, selected_player, +req.ship, +req.orientation, +req.x, +req.y)
                                    collection.updateOne({}, selected_game, function(err, results) {
                                        send_gamerequest(selected_game.uid1)
                                        send_gamerequest(selected_game.uid2)
                                    })
                            }
                        } else if (req.action == "gameStart") {
                            if (selected_game) {
                                battleship.startGame(selected_game)
                                collection.updateOne({}, selected_game, function(err, results) {
                                    send_gamerequest(selected_game.uid1)
                                    send_gamerequest(selected_game.uid2)
                                })
                            }
                        } else if (req.action == "turn") {
                            if ((req.x >= "0") && (req.x <= "9") && (req.y >= "0") &&
                                (req.y <= "9") && selected_game) {
                                    battleship.doTurn(selected_game, selected_player, +req.x, +req.y)
                                    collection.updateOne({}, selected_game, function(err, results) {
                                        send_gamerequest(selected_game.uid1)
                                        send_gamerequest(selected_game.uid2)
                                    })
                            }
                        }
                    } finally {
                    }
                }
            }
        })
        ws.on('close', function () {
            if (ws_table[connection_id] && (ws == user_table[ws_table[connection_id]])) {
                delete user_table[ws_table[connection_id]]
                delete user_info[ws_table[connection_id]]
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

