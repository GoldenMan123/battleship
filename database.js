const battleship = require('./battleship.js')


function create_user(uid) {
    var user = {}
    user.uid = uid
    return user
}

function get_user_from_db(db, uid, callback, create) {
    var users = db.collection('users')

    var getUser = new Promise(function(resolve, reject) {
        users.findOne({uid: uid}, function(err, doc) {
            if (!doc) {
                reject(err)
            } else {
                resolve(doc)
            }
        })
    })

    getUser.then(doc => callback(doc), () => {
        users.insert(create_user(uid), {w:1}, function(err, _) {
            if (!err) {
                get_user_from_db(db, uid, callback, false)
            }
        })
    })
}

function get_game_from_db(db, uid1, uid2, callback, create) {
    var games = db.collection("game")
    var archive = db.collection("archive")

    findGame = new Promise(function (resolve, reject) {
        games.findOne({uid1: uid1, uid2: uid2}, function (err, doc) {
            if (!doc) {
                reject(err)
            } else { 
                resolve(doc)
            }
        })
    })

    findGame.then(doc => {
        if (create) {
            archiveInsert = new Promise(function (resolve, reject) {
                archive.insert(doc, {w:1}, function (err, response) {
                    if (err) {
                        reject(err)
                    } else {
                        resolve(doc)
                    }
                })
            })
            archiveInsert.then(doc => {
                return new Promise(function (resolve, reject) {
                    games.deleteOne(doc, {w:1}, function (err, doc) {
                        if (err) {
                            reject(err)
                        } else {
                            resolve(doc)
                        }
                    })
                })
            }).then(doc => {
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
    }, () => {
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

module.exports = {create_user, get_user_from_db, get_game_from_db}
