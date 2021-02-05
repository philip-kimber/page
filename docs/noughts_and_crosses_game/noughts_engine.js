
class NoughtsBoard {
	
	constructor() {
		this.board = [["_", "_", "_"], // accessed as board[row][col]
					  ["_", "_", "_"],
					  ["_", "_", "_"]];
					  
		this.three_set_indices = [[[0,0], [0,1], [0,2]],
								  [[1,0], [1,1], [1,2]],
								  [[2,0], [2,1], [2,2]],
								  
								  [[0,0], [1,0], [2,0]],
								  [[0,1], [1,1], [2,1]],
								  [[0,2], [1,2], [2,2]],
								  
								  [[0,0], [1,1], [2,2]],
								  [[0,2], [1,1], [2,0]]];
		
		this.corner_indices = [[0,0], [0,2], [2,0], [2,2]];
		this.edge_indices = [[0,1], [1,2], [2,1], [1,0]];
		
	}
	
	count(val) {
		// counts number of "X", "O", or "_" in the current board
		let out = 0;
		for (let row of this.board) {
			for (let col of row) {
				if (col == val) { out++; }
			}
		}
		return out;
	}
	
	set_square(row, col, val) {
		this.board[row][col] = val;
	}
	
	get_square(row, col) {
		if (col !== undefined) {
			return this.board[row][col];
		} else { 
			let r = row[0];
			let c = row[1];
			return this.board[r][c]; }
	}
	
	get_positions(symbol) {
		let out = [];
		for (let r=0;r<3;r++) {
			for (let c=0;c<3;c++) {
				if (this.get_square(r,c) == symbol) { out.push([r,c]); }
			}
		}
		return out;
	}
	
	get_near_wins(symbol) {
		// returns a list of any squares that can be filled by symbol, to create a win
		var out = [];
		for (let possible of this.three_set_indices) {
			let mines = [];
			let frees = [];
			for (let sq of possible) {
				if (this.get_square(sq) == symbol) { mines.push(sq);}
				else if (this.get_square(sq) == "_") { frees.push(sq); }
			}
			if ((mines.length == 2) && (frees.length == 1)) {
				out.push(frees[0]);
			}
		}
		return out;
	}
	
	get_free_corners() {
		let out = [];
		for (let possible of this.corner_indices) {
			if (this.get_square(possible) == "_") {
				out.push(possible);
			}
		}
		return out;
	}
	
	get_free_edges() {
		let out = [];
		for (let possible of this.edge_indices) {
			if (this.get_square(possible) == "_") {
				out.push(possible);
			}
		}
		return out;
	}
	
	get_free_squares() {
		return this.get_positions("_");
	}
	
	is_win() {
		// returns "X" or "O" if that side has won, else false
		let symbol = "X";
		for (let possible of this.three_set_indices) {
			let mine = 0;
			for (let sq of possible) {
				if (this.get_square(sq) == symbol) { mine ++;}
			}
			if (mine == 3) {
				return "X";
			}
		}
		symbol = "O";
		for (let possible of this.three_set_indices) {
			let mine = 0;
			for (let sq of possible) {
				if (this.get_square(sq) == symbol) { mine ++;}
			}
			if (mine == 3) {
				return "O";
			}
		}
		return false;
	}
	
	is_draw() {
		if (this.count("_") == 0) { return true; } else { return false; }
	}
	
	async play(args={}) {
		
		args.first = args.first || "computer";
		args.computer_symbol = args.computer_symbol || "X";
		args.human_symbol = args.human_symbol || "O"; // todo, not intuitive, need to be able to specify just one
		args.get_human_move = args.get_human_move || function(turn_number, symbol, board_object) {return [...choose(board_object.get_free_squares()), symbol];};
		args.get_computer_move = args.get_computer_move || this.get_computer_move;
		args.board_update_callback = args.board_update_callback || function(board){console.log(board);};
		args.result_callback = args.result_callback || function(result){console.log(result);};
		
		this.board = [["_", "_", "_"],
					  ["_", "_", "_"],
					  ["_", "_", "_"]];
		
		var turn_number = 0;
		var current = args.first;
		
		while (!(this.is_win() || this.is_draw())) {
			args.board_update_callback(this.board);
			
			if (current == "computer") {
				var move = await args.get_computer_move(turn_number, args.computer_symbol, this);
				current = "human";
			} else {
				var move = await args.get_human_move(turn_number, args.human_symbol, this);
				current = "computer";
			}
			
			this.set_square(move[0], move[1], move[2]);
			turn_number += 1;
		}
		args.board_update_callback(this.board);
		if (this.is_win()) {
			args.result_callback(this.is_win());
		} else { args.result_callback("draw"); }
		
	}
	
