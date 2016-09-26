// load up the user model
var User = require('../app/models/user');
var request = require('request');
var ObjectId = require('mongoose').Types.ObjectId; 

// app/routes.js
module.exports = function(app, passport) {

	app.get(
		'/',
		function(req, res) {
			User.findRandom(
				{},
				{},
				{ limit: 5 },
				function(err, data) {
					res.render(
						'index.ejs', {
							users: data // get the users
						}
					);
				}
			);
		}
	);

	app.get(
		'/login',
		function(req, res) {
			res.render(
				'login.ejs',
				{
					message: req.flash('loginMessage')
				}
			);
		}
	);

	app.post(
		'/login',
		passport.authenticate(
			'local-login',
			{
				successRedirect: '/profile', // redirect to the secure profile section
				failureRedirect: '/login', // redirect back to the signup page if there is an error
				failureFlash: true // allow flash messages
			}
		)
	);

	app.get(
		'/signup',
		function(req, res) {
			res.render(
				'signup.ejs',
				{
					message: req.flash('signupMessage')
				}
			);
		}
	);

	app.post(
		'/signup',
		passport.authenticate(
			'local-signup', {
				successRedirect: '/profile', // redirect to the secure profile section
				failureRedirect: '/signup', // redirect back to the signup page if there is an error
				failureFlash: true // allow flash messages
			}
		)
	);

	app.get(
		'/profile',
		isLoggedIn,
		function(req, res) {
			res.render(
				'profile.ejs', {
					user: req.user // get the user out of session and pass to template
				}
			);
		}
	);

	app.get(
		'/auth/instagram',
		passport.authenticate('instagram')
	);

	app.get(
		'/auth/instagram/callback',
		passport.authenticate(
			'instagram', {
				successRedirect: '/profile',
				failureRedirect: '/'
			}
		)
	);

	app.post(
		'/profile/new',
		function(req,res) {
			var thisUser = req.user;
			var thing = {};
			thing.tag = req.body.tag;
			thing.description = req.body.description;
			thing.location = req.body.location;

			thisUser.instagram.hashtags.push(thing);
			
			thisUser.save(
				function(err, wut) {
					if (err) return console.error(err);
					res.redirect(
						'/profile'
					);
				}
			);
		}
	);

	app.post(
		'/profile/update',
		function(req,res) {
			var thisUser = req.user;
			thisUser.instagram.hashtags.forEach(
				function(item, index) {
					var thisId = ObjectId(item._id);
					var thatId = ObjectId(req.body._id);
					if (thisId.toString() === thatId.toString()) {
						thisUser.instagram.hashtags.splice(index,1);
					}
				}
			);

			var thing = {};
			thing.tag = req.body.tag;
			thing.description = req.body.description;
			thing.location = req.body.location;

			thisUser.instagram.hashtags.push(thing);
			
			thisUser.save(
				function(err, wut) {
					if (err) return console.error(err);
					res.redirect(
						'/profile'
					);
				}
			);
		}
	);

	app.post(
		'/profile/delete',
		function(req, res) {
			var thisUser = req.user;
			thisUser.instagram.hashtags.forEach(
				function(item, index) {
					var thisId = ObjectId(item._id);
					var thatId = ObjectId(req.body._id);
					if (thisId.toString() === thatId.toString()) {
						thisUser.instagram.hashtags.splice(index,1);
					}
				}
			);
			
			thisUser.save(
				function(err, wut) {
					if (err) return console.error(err);
					res.redirect(
						'/profile'
					);
				}
			);
		}
	);

	app.post(
		'/profile/save',
		function(req, res) {
			var thisUser = req.user;
			var stuff = [];
			console.log(req.body);
			var tags = req.body.tag;
			var descriptions = req.body.description;
			var locations = req.body.location;
			var scores = req.body.score;
			var tagType = typeof tags;
			if (tagType === 'string') {
				tags = [tags];
				descriptions = [descriptions];
				locations = [locations];
				scores = [scores];
			}
			tags.forEach(
				function(item, index) {
					var thing = {};
					thing.tag = tags[index];
					thing.description = descriptions[index];
					thing.location = locations[index];
					thing.score = scores[index];
					var valid = 1;
					for (var property in thing) {
						if (thing[property] === '') {
							valid = 0;
						}
					}
					if (valid) {
						stuff.push(thing);
					}
				}
			);
			if (stuff === []) {
				res.redirect(
					'/profile'
				);
			} else {
				console.dir(stuff)
				thisUser.instagram.hashtags = stuff;
				thisUser.save(
					function(err, wut) {
						if (err) return console.error(err);
						res.redirect(
							'/profile'
						);
					}
				);
			}
		}
	);

	app.get(
		'/logout',
		function(req, res) {
			req.logout();
			res.redirect('/');
		}
	);

	app.get(
		'/privacy',
		function(req, res) {
			res.render('privacy.ejs');
		}
	);

	app.get(
		'/*',
		function(req, res, next) {
			var params = req.params[0].split('/');
			var d = new Date();
			console.log(d.getTime());
			User.findOne(
				{
					'instagram.username': params[0]
				},
				function(err, user) {
					if (user === null) {
						res.redirect(
							'/'
						);
					} else {
						var thisUser = user;
						request.get(
							'https://api.instagram.com/v1/users/' + user.instagram.id + '/?access_token=' + user.instagram.token,
							function(err,res,body) {
								var data = JSON.parse(body).data;
								var update = 0;
								if (user.instagram.profile_picture !== data.profile_picture) {
									update++;
									user.instagram.profile_picture = data.profile_picture;
								}
								if (user.instagram.bio !== data.bio) {
									update++;
									user.instagram.bio = data.bio;
								}
								if (user.instagram.website !== data.website) {
									update++;
									user.instagram.website = data.website;
								}
								console.log(update);
								if (update > 0) {
									thisUser.save(
										function(err, wut) {
											if (err) {
												return console.error(err);
											} else if (wut) {
												return console.error(wut);
											}
										}
									);
								}
							}
						);
						var valid = false;
						if (params.length > 1 && params[1] !== '') {
							user.instagram.hashtags.forEach(
								function(item, index) {
									if (item.tag === params[1]) {
										user.instagram.hashtags = item;
										valid = true;
										return false;
									}
								}
							);
							if (valid) {
								res.render(
									'tag.ejs', {
										user: user // get the user out of session and pass to template
									}
								);
							} else {
								res.redirect('/' + params[0]);
							}
						} else {
							res.render(
								'user.ejs', {
									user: user // get the user out of session and pass to template
								}
							);
						}
					}
				}
			);
		}
	);
};

function isLoggedIn(req, res, next) {
	if (req.isAuthenticated())
		return next();
	res.redirect('/');
}
