import express, { Application, Request, Response, NextFunction } from "express";

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomString(len: number) {
  const buf = [],
    chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
    charlen = chars.length;

  for (let i = 0; i < len; ++i) {
    buf.push(chars[getRandomInt(0, charlen - 1)]);
  }
  return buf.join("");
}
function issueToken(user: any, done: (err: any, token?: string) => void) {
  var token = randomString(64);
  saveRememberMeToken(token, user.id, function(err: any) {
    if (err) {
      return done(err);
    }
    return done(null, token);
  });
}

/* Fake, in-memory database of remember me tokens */
var tokens: { [key: string]: string } = {};

function consumeRememberMeToken(
  token: string,
  fn: (err: any, token?: string) => void
) {
  var uid = tokens[token];
  // invalidate the single-use token
  delete tokens[token];
  return fn(null, uid);
}
function saveRememberMeToken(
  token: string,
  uid: string,
  fn: (err?: any, token?: string) => void
) {
  tokens[token] = uid;
  return fn();
}

function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res
    .status(401)
    .json({ error: "Debes estar autenticado para realizar esta petición." });
}

export default {
  issueToken,
  consumeRememberMeToken,
  ensureAuthenticated
};
