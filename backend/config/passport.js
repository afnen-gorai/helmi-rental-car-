const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const db = require('./database');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const name = profile.displayName;
        const googleId = profile.id;

        // Check if user exists
        db.query('SELECT * FROM users WHERE email = ?', [email], (err, users) => {
          if (err) return done(err);

          if (users.length > 0) {
            // User exists, update google_id if needed
            const user = users[0];
            if (!user.google_id) {
              db.query(
                'UPDATE users SET google_id = ? WHERE id = ?',
                [googleId, user.id],
                (updateErr) => {
                  if (updateErr) return done(updateErr);
                  return done(null, user);
                }
              );
            } else {
              return done(null, user);
            }
          } else {
            // Create new user
            db.query(
              'INSERT INTO users (nom, email, google_id, role) VALUES (?, ?, ?, ?)',
              [name, email, googleId, 'client'],
              (insertErr, result) => {
                if (insertErr) return done(insertErr);
                const newUser = {
                  id: result.insertId,
                  nom: name,
                  email: email,
                  google_id: googleId,
                  role: 'client',
                };
                return done(null, newUser);
              }
            );
          }
        });
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

// Facebook Strategy (only if credentials are provided)
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: process.env.FACEBOOK_CALLBACK_URL,
        profileFields: ['id', 'displayName', 'emails'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails ? profile.emails[0].value : `${profile.id}@facebook.com`;
          const name = profile.displayName;
          const facebookId = profile.id;

          // Check if user exists
          db.query('SELECT * FROM users WHERE email = ?', [email], (err, users) => {
            if (err) return done(err);

            if (users.length > 0) {
              // User exists, update facebook_id if needed
              const user = users[0];
              if (!user.facebook_id) {
                db.query(
                  'UPDATE users SET facebook_id = ? WHERE id = ?',
                  [facebookId, user.id],
                  (updateErr) => {
                    if (updateErr) return done(updateErr);
                    return done(null, user);
                  }
                );
              } else {
                return done(null, user);
              }
            } else {
              // Create new user
              db.query(
                'INSERT INTO users (nom, email, facebook_id, role) VALUES (?, ?, ?, ?)',
                [name, email, facebookId, 'client'],
                (insertErr, result) => {
                  if (insertErr) return done(insertErr);
                  const newUser = {
                    id: result.insertId,
                    nom: name,
                    email: email,
                    facebook_id: facebookId,
                    role: 'client',
                  };
                  return done(null, newUser);
                }
              );
            }
          });
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  db.query('SELECT * FROM users WHERE id = ?', [id], (err, users) => {
    if (err) return done(err);
    done(null, users[0]);
  });
});

module.exports = passport;
