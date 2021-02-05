
function _USE_JSON(jsonpath, callback, functions_callback=function(fs){}) {
	var xmlhttp = new XMLHttpRequest();
	xmlhttp.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			var out = JSON.parse(this.responseText);
			interpreter = new _InterpretedJSON(out, callback, functions_callback);
			return true;
		}
	};
	xmlhttp.open("GET", jsonpath, true);
	xmlhttp.send();
}

class _InterpretedJSON {
	
	constructor(json_array, callback, functions_callback=function(fs){}) {
		this.json_array = json_array;
		
		this.functions = {};
		this.elements_array = [];
		
		this.callback = callback;
		this.functions_callback = functions_callback;
		
		this.parse_all();
	}
	
	async parse_all() {
		
		for (let obj of this.json_array) {
			let obj_parsed = this.parse_object(obj);
			
			if (obj_parsed === null) { continue; }
			
			if (obj_parsed.token_object == "token_object") {
				function wait_for_token_load(token_object) {
					return new Promise(function check(resolve) {
						if ((token_object.resolved_elements_array == true) && (token_object.resolved_functions_obj == true)) { return resolve(true); }
						setTimeout(() => check(resolve), 50);
					});
				}
				await wait_for_token_load(obj_parsed);
			} 
			
			else {
				if (obj_parsed) { this.elements_array.push(obj_parsed); }
			}
		}
		
		this.callback(this.elements_array);
		this.functions_callback(this.functions);
	}
	
	parse_element(obj, scope) {
		var rectifier = this.get_rectifier(scope);
		if (obj.namespace) {
			var out = document.createElementNS(rectifier(obj.namespace), rectifier(obj.name));
		} else {
			var out = document.createElement(rectifier(obj.name));
		}
		
		if (obj.attributes) {
			for (let attr in obj.attributes) {
				out.setAttribute(attr, rectifier(obj.attributes[attr]));
			}
		}
		if (obj.innerHTML) { 
			out.innerHTML = rectifier(obj.innerHTML);
		} else if (obj.childElements) {
			for (let json_el of obj.childElements) {
				let json_el_parsed = this.parse_object(json_el, scope); // may not fully be fixed
				if (json_el_parsed) {
					out.appendChild(json_el_parsed);
				}
			}
		}
		
		return out;
	}
	
	parse_function_use(use_obj, scope) {
		let def_obj = this.functions[use_obj.name];
		
		let def_args = def_obj.args || def_obj.arguments || {};
		let use_args = use_obj.args || use_obj.arguments || {};
		
		let rectifier = this.get_rectifier(scope);
		
		for (let arg in def_args) {
			if (use_args[arg] !== undefined) {
				scope[arg] = rectifier(use_args[arg]);
			} else {
				scope[arg] = rectifier(def_args[arg]);
			}
		}
		
		return this.parse_object(def_obj.element, scope);
		
	}
	
	get_rectifier(scope){
		// this function returns a function that will replace arguments where needed, with the provided scope
		// scope is just an object of all variables/parameters in the current scope
		function func(string) {
			if (typeof string !== "string") { 
				return string; // for now it is not permissible to have anything other than a string
							   // as an argument to a function. but this avoids an error, will instead print [object Object]
			}
			const templateMatcher = /{{\s?([^{}\s]*)\s?}}/g;
			
			let out = string.replace(templateMatcher, (substring, value, index) => {
				value = scope[value];
				return value;
			});
			return out;
		}
		
		return func;
	}
	
	parse_object(obj, scope={}) {
		if ((obj.type == "element") || (obj.type == "el") || (obj.type === undefined)) {
			return this.parse_element(obj, scope);
		}
		
		if ((obj.type == "function_use") || (obj.type == "use_function") || (obj.type == "use")) {
			return this.parse_function_use(obj, scope);
		}
		
		if ((obj.type == "function_definition") || (obj.type == "define_function") || (obj.type == "definition") || (obj.type == "def")) {
			this.functions[obj.name] = obj;
			return null;
		}
		
		if ((obj.type == "include_stylesheet") || (obj.type == "stylesheet") || (obj.type == "style")) {
			let el = document.createElement("link");
			el.setAttribute("rel", "stylesheet");
			let src = (obj.src === undefined) ? obj.href : obj.src;
			el.setAttribute("href", src);
			document.head.appendChild(el);
			return null;
		}
		
		if ((obj.type == "include_js") || (obj.type == "js") || (obj.type == "javascript")) {
			let el = document.createElement("script");
			el.setAttribute("type", "text/javascript");
			let src = (obj.src === undefined) ? obj.href : obj.src;
			el.setAttribute("src", src);
			return el;
		}
		
		if ((obj.type == "include_json") || (obj.type == "json") || (obj.type == "include")) {
			var token_object = {"token_object": "token_object",
							    "resolved_elements_array": false,
								"resolved_functions_obj": false};
			var original_json_obj = this;
			
			function callback(el_arr) {
				console.log(el_arr);
				for (let el of el_arr) {
					original_json_obj.elements_array.push(el);
				}
				token_object.resolved_elements_array = true;
			}
			function functions_callback(f_obj) {
				console.log(f_obj);
				original_json_obj.functions = {...original_json_obj.functions, ...f_obj};
				token_object.resolved_functions_obj = true;
			}
			
			let src = (obj.src === undefined) ? obj.href : obj.src;
			_USE_JSON(src, callback, functions_callback);
			
			return token_object;
			
		}
		
		if ((obj.type == "head_element") || (obj.type == "head")) {
			document.head.appendChild(this.parse_object(obj.element));
			return null;
		}
		
		else {
			return null;
		}
		
	}
	
}
