const battleship = require('./battleship.js')
const Promise = require('bluebird')


function create_user(uid) {
    var user = {}
    user.uid = uid
    return user
}

function get_user_from_db(db, uid, callback, create) {
    var users = Promise.promisifyAll(db.collection('users'))
    users.findOne({uid: uid})
    .then(doc => {
        if (!doc) {
            if (create) {
                users.insert(create_user(uid), {w:1})
                .then(() => get_user_from_db(db, uid, callback, false))
            }
        } else {
            callback(doc)
        }
    })
}

function get_game_from_db(db, uid1, uid2, callback, create) {
    var games = Promise.promisifyAll(db.collection("game"))
    var archive = Promise.promisifyAll(db.collection("archive"))
    games.findOne({uid1 : uid1, uid2: uid2})
    .then(doc => {
        if (!doc) {
            game = battleship.newGame()
            game.uid1 = uid1
            game.uid2 = uid2
            games.insert(game, {w:1})
            .then(() => get_game_from_db(db, uid1, uid2, callback, false))   
        } else {
            if (!create) {
                callback(doc)
                return
            }
            archive.insert(doc, {w:1})
            .then(doc => {
                return games.deleteOne(doc, {w:1})
            })
            .then(doc => {
                game = battleship.newGame()
                game.uid1 = uid1
                game.uid2 = uid2
                return games.insert(game, {w:1})
            })
            .then(() => get_game_from_db(db, uid1, uid2, callback, false))

        }
    })
}

module.exports = {create_user, get_user_from_db, get_game_from_db}
