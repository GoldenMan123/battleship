const battleship = require('./battleship.js')


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
    var archive = db.collection("archive")
    games.findOne({uid1: uid1, uid2: uid2}, function (err, doc) {
        if (doc) {
            if (create) {
                archive.insert(doc, {w:1}, function (err, response) {
                    if (!err) {
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
                    }
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

module.exports = {create_user, get_user_from_db, get_game_from_db}
