//node-http-proxy server is a programmable proxy server and load balancer.
//importing the required node modules like restify and validator.
//The project uses nodejitsu/node-http-proxy as baseline project
var httpProxy = require('http-proxy');
var proxy = httpProxy.createProxy();
var restify = require('restify');
var validator = require('validator');
var Cookies = require('cookies');

var stickSession = false;

var sessionExpiration = 5;

var IP1;

//contains the routing information. It has the default routing table
var routeTable = {  
    'foo.com': ['http://localhost:10001', 'http://localhost:10002', 'http://localhost:8081', 'http://localhost:8080', 'http://localhost:8082'],
    'remote.com' :['http://ec2-54-193-86-12.us-west-1.compute.amazonaws.com:10001', 'http://ec2-54-193-86-12.us-west-1.compute.amazonaws.com:10002']
}

// We are creating a Restify server using the Restify Framework
var server = restify.createServer();

// This is the proxy server which listens on port 8888
// this is the proxy server
server.listen(8888);
console.log('Server running on port 8888');

var respondRouteTable = function(req, res) {
    console.log('Executing HTTP GET Request');
    res.send(routeTable);
};

server.get('/route ', respondRouteTable);

var getStickSession = function(req, res) {
    console.log('GET stick session attributes');
    var response = {"stick session":stickSession, "session expiration time":sessionExpiration}
    res.send(response);
}

server.get('/sticksession', getStickSession);

//If the destination is there in routing table then it will return it or else it will show a message to user
var respondRouteTableItem = function(req, res) {
    if(req.params.source in routeTable)
	res.send(routeTable[req.params.source]);
    else
	res.send('No Route available for: ' + req.params.source);
};

server.get('/route/:source', respondRouteTableItem);

//get the client address by X-forwarded-for method
var getClientAddress = function (req) {
    return (req.headers['x-forwarded-for'] || '').split(',')[0] 
        || req.connection.remoteAddress;
};

// create a new routing path if it doesn't exist already in routing table , if already exists then displays an message
var postRoute = function(req, res) {
    console.log(req.body);
    console.log(req.head);
    if(req.params.source in routeTable) {
    //return a message (for example: { "error": "route not found" }
        console.log('Warning !!! : Source provided already exists');
    res.send('route already exist. Use put method to change it');
    }
    // checks for empty input from user
    else {

    
    if(req.params.dest.length<1)
    {
res.end('Input destination array is empty');
console.log("Input destination array is empty");

    }

    else
    {
    var dest=[];
    var dest_invalid=[];
   // calling the validator for checking if the user input is correct or not
    for(var i=0;i<req.params.dest.length;i++)
    {

if(!validator.isURL(req.params.dest[i]))
{
console.log("URL: " + req.params.dest[i]+ " is not a valid URL");
dest_invalid.push(req.params.dest[i]);

//res.send("URL: " + req.params.dest[i]+ " is not a valid URL");

}
//if the route is in  valid format its added to the routing table
else
    {
       	dest.push(req.params.dest[i]);
console.log("URL: " + req.params.dest[i]+ " added to routing table");
//res.send("URL: " + req.params.dest[i]+ " added to routing table");

}


    }


console.log("valid URL");
routeTable[req.params.source] = dest;
    console.log("successfully added route in routing table"+dest);
    if(dest_invalid.length>=1 && dest.length>=1)
    {
    	//display both valid and invalid URL list
    console.log('added route is:' + req.params.source + ' --> ' + dest + "\n"+"Following invalid URLs were not added to the routing table  ---> "+dest_invalid);
    res.end('added route is:' + req.params.source + ' --> ' + dest + "\n"+"Following invalid URLs were not added to the routing table  ---> "+dest_invalid);
    }
        else if(dest_invalid.length ==0 && dest.length>=1){
        	//display all the valid URL list
             console.log('added route is:' + req.params.source + ' --> ' + dest);
             res.end('added route is:' + req.params.source + ' --> ' + dest);
        }
             else
             {
    //display the Invalid URL list         	
    console.log("Following invalid URLs were not added to the routing table ---> "+dest_invalid);
    res.end("Following invalid URLs were not added to the routing table ---> "+dest_invalid);
}
}
   }
 }

server.use(restify.bodyParser());
server.post('/route', postRoute);
// checks if the route is present in the routing table , if presents then updpates it else gives message to user
var putRoute = function(req, res) {
    console.log(req.body);
    console.log(req.query.dest);
    if(req.params.source in routeTable) {
	routeTable[req.params.source] = req.params.dest;
	res.end('updated route ' + req.params.source);
    }
    else
	//TODO: return a json object (for example: { "error": "route does not exist" })
	res.end('route does not exist. Use post method');
}

//restify-queryParser is used to read multiple lines from the URl
server.use(restify.queryParser());
server.put('/route/:source', putRoute);

var putStickSession = function(req, res) {
    console.log(req.query);
    if(req.query.sticksession != undefined) {
	stickSession = req.query.sticksession;
	res.end('updated stick session to: ' + req.query.sticksession);
    }
    else {
	res.send("sticksession query parameter must be true or false");
    }
}

server.put('/sticksession/setStick', putStickSession);

var putExpirationTime = function(req, res) {
    console.log(req.query);
    if(req.query.expiration != undefined) {
	expirationTime = req.query.expiration;
	res.end('updated expiration time of stick session to: ' + req.query.expiration);
    }
    else {
	res.send("expiration query parameter must have a value (in seconds)");
    }
}

server.put('/sticksession/setExpiration', putExpirationTime);

