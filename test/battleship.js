var battleship = require('../battleship.js')
assert = require('assert')

function testemptygrid(grid) {
    assert.equal(grid.length, 10)
    for (var i = 0; i < 10; ++i) {
        assert.equal(grid[i].length, 10)
        for (var j = 0; j < 10; ++j) {
            assert.equal(grid[i][j], 0)
        }
    }
}

function testemptyshiparray(sa) {
    assert.equal(sa.length, 10)
    for (var i = 0; i < 10; ++i) {
        assert.equal(sa[i], 0)
    }
}

function fillgame(game) {
    for (var i = 0; i < 10; ++i) {
        x = i * 2
        y = 0 
        if (x > 9) {
            x -= 9
            y += 5
        }
        assert.equal(battleship.placeShip(game, 1, i, 1, x, y), true)
        assert.equal(battleship.placeShip(game, 2, i, 1, x, y), true)
    }
}

describe("newGame", function() {
    var game = null
    before(function() {
        game = battleship.newGame()
    })
    it("Игровое поле должно быть пустым", function () {
        testemptygrid(game.player1grid)        
        testemptygrid(game.player2grid)        
        testemptygrid(game.player1view)        
        testemptygrid(game.player2view)        
        testemptyshiparray(game.player1ships)
        testemptyshiparray(game.player2ships)
    })
    it("Игра не должна быть начата и завершена", function () {
        assert.equal(game.started, false)
        assert.equal(game.finished, false)
        assert.equal(game.result, null)
    })
    it("Списки ходов должны быть пустыми", function () {
        assert.equal(game.player1turns.length, 0)
        assert.equal(game.player2turns.length, 0)
    })
})

describe("placeShip", function() {
    var game = null
    before(function() {
        game = battleship.newGame()
    })
    it("Нельзя размещать корабли за пределами поля", function () {
        assert.equal(battleship.placeShip(game, 1, 10, 0, 10, 10), false)
        assert.equal(battleship.placeShip(game, 1, 10, 0, -10, -10), false)
    })
    it("Нельзя размещать один и тот же корабль дважды", function() {
        assert.equal(battleship.placeShip(game, 1, 0, 0, 0, 0), true)
        assert.equal(battleship.placeShip(game, 1, 0, 0, 5, 5), false)
    })
    it("Нельзя размещать корабли рядом", function() {
        assert.equal(battleship.placeShip(game, 1, 9, 0, 5, 5), true)
        assert.equal(battleship.placeShip(game, 1, 10, 0, 6, 6), false)
    })
    it("Должен заполняться список кораблей у игроков", function() {
        assert.equal(battleship.placeShip(game, 2, 0, 0, 0, 0), true)
        assert.equal(game.player2ships[0], 4)
    })
})

describe("startGame", function() {
    var game = null
    beforeEach(function() {
        game = battleship.newGame()
    })
    it("Нельзя начинать игру до расстановки кораблей", function() {
        assert.equal(battleship.startGame(game), false)
        assert.equal(game.started, false)
    })
    it("После расстановки кораблей игру должно быть можно начать", function() {
        fillgame(game)
        assert.equal(battleship.startGame(game), true)
        assert.equal(game.started, true)
    })
})

describe("doTurn", function() {
    var game = null
    beforeEach(function() {
        game = battleship.newGame()
        fillgame(game)
        battleship.startGame(game)
        game.turn = 1
    })
    it("Нельзя ходить вне очереди", function() {
        assert.equal(battleship.doTurn(game, 2, 0, 0), false)
        game.turn = 2
        assert.equal(battleship.doTurn(game, 1, 0, 0), false)
        assert.equal(battleship.doTurn(game, 2, 0, 0), true)
    })
    it("При промахе ход должен передаваться сопернику", function() {
        assert.equal(battleship.doTurn(game, 1, 1, 1), true)
        assert.equal(game.turn, 2)
    })
    it("При попадании можно сделать ещё ход", function() {
        assert.equal(battleship.doTurn(game, 1, 0, 0), true)
        assert.equal(battleship.doTurn(game, 1, 0, 1), true)
        assert.equal(game.turn, 1)
    })
    it("Ходы должны отображаться у игрока", function() {
        assert.equal(battleship.doTurn(game, 1, 0, 0), true)
        assert.equal(battleship.doTurn(game, 1, 1, 1), true)
        assert.equal(battleship.doTurn(game, 2, 0, 0), true)
        assert.equal(battleship.doTurn(game, 2, 1, 1), true)
        assert.equal(game.player1view[0][0], 1)
        assert.equal(game.player1view[1][1], -1)
        assert.equal(game.player2view[0][0], 1)
        assert.equal(game.player2view[1][1], -1)
    })
    it("После уничтожения кораблей одного из игроков игра должна завершиться", function() {
        for (var i = 0; i < 10; ++i) {
            for (var j = 0; j < 10; ++j) {
                if (game.player2grid[i][j]) {
                    assert.equal(battleship.doTurn(game, 1, i, j), true)
                }
            }
        }
        assert.equal(game.finished, true)
        assert.equal(game.result, 1)
    })
    it("После завершения игры нельзя делать ходы", function() {
        game.finished = true
        assert.equal(battleship.doTurn(game, 1, 0, 0), false)
    })
})
