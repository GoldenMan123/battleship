/*
    Battleship logic module

    newGame() --- Creates new game
    placeShip(game, player, ship, orientation, x, y) --- Places ship
        at the battlefield.
        * Player: 0 or 1.
        * Ship: integer from 0 to 9
        * Orientation: 0 (vertical) or 1 (horizontal)
        * x, y: coordinates
    startGame(game) --- Starts the game
    doTurn(game, player, x, y) --- Shoot!
*/


// Ship sizes
const shipsize = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1]

// Creates empty game grid
function newGrid() {
    return new Array(10).fill(null).map(() => new Array(10).fill(0))
}


// Creates ship use flags
function newShipArray() {
    return new Array(10).fill(0)
}


// Creates new game
function newGame() {
    var game = {}
    game.started = false
    game.finished = false
    game.result = null
    game.player = [{}, {}]
    for (var i = 0; i < 2; ++i) {
        game.player[i].grid = newGrid()
        game.player[i].view = newGrid()
        game.player[i].ships = newShipArray()
        game.player[i].turns = new Array()
    }
    if (Math.random() > 0.5) {
        game.turn = 0
    } else {
        game.turn = 1
    }
    return game
}


// Place ship
function placeShip(game, player, ship, orientation, x, y) {
    if (game.started) {
        return false
    }
    if ((x < 0) || (x > 9) || (y < 0) || (y > 9)) {
        return false
    }
    if ((ship < 0) || (ship > 9)) {
        return false
    }
    if ((player < 0) || (player > 1)) {
        return false
    }
    var sa = game.player[player].ships
    if (sa[ship] != 0) {
        return false
    }
    sz = shipsize[ship]
    if (orientation == 0) {
        if (x + sz > 10) {
            return false
        }
    } else if (orientation == 1) {
        if (y + sz > 10) {
            return false
        }
    } else {
        return false
    }
    var grid = game.player[player].grid
    var cx = x
    var cy = y
    for (var i = 0; i < sz; ++i) {
        for (var dx = -1; dx < 2; ++dx) {
            for (var dy = -1; dy < 2; ++dy) {
                if ((cx + dx < 0) || (cy + dy < 0) ||
                    (cx + dx > 9) || (cy + dy > 9)) {
                    continue
                }
                if (grid[cx + dx][cy + dy] != 0) {
                    return false
                }
            }
        }
        if (orientation == 0) {
            ++cx
        } else {
            ++cy
        }
    }
    cx = x
    cy = y
    for (var i = 0; i < sz; ++i) {
        grid[cx][cy] = ship + 1
        if (orientation == 0) {
            ++cx
        } else {
            ++cy
        }
    }
    sa[ship] = shipsize[ship]
    return true
}


// Starts the game
function startGame(game) {
    if (game.started) {
        return false
    }
    for (var i = 0; i < 10; ++i) {
        if ((game.player[0].ships[i] == 0) ||
            (game.player[1].ships[i] == 0)) {
            return false
        }
    }
    game.started = true
    return true
}

// Turn
function doTurn(game, player, x, y) {
    if (!game.started) {
        return false
    }
    if (game.finished) {
        return false
    }
    if (game.turn != player) {
        return false
    }
    var view = game.player[player].view
    var grid = game.player[1 - player].grid    
    var sa = game.player[1 - player].ships
    var turns = game.player[player].turns
    if (view[x][y] != 0) {
        return false
    }
    ship = grid[x][y]
    if (ship == 0) {
        view[x][y] = -1
    } else {
        view[x][y] = grid[x][y]
        sa[ship - 1]--
        if (sa[ship - 1] == 0) {
            for (var i = 0; i < 10; ++i) {
                for (var j = 0; j < 10; ++j) {
                    if (grid[i][j] == ship) {
                        for (var dx = -1; dx < 2; ++dx) {
                            for (var dy = -1; dy < 2; ++dy) {
                                if ((i + dx < 0) || (j + dy < 0) ||
                                    (i + dx > 9) || (j + dy > 9)) {
                                    continue
                                }
                                cur = grid[i + dx][j + dy]
                                if (cur == 0) {
                                    view[i + dx][j + dy] = -1
                                } else {
                                    view[i + dx][j + dy] = cur
                                }
                            }
                        }
                    }
                }
            }
            var sum = sa.reduce((a, b) => a + b)
            if (sum == 0) {
                game.finished = true
                game.result = player
            }
        }
        turns.push([x, y])
        return true
    }
    game.turn = 1 - game.turn
    turns.push([x, y])
    return true
}

module.exports = {newGame, placeShip, startGame, doTurn}

