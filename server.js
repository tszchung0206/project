var session = require('cookie-session');
var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var assert = require('assert');
var app = express();
var fileUpload = require('express-fileupload');

var mongodburl = 'mongodb://user:0000@ds157187.mlab.com:57187/project';
var ObjectId = require('mongodb').ObjectID;
mongoose.connect(mongodburl);
var restaurantSchema = require('./restaurant');
var restaurant = mongoose.model('restaurant', restaurantSchema);
var userSchema = require('./user');
var user = mongoose.model('user', userSchema);


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(fileUpload());

app.set('view engine', 'ejs');

app.use(session({
  name: 'session',
  keys: ['session_key1','session_key2']
}));

app.get('/',function(req,res) {
	console.log(req.session);
	if (!req.session.authenticated) {
		res.redirect('/login');
	}
	res.redirect('/list');
});
app.get("/login", function (req,res) {
	res.sendFile( __dirname + '/views/login.html')
})

app.post("/login", function (req,res) {
	user.findOne(
		{
			user_name : req.body.user_name,
			password : req.body.password
		},
		function (err, docs) {
			if (err) {
				res.status(500).json(err);
				throw err
			}else {
				req.session.authenticated = true;
				req.session.username = docs.username;
				res.redirect('/list')
			}
		}
	);
})

app.get("/newuser", function (req,res) {
	res.sendFile( __dirname + '/views/newUser.html')
})

app.post("/newuser", function(req, res){
	var nObj = {};

	nObj.username = req.body.name;
	nObj.password = req.body.password;

	var n = new user(nObj);
	n.save(function(err) {
		if (err) {
			res.status(500).json(err);
			throw err
		}
		res.redirect('/');
	});
})


app.get("/list", function(req, res){
	var display = {};
	display[req.query.criteria] = req.query.keyword;
	if(req.query.criteria == undefined){
		req.query.criteria = 'name';
	}
	var criteria = {};
	criteria[req.query.criteria] = new RegExp(req.query.keyword, 'i');
	find_restaurant(criteria, function(doc){
		res.render("list",{"user_name" : req.session.username,"criteria" : JSON.stringify(display),"restaurants" : doc, });
	});
})

app.get("/api/read/name/:name", function(req, res) {
	find_restaurant({"name" : req.params.name}, function(doc){
		res.jsonp(doc);
	});
})
app.get("/api/read/borough/:borough", function(req, res) {
	find_restaurant({"borough" : req.params.borough}, function(doc){
		res.jsonp(doc);
	});
})
app.get("/api/read/cuisine/:cuisine", function(req, res) {
	find_restaurant({"cuisine" : req.params.cuisine}, function(doc){
		res.jsonp(doc);
	});
})

function find_restaurant(criteria, callback){
	restaurant.find(criteria,function (err, doc) {
		if (err) {
			res.status(500).json(err);
			throw err
		}else {
			callback(doc);
		}
	});
}

app.get("/insert", function (req,res) {
	res.sendFile( __dirname + '/views/newRestaurant.html')
})

app.post("/insert", function(req, res){
	var rObj = {};
	rObj.name = req.body.name;
	rObj.address = {};
	rObj.address.building = req.body.building;
	rObj.address.street = req.body.street;
	rObj.address.zipcode = req.body.zipcode;
	rObj.address.coord = [];
	rObj.address.coord.push(req.body.lon);
	rObj.address.coord.push(req.body.lat);
	rObj.borough = req.body.borough;
	rObj.cuisine = req.body.cuisine;
	rObj.createBy = req.session.username;
	rObj.photo = new Buffer(req.files.sampleFile.data).toString('base64');
	rObj.minetype = req.files.sampleFile.mimetype;

	var r = new restaurant(rObj);
	r.save(function(err) {
		if (err) {
			res.status(500).json(err);
			throw err
		}
		res.redirect('/list');
	});
})

app.post("/api/create", function(req, res){
	var body = "";
	console.log(req.body.address);

	var r = new restaurant(req.body);
	r.save(function(err, doc) {
		if(err){
			res.end(JSON.stringify({"status" : "failed"}));
		}else
			res.end(JSON.stringify({"status" : "ok", "_id" : doc._id.toString() }));
	});
})

app.get("/details", function(req,res){
	restaurant.findOne({_id : ObjectId(req.query._id)},function (err, doc) {
		if (err) {
			res.status(500).json(err);
			throw err
		}else {
			res.render("details",{"user_name" : req.session.username, "restaurant" : doc});
		}
	});
})


app.get("/edit", function(req,res){
	restaurant.findOne({_id : ObjectId(req.query._id)},function (err, doc) {
		if (err) {
			res.status(500).json(err);
			throw err
		}else {
			res.render("edit",{"user_name" : req.session.username, "restaurant" : doc});
		}
});
})

app.post("/edit", function(req,res){

	if(req.session.username == ""){
		res.redirect("/login");
	}
	restaurant.findById(req.body.id, function(err, restaurant){
		if(err){
			res.status(500).send(err);
		}else{
			var coord = [req.body.lon, req.body.lat];
			restaurant.name = req.body.name;
			restaurant.address.building = req.body.building;
			restaurant.address.street = req.body.street;
			restaurant.address.zipcode = req.body.zipcode;
			restaurant.address.coord = coord;
			restaurant.borough = req.body.borough;
			restaurant.cuisine = req.body.cuisine;
			restaurant.photo = new Buffer(req.files.sampleFile.data).toString('base64');
			restaurant.minetype = req.files.sampleFile.mimetype;
			restaurant.save(function (err,doc) {
				if(err){
					res.status(500).send(err);
				}
				res.redirect("/details?_id=" + restaurant._id.toString());
			})
		}
	});
})

app.get("/delete", function(req,res){
	restaurant.remove({_id : ObjectId(req.query._id)}, function(err){
		if(err){
			res.status(500).json(err);
			throw err;
		}else{
			res.redirect('/list');
		}
	});
})

app.get("/rate", function(req,res){
	res.render("rate",{"id" : req.query._id});
})

app.post("/rate", function(req,res){

	if(req.session.username == ""){
		res.redirect("/login");
	}
	restaurant.findById(req.body.id, function(err, restaurant){
		if(err){
			res.status(500).send(err);
		}else{
			var repeat = false;
			for(var i = 0; i<restaurant.rating.length; i++){

				if(req.session.username == restaurant.rating[i].rateBy){
					repeat = true;
					break;
				}
			}
			if(!repeat){
				restaurant.rating.push({"rate":req.body.rating, "rateBy" : req.session.username});
				restaurant.save(function (err,doc) {
					if(err){
						res.status(500).send(err);
					}
					res.redirect("/details?_id=" + restaurant._id.toString());
				})
			}else{
				res.end("<p>You had already rate this restaurant</p><br><p><a href='/list'>home page</a>");
			}
		}
	});
})

app.get("/map", function(req,res) {
	var lat  = req.query.lat;
	var lon  = req.query.lon;
	var zoom = req.query.zoom;

	res.render("map.ejs",{'lat' : lat, 'lon' : lon, 'zoom' : zoom, 'name' : req.query.name});
	res.end();
});


app.get('/logout',function(req,res) {
	req.session = null;
	res.redirect('/');
});


app.listen(process.env.PORT || 8099);
