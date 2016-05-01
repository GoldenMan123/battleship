/*
    Battleship logic module

    newGame() --- Creates new game
    placeShip(game, player, ship, orientation, x, y) --- Places ship
        at the battlefield.
        * Player: 1 or 2.
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
    var grid = new Array()
    for (var i = 0; i < 10; ++i) {
        grid.push(new Array(10).fill(0))
    }
    return grid
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
    game.player1grid = newGrid()
    game.player2grid = newGrid()
    game.player1view = newGrid()
    game.player2view = newGrid()
    if (Math.random() > 0.5) {
        game.turn = 1
    } else {
        game.turn = 2
    }
    game.player1ships = newShipArray()
    game.player2ships = newShipArray()
    game.player1turns = new Array()
    game.player2turns = new Array()
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
    if (player == 1) {
        var sa = game.player1ships
    } else {
        var sa = game.player2ships
    }
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
    if (player == 1) {
        var grid = game.player1grid
    } else if (player == 2) {
        var grid = game.player2grid
    } else {
        return false
    }
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
        if ((game.player1ships[i] == 0) ||
            (game.player2ships[i] == 0)) {
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
    if (player == 1) {
        var view = game.player1view
        var grid = game.player2grid    
        var sa = game.player2ships
        var turns = game.player1turns
    } else {
        var view = game.player2view
        var grid = game.player1grid
        var sa = game.player1ships
        var turns = game.player2turns
    }
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
            var sum = 0
            for (var i = 0; i < 10; ++i) {
                sum += sa[i]
            }
            if (sum == 0) {
                game.finished = true
                game.result = player
            }
        }
        turns.push([x, y])
        return true
    }
    if (game.turn == 1) {
        game.turn = 2
    } else {
        game.turn = 1
    }
    turns.push([x, y])
    return true
}

module.exports = {newGame, placeShip, startGame, doTurn}