	get_computer_move(turn_number, symbol, board_object) {
		var opp = (symbol == "X") ? "O" : "X";
		switch (turn_number) {
			// PLAYING FIRST
			case 0:
				// choose a corner
				return choose([[0,0,symbol], [0,2,symbol], [2,0,symbol], [2,2,symbol]]);
				break;
				
			case 2:
				// try and pick the opposite corner; failing that, another available corner
				let first = board_object.get_positions(symbol)[0];
				let opposite = [((first[0] == 0) ? 2: 0), ((first[1] == 0) ? 2: 0)]
				if (board_object.get_square(opposite[0], opposite[1]) == "_") {
					return [opposite[0], opposite[1], symbol];
				} else {
					return [...choose(board_object.get_free_corners()), symbol];
				}
				break;
				
			case 4:
			case 6:
				// if the opponent is about to win, fill that space, if self about to win, fill that space
				// else pick a corner
				var my_wins = board_object.get_near_wins(symbol);
				if (my_wins.length) {
					return [my_wins[0][0], my_wins[0][1], symbol];
				}
				
				var opp_wins = board_object.get_near_wins(opp);
				if (opp_wins.length) {
					return [opp_wins[0][0], opp_wins[0][1], symbol];
				}
				
				return [...choose(board_object.get_free_corners()), symbol];
				break;
				
			case 8:
				// there is only one space left: go in it
				var space = board_object.get_positions("_")[0];
				return [space[0], space[1], symbol];
				break;
			
			// PLAYING SECOND
			case 1:
				// go for the centre if available, else pick a corner
				if (board_object.get_square(1,1) != opp) {
					return [1,1,symbol];
				} else {
					return [...choose(board_object.corner_indices), symbol];
				}
				break;
			
			case 3:
				// block if the opponent is about to win, 
				// else (if you have the centre) choose an edge that is not opposite an opponent's tile
				// if you don't have the centre, take a corner
				var opp_wins = board_object.get_near_wins(opp);
				if (opp_wins.length) {
					return [opp_wins[0][0], opp_wins[0][1], symbol];
				}
				
				if (board_object.get_square(1,1) == symbol) {
					var edge_choices = [];
					for (var ch of board_object.edge_indices) {
						var ch_opposite = (ch[0] == 1) ? [ch[0], ((ch[1] == 0) ? 2: 0)] : [((ch[0] == 0) ? 2: 0), ch[1]];
						if ((board_object.get_square(ch) == "_") && (board_object.get_square(ch_opposite) != opp)) {
							edge_choices.push(ch);
						}
					}
					
					if (edge_choices.length) {
						return [...choose(edge_choices), symbol];
					} else { // this is the 'special case' where opponent can fork
						var possibles = [[[0,1],[1,2], [2,0]],
										 [[1,2],[2,1], [0,0]],
										 [[2,1],[1,0], [0,2]],
										 [[1,0],[0,1], [2,2]]];
						for (var p of possibles) {
							if ((board_object.get_square(p[0]) == opp) && (board_object.get_square(p[1]) == opp)) {
								var avoid = p[2];
							}
						}
						var choices = [];
						for (var c of board_object.corner_indices) {
							if (c != avoid) {
								choices.push([...c, symbol]);
							}
						}
						return choose(choices);
					}
				} else {
					return [...choose(board_object.get_free_corners()), symbol];
				}
				break;
			
			case 5:
			case 7:
				// win if possible, otherwise block if needed, if neither, random move and game is destined for draw
				var my_wins = board_object.get_near_wins(symbol);
				if (my_wins.length) {
					return [my_wins[0][0], my_wins[0][1], symbol];
				}
				
				var opp_wins = board_object.get_near_wins(opp);
				if (opp_wins.length) {
					return [opp_wins[0][0], opp_wins[0][1], symbol];
				}
				
				return [...choose(board_object.get_free_squares()), symbol];
				
				break;
		}
	}
	
}

function choose(choices) {
  return choices[Math.floor(Math.random() * choices.length)];
}
