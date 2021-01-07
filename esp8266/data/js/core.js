
/*
*  ##########################################################  SOCKETS  ##########################################################
*/

var socket_connect_display= true;
var socket_display        = true;
var web_socket            = null;
var socket_connected      = false;
var socket_keep_alive_period = 500;
var socket_keep_alive_enabled = false;
var json_data;
var response_display = true;
						
function socket_init(){
	console.log("\n[socket_init]\n");
	// web_socket = new WebSocket('ws://'+document.location.host+'/ws',['arduino']);
	web_socket = new WebSocket('ws://' + window.location.hostname + ':81/');
	web_socket.binaryType = "arraybuffer";
	web_socket.debug = true;
	console.log('ws://'+document.location.host+'/ws\n');

	web_socket.onopen = function(e) { 
		if (socket_connect_display) console.log("\n[socket onopen]\n\t", e);
		socket_connected=true;
		socket_status_display();
		if (socket_keep_alive_enabled) keep_alive_time_out=setTimeout(socket_keep_alive, socket_keep_alive_period);
	};
	 
	web_socket.onclose = function(e){
		if (socket_connect_display) console.log("\n[socket onclose]\n\t", e);
		socket_connected=false;
		socket_status_display();
		// setTimeout(function() {  socket_init()  }, 1000);
	};
	 
	web_socket.onerror = function(e){
		if (socket_connect_display) console.log("\n[socket onerror]\n\t", e);
		socket_connected=false;
		// setTimeout(function() {  socket_init()  }, 1000);
		socket_status_display();
	};
	 
	web_socket.onmessage = function(e){
		var msg = "";
		if (e.data instanceof ArrayBuffer){
			msg = "BIN:";
			var bytes = new Uint8Array(e.data);
			for (var i = 0; i < bytes.length; i++) {
				msg += String.fromCharCode(bytes[i]);
			}
		} else {
			msg = e.data;
		}
		socket_receive(msg);
	};
}

function socket_keep_alive() {
	if (!web_socket) return;
	if (web_socket.readyState !== 1) return;
	// client_request("socket_keep_alive");
	keep_alive_time_out=setTimeout(socket_keep_alive, socket_keep_alive_period);
}

function socket_receive(msg) {
	if (socket_display) console.log("\n[socket_receive]\n\t"+msg+"\n");
	server_response(msg);
}

function socket_send(msg) {
	if (! socket_connected ) socket_init();
		web_socket.send(msg); 
		if (socket_display) console.log("\n[socket_send]\n\t"+msg+"\n");
}

function socket_status_display() {
	// if (socket_connected) document.getElementById('lbl_upd').value = "connected";
	// else document.getElementById('lbl_upd').value = "disconnected";
}


// JSON
function hasJsonStructure(str) {
    if (typeof str !== 'string') return false;
    try {
        const result = JSON.parse(str);
        const type = Object.prototype.toString.call(result);
        return type === '[object Object]' 
            || type === '[object Array]';
    } catch (err) {
        return false;
    }
}
function safeJsonParse(str) {
    try {
        return [null, JSON.parse(str)];
    } catch (err) {
        return [err];
    }
}

// REQUEST UTILE
function literal_item(name, value) {
   var x="<"+name+">"+value+"</"+name+">";
   return x;
}
function request_format_http(name, arg, value){
	var ret = "/" + name + "?&" + arg + "=" + value;
	return ret;
}
function request_format_socket(name, arg, value){
	var cmd = "&" + arg + "=" + value;
	var op 	= literal_item("op", name);
	var msg = literal_item("cmd", cmd);
	return op + msg;
}
function request_send(name, arg, value){
//	console.log(" window.location.hostname");
//	request_http("/json/currentSetting.json");
	var msg="";
	if (socket_connected) {
		msg = request_format_socket(name, arg, value);
		socket_send(msg);
	} else {
		msg = request_format_http(name, arg, value);
		request_http(msg);
	}
}

function request_http(msg){
	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
	    if (this.readyState == 4 && this.status == 200) {
	       // Typical action to be performed when the document is ready:
	       document.getElementById("p1").innerHTML = xhttp.responseText;
	       server_response(xhttp.responseText);
	    }
	};
	xhttp.open("GET", msg, true);
	xhttp.send();	
}

