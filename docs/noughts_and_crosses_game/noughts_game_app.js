
var play_button = document.getElementById("noughts_start");
var tagline_text = document.getElementById("go_indicator");

var tiles = [];
for (var r of [0, 1, 2]) {
	var row = [];
	for (var c of [0, 1, 2]) {
		row.push(document.getElementById(`noughts_${r}${c}`));
	}
	tiles.push(row);
}

function get_human_symbol() {
	return document.querySelector('input[name="noughts_symbol_select"]:checked').value;
}
	
function get_goes_first() {
	return document.querySelector('input[name="noughts_go_select"]:checked').value;
}

function disable_tiles() {
	for (var row of tiles) {
		for (var tile of row) {
			tile.disabled = true;
		}
	}
}

function on_update(board) {
	for (var r of [0, 1, 2]) {
		for (var c of [0, 1, 2]) {
			var val = board[r][c];
			tiles[r][c].innerHTML = (val == "_") ? "&nbsp;" : val;
		}
	}
}

var human_move_global;

async function get_human_move(turn_number, symbol, board_object) {
	tagline_text.innerHTML = "Your move";
	
	for (var r of [0, 1, 2]) {
		for (var c of [0, 1, 2]) {
			if (board_object.get_square([r,c]) == "_") {
				tiles[r][c].disabled = false;
				function get_move_f(row,col) {
					return function() {human_move_global([row,col]);};
				}
				tiles[r][c].onclick = get_move_f(r,c);
			}
		}
	}
	
	var promise = new Promise((resolve) => { human_move_global = resolve });
	var out_sq;
	await promise.then((result) => { out_sq = result;});
	
	disable_tiles();
	tagline_text.innerHTML = "&nbsp;";
	
	return [...out_sq, symbol];
}

async function get_computer_move(turn_number, symbol, board_object) {
	tagline_text.innerHTML = "Computer's move";
	await new Promise(r => setTimeout(r, 1000));
	var move = await board_object.get_computer_move(turn_number, symbol, board_object);
	tagline_text.innerHTML = "&nbsp;";
	return move;
}

function result_callback(result, computer_symbol) {
	var tagl;
	switch (result) {
		case "draw":
			tagl = "It was a draw";
			break;
		
		case computer_symbol:
			tagl = "Computer wins";
			break;
			
		default:
			tagl = "You win";
			break;
	}
	tagline_text.innerHTML = tagl;
	play_button.innerHTML = "<b>Play again</b>";
	play_button.disabled = false;
}

function play() {
	play_button.innerHTML = "Start game";
	play_button.disabled = true;
	var first = get_goes_first();
	var human_symbol = get_human_symbol();
	var computer_symbol = (human_symbol == "X") ? "O" : "X";		
	
	var board_object = new NoughtsBoard();
	
	board_object.play({
							"first": first,
							"human_symbol": human_symbol,
							"computer_symbol": computer_symbol,
							"get_computer_move": get_computer_move,
							"get_human_move": get_human_move,
							"board_update_callback": on_update,
							"result_callback": function(result){result_callback(result, computer_symbol);}
					  });
					  
	
}

disable_tiles();

play_button.onclick = play;

