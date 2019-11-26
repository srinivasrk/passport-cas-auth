import sirv from 'sirv';
import express from 'express';
import compression from 'compression';
import * as sapper from '@sapper/server';
var passport = require('passport');
var session = require('express-session');
// file store for SESSIONS
var MemoryStore = require('session-memory-store')(session);
const fetch = require('node-fetch');
const { PORT, NODE_ENV } = process.env;
const dev = NODE_ENV === 'development';
var app = express();



app.use(
  session({
    secret: 'x-meridian',
    store: new MemoryStore({ checkPeriod: 86400000 }),
    resave: false,
    saveUninitialized: false
  })
);


app.use(passport.initialize());
app.use(passport.session());


passport.serializeUser(function (user, cb) {
  cb(null, user.id);
});

passport.deserializeUser(function (user, cb) {
	cb(null, user);
});


passport.use(new (require('passport-cas').Strategy)({
  ssoBaseURL: 'https://cl-accounts.cloud.visenti.com/cas/',
  serverBaseURL: 'http://localhost:3000'
}, function (login, done) {
		console.log(login);
		return done(null, { 'id': login });
}));


app.get('/cas_login', function(req, res, next) {
  passport.authenticate('cas', function (err, user, info) {
    if (err) {
      return next(err);
    }
		console.log(user);
		console.log(info);
    if (!user) {
      req.session.messages = info.message;
      return res.redirect('/');
    }

    req.logIn(user, function (err) {
      if (err) {
        return next(err);
      }

      req.session.messages = '';
      return res.redirect('/');
    });
  })(req, res, next);
});


app.get('/cas_logout', function (req, res, next) {
	req.logout();

	try {
		delete req.session.ldapDisplayName;
		delete req.session.ldapUserName;
		delete req.session.ldapEmail;
		req.session.destroy()
		console.log("Log out, destroying session on logout");
		// remove session from CAS server as well
		res.redirect("https://cl-accounts.cloud.visenti.com/cas/logout")
	} catch (error) {
		console.log({ err: error });
		console.log("Error destroying session on logout");
	}
	
});

app.use(
		compression({ threshold: 0 }),
		sirv('static', { dev }),
		sapper.middleware()
	)
	.listen(PORT, err => {
		if (err) console.log('error', err);
	});