// SOCKET REQUEST RECIEVE
function string_replaceBr(string){
	string = string.replace("\n", '<br>');
	string = string.replace("\n\t", '<br>&nbsp;&nbsp;&nbsp;&nbsp;');
	return string;
}
function server_response(json) {
	if (json == "{\"}") return;

	if (response_display) { console.log("\n[server_response]\n\t string:\n"+json+"\n"); }

	//document.getElementById("p1").innerHTML = json;
	if(document.getElementById("region_socketMonitor").style.display == "") document.getElementById("p1").innerHTML = string_replaceBr(json);
	
	const [err, result] = safeJsonParse(json);
	if (err) {
		if (response_display) console.log('\tFailed to parse JSON: ' + err.message);
		return;
	}
	
	var response = JSON.parse(json);

	if (response_display) {console.log('\tjson:\n');console.log(response);console.log("\n");}

	table_object(response, 'wifiid', 'table_wifi');
	table_object(response, 'playlist', 'table_jsonPlaylist');
	table_object(response, 'general', 'table_jsonGeneral');
	table_object(response, 'list', 'table_jsonEffectList');
	table_objectAndSubOjbect(response, 'patterns', 'table_jsonPatterns');
	table_objectAndSubOjbect(response, 'effect', 'table_jsonEffect');


}
function table_object(json, objName, tabName) {
	if (json[objName] == undefined) return;

	var table 		= document.getElementById(tabName);
    var tableRows 	= document.getElementById(tabName).rows;

    var checkedRows = [];
    for (var i = 1; i < tableRows.length; i++) 		{checkedRows.push(tableRows[i]);}
    for (var k = 0; k < checkedRows.length; k++) 	{checkedRows[k].parentNode.removeChild(checkedRows[k]);}
	
	var cnt = 1;
	for (const [key, value] of Object.entries(json[objName])) {
		var newRow = table.insertRow(cnt);
		var cell2 = newRow.insertCell(0);
		var cell3 = newRow.insertCell(1);
		cell2.innerHTML = `${key}`;
		cell3.innerHTML = `${value}`;	
		cnt++;
	}
}
function table_objectAndSubOjbect(json, objName, tabName) {
	if (json[objName] == undefined) return;

	var table 		= document.getElementById(tabName);
    var tableRows 	= document.getElementById(tabName).rows;

    var checkedRows = [];
    for (var i = 1; i < tableRows.length; i++) 		{checkedRows.push(tableRows[i]);}
    for (var k = 0; k < checkedRows.length; k++) 	{checkedRows[k].parentNode.removeChild(checkedRows[k]);}
	
	var cnt = 1;
	for (const [key, value] of Object.entries(json[objName])) {
		for (const [oKey, oValue] of Object.entries(json[objName][`${key}`])) {
			var newRow = table.insertRow(cnt);
			var cell1 = newRow.insertCell(0);	
			cell1.innerHTML = `${key}`;			
			var cell2 = newRow.insertCell(1);
			var cell3 = newRow.insertCell(2);
			cell2.innerHTML = `${oKey}`;
			cell3.innerHTML = `${oValue}`;	
			
			cnt++;
		}
	}
}

function region_json(){
	gui_hideOtherGroup("region_json");
	if(document.getElementById("region_json").style.display == "") {region_json_upd();} 
}

function region_wifi(){
	gui_hideOtherGroup("region_wifi");
	if(document.getElementById("region_wifi").style.display == "") {request_send('httpRequest', 'wifi', 'id');} 
}

function region_json_upd(){
	request_send('httpRequest', 'json', '');
	if(document.getElementById("grp_table_jsonEffectList").style.display == "") {request_http('/json/patternList.json');} 	
}

function table_jsonShow(value) {
	if(document.getElementById(value).style.display == "") {document.getElementById(value).style.display = "none";}
	else  {document.getElementById(value).style.display = "";}	
}

// REGION SOCKET MONITOR
function region_socketMonitor(){
	if(document.getElementById("region_socketMonitor").style.display == "") {document.getElementById("region_socketMonitor").style.display = "none";}
	else  {document.getElementById("region_socketMonitor").style.display = "";}
}


// GUI
var gui_list_region = ["region_json", "region_wifi"];

function gui_hideOtherGroup(grp){
	for (var i = 0; i < gui_list_region.length; i++) {
		if (gui_list_region[i] == grp) {
		     if(document.getElementById(gui_list_region[i]).style.display != "none") {
		     	document.getElementById(gui_list_region[i]).style.display  = "none";  
		     } else {
		     	document.getElementById(gui_list_region[i]).style.display  = "";  
		     }
		} else {
			document.getElementById(gui_list_region[i]).style.display  = "none";
		}
		
	}
}


// INITIIALISE
socket_init();


$(document).ready(function() {

})





