const RememberMeStrategy = require("passport-remember-me").Strategy;
const LocalStrategy = require("passport-local").Strategy;
import utils from "../utils";
import passport = require("passport");
import mongodb from "mongodb";
const ObjectId = require("mongodb").ObjectId;
const bcrypt = require("bcrypt");

export default function(
  passport: passport.PassportStatic,
  clientDB: mongodb.MongoClient
) {
  function db() {
    return clientDB.db("test-webrtc");
  }

  async function findById(id: string, fn: any) {
    const users = await db()
      .collection("users")
      .find(ObjectId(id))
      .toArray();
    if (users.length > 0) {
      fn(null, users[0]);
    } else {
      fn(new Error("User " + id + " does not exist"));
    }
  }

  async function findByUsername(username: string, fn: any) {
    const users = await db()
      .collection("users")
      .find({ email: username })
      .toArray();
    if (users.length > 0) {
      fn(null, users[0]);
    } else {
      fn(null, null);
    }
  }

  // Passport session setup.
  //   To support persistent login sessions, Passport needs to be able to
  //   serialize users into and deserialize users out of the session.  Typically,
  //   this will be as simple as storing the user ID when serializing, and finding
  //   the user by ID when deserializing.
  passport.serializeUser(function(user: any, done: any) {
    done(null, user._id);
  });
  passport.deserializeUser(function(id: any, done: any) {
    findById(id, function(err: any, user: any) {
      done(err, user);
    });
  });

  // Use the LocalStrategy within Passport.
  //   Strategies in passport require a `verify` function, which accept
  //   credentials (in this case, a username and password), and invoke a callback
  //   with a user object.  In the real world, this would query a database;
  //   however, in this example we are using a baked-in set of users.
  passport.use(
    new LocalStrategy({ usernameField: "email" }, function(
      username: string,
      password: string,
      done: any
    ) {
      // Find the user by username.  If there is no user with the given
      // username, or the password is not correct, set the user to `false` to
      // indicate failure and set a flash message.  Otherwise, return the
      // authenticated `user`.
      findByUsername(username, async function(err: any, user: any) {
        if (err) {
          return done(err);
        }
        if (!user) {
          return done(null, false, { message: "Unknown user " + username });
        }
        try {
          const samePassword = await bcrypt.compare(password, user.password);
          if (!samePassword) {
            return done(null, false, { message: "Invalid password" });
          }
          return done(null, user);
        } catch (error) {
          done(error);
        }
      });
    })
  );

  // Remember Me cookie strategy
  //   This strategy consumes a remember me token, supplying the user the
  //   token was originally issued to.  The token is single-use, so a new
  //   token is then issued to replace it.
  passport.use(
    new RememberMeStrategy(
      {},
      function(token: any, done: any) {
        utils.consumeRememberMeToken(token, function(err, uid) {
          console.log("rem");
          if (err) {
            return done(err);
          }
          if (!uid) {
            return done(null, false);
          }

          findById(uid, function(err: any, user: any) {
            if (err) {
              return done(err);
            }
            if (!user) {
              return done(null, false);
            }
            return done(null, user);
          });
        });
      },
      utils.issueToken
    )
  );
}