//checks if the route is present in the routing table , if presents then updpates it else gives message to user
var putAddRoute = function(req, res) {
    console.log(req.params.source);
    console.log(req.query);
    if(!(req.params.source in routeTable)) {
	res.end(" Error !!! Source address doesnt exist");
	//TODO: finish this part. show error to user. address doesnt exist (change message above) 
	console.log("Error !! Source does not exist ! Try again ....");
	
    }
    // checking conditions for put
    else {
	var addr = routeTable[req.params.source];
	if(req.query.add != undefined && routeTable[req.params.source].indexOf(req.query.add) != -1) {
	
	    console.log("Address already exists in routing table");
	    return res.send(req.query.add + " Address is already present");
	}
	//validating the url passed by user.
	else if(req.query.add != undefined) {
	    console.log("adding destination " + req.query.add + " on " + req.params.source);
	    routeTable[req.params.source].push(req.query.add);
	    if(validator.isURL(req.query.add)){
		console.log("valid URL");
	    }
	    else {
		console.log("invalid URL");
		res.send("URL: " + req.query.add + " is not a valid URL");
	    }
	    res.end(req.query.add  +" Address added in routing table");
	}
    }
}

server.put('/route/add/:source', putAddRoute);

//API for Delete operattion
var putDelRoute = function(req, res) {
    console.log(req.params.source);
    console.log(req.query);
    //checks if route exists in the routing table on not
    if(!req.params.source in routeTable) {
	//TODO: finish this partshow error to user. address doesnt exist (change message above)
	console.log("error: source doesn't exist");
	
    }
    //checks the user input before deletion
    else if(req.query.del != undefined && routeTable[req.params.source].indexOf(req.query.del) != -1) {
	console.log("deleting address " + req.query.del);
	routeTable[req.params.source].splice(routeTable[req.params.source].indexOf(req.query.del), 1);
	res.end("address deleted");
    }
    // show error to user. route cannot be deleted because it doesnt exist for given address (change message above)
	
    else if(req.query.del != undefined) {
	console.log(req.query.del);
	console.log(routeTable[req.params.source]);
	console.log("cant delete unexistent address");
	res.end("error");
    }
}

server.put('/route/del/:source', putDelRoute);

var deleteRoute = function(req, res) {
    console.log(req.params.source);
    if(req.params.source in routeTable) {
	delete routeTable[req.params.source];
	res.end(req.params.source + ' route deleted');
    }
    else
	//TODO: return a json object (for example: { "error": "route does not exist" })
	res.end('route does not exist.');
}

server.del('/route/:source', deleteRoute);

/*
 http://localhost:8888/route   will give you the routeTable content

 http://localhost:8888/route/foo.com   will give you the destination of foo.com

 http://localhost:8888/route/not_in_table   will give you the answer no route for not_in_table

resource: POST - /route
{"source" : "test.com",
"dest" : ["http://localhost:8002", "http://localhost:8001"]} 
content-type: application/json
get on new route will return new route information
post on same route won't be allowed
put on new route should work

resource: PUT
http://localhost:8888/route/foo.com
{"dest" : ["http://localhost:10002", "http://localhost:10001"]} 
get on route should have update information

or

http://localhost:8888/route/add/foo.com?add=http://localhost:8080 will add http://localhost:8080 destination to foo.com source in routeTable
get on route will have new address
if source doesn't exist or address to be added is already there, should return a error message

or

http://localhost:8888/route/del/foo.com?del=http://localhost:10001 will delete destination http://localhost:10001 from foo.com in routeTable
get on route will not have deleted address
if source doesn't exist or address to be removed is not a destination, should return a error
don't allow destination to be empty

resource: DELETE
http://localhost:8888/route/foo.com will delete route for foo.com
get on foo.com will return nothing
you can post to foo.com now
you cannot put on foo.com

http://localhost:8888/sticksession/setStick?sticksession=true will set stickSession to true

http://localhost:8888/sticksession/setExpiration?expiration=10 will set expirationTime to 10
*/

//Code for Load-Balancer. Uses Round-Robin to balance the nodes.
require('http').createServer(function(req, res) {  
    console.log(req.headers);
    if( req.headers.host != undefined && req.headers.host in routeTable) {
	var cookies = new Cookies(req, res);
	var address =  routeTable[req.headers.host][1];
	if(stickSession) {
	    console.log("using sticky session");
	    if(cookies.get(req.headers.host) != undefined) {
		address = cookies.get(req.headers.host);
	    }
	    else {
		if(sessionExpiration == -1) {
			cookies.set(req.headers.host, address);
		    console.log("no expiration on sticky session");
		}
		else {
		    var expiration = new Date(Date.now() + sessionExpiration * 1000);
		    console.log("sticky session will expire in " + sessionExpiration + " seconds");
		    cookies.set(req.headers.host, address, {expires:expiration});
		}
		
	    }
	}
	routeTable[req.headers.host].splice(routeTable[req.headers.host].indexOf(address), 1);
	console.log(address);
	routeTable[req.headers.host].push(address);
	proxy.web(req, res, {
	    target: address
	}, function (e) {console.log(e);});
	console.log(routeTable);
    }
    else
	//Error handling
	proxy.web(req,res, {target: req.headers.host});
}).listen(8000);

//Port number for Aws-EC2
require('http').createServer(function(req, res) {  
  res.end('done@10001\n');
}).listen(10001);

//Port number for Aws-EC2
require('http').createServer(function(req, res) {  
  res.end('done@10002\n');
}).listen(10002);

//Port number for localhost:8080
require('http').createServer(function(req, res) {  
  res.end('done@8080\n');
}).listen(8080);

//Port number for localhost:8081
require('http').createServer(function(req, res) {  
  res.end('done@8081\n');
}).listen(8081);

//Port number for localhost:8082
require('http').createServer(function(req, res) {  
  res.end('done@8082\n');
}).listen(8082);
