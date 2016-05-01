const database = require('../database.js')
const mongo = require('mongodb')
const assert = require('assert')


describe("create_user", function() {
    it("Создание пользователя с заданным идентификатором", function() {
        user = database.create_user(0)
        assert.equal(user.uid, 0)
    })
})

describe("get_from_db", function() {
    var db = null
    beforeEach(function(done) {
        db = null
        mongo.connect("mongodb://localhost:27017/battleship_test", function(err, r) {
            if (!err) {
                db = r
                db.collection("game").drop()
                db.collection("archive").drop()
                db.collection("users").drop()
            }
            done()
        })
    })
    afterEach(function(done) {
        if (db) {
            db.dropDatabase(function(err, result) {
                done()
            })
        }
    })
    it("Успешное соединение с БД", function() {
        assert(db)
    })
    it("Добавление пользователя", function(done) {
        database.get_user_from_db(db, 1, function(user) {
            assert.equal(user.uid, 1)
            done()
        }, true)
    })
    it("Нахождение пользователей в БД", function(done) {
        database.get_user_from_db(db, 2, function(user) {
            database.get_user_from_db(db, 2, function(user) {
                assert(user.uid, 2)
                done()
            }, false)
        }, true)
    })
    it("Создание игры", function(done) {
        database.get_game_from_db(db, 0, 1, function(game) {
            assert(game)
            assert.equal(game.started, false)
            done()
        }, true)
    })
})

