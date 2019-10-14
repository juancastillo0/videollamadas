import express, { Application, Request, Response, NextFunction } from "express";
import http from "http";
import socketIO from "socket.io";
import bodyParser from "body-parser";
import mongodb, { ObjectID } from "mongodb";
const MongoClient = mongodb.MongoClient;
const expressSession = require("express-session");
const cookieParser = require("cookie-parser");
import passport from "passport";
import passportConfig from "./config/passport";
import {
  UserDatabase,
  ChatDatabase,
  ChatMessageDatabase,
  EmitCallErrors
} from "../client/src/services/api-types";
import utils from "./utils";
const bcrypt = require("bcrypt");

const PORT = process.env.PORT || 5000;
const url = "mongodb://localhost:27017";
let client: mongodb.MongoClient | null = null;
let database: mongodb.Db | null = null;
const app: Application = express();
const httpServer = http.createServer(app);
const io = socketIO(httpServer);

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
  expressSession({
    secret: "keyboard cat",
    resave: true,
    saveUninitialized: true
  })
);

// Make database global
app.use((req, res, next) => {
  if (database) {
    (req as any).db = database;
  }
  next();
});

// passport config
app.use(passport.initialize());
app.use(passport.session());

app.get("/", (req: Request, res: Response, next: NextFunction) => {
  res.send("server working!");
});

type UserType = {
  socket: socketIO.Socket;
  email: string;
  name: string;
  uid: string;
};

// DATA

// const allUser: {
//   [key: string]: UserDatabase & { password: string };
// } = {
//   "juan@mail.com": {
//     uid: "juanid",
//     name: "juan",
//     password: "juan123",
//     email: "juan@mail.com",
//     chats: { chat1: true },
//     counter: undefined
//   },
//   "gabo@mail.com": {
//     uid: "gaboid",
//     name: "gabo",
//     password: "gabo123",
//     email: "gabo@mail.com",
//     chats: { chat1: true },
//     counter: undefined
//   }
// };

const socketIdToUserId: { [key: string]: string } = {};
const users: {
  [key: string]: UserType;
} = {};

// const chats: { [key: string]: ChatDatabase } = {
//   chat1: {
//     uid: "chat1",
//     messages: {},
//     peers: {
//       gaboid: {
//         uid: "gaboid",
//         name: "gabo",
//         email: "gabo@mail.com"
//       },
//       juanid: { uid: "juanid", name: "juan", email: "juan@mail.com" }
//     }
//   }
// };

function mapUserToPeer(user: { email: string; name: string; uid: string }) {
  return { name: user.name, email: user.email, uid: user.uid };
}

const getUser = (socket: SocketIO.Socket) => {
  const userId = socketIdToUserId[socket.id];
  if (userId) {
    return users[userId];
  }
};

function mapUserToUserDatabase(user: any) {
  delete user.password;
  if (user.chats) {
    user.chats = user.chats.reduce((all: any, k: string) => {
      all[k] = true;
      return all;
    }, {});
  } else {
    user.chats = {};
  }
  user.uid = user._id;
  delete user._id;
  return user as UserDatabase;
}

async function findUserById(id: string, fn: any) {
  if (database) {
    const users = await database
      .collection("users")
      .find(new mongodb.ObjectId(id))
      .toArray();
    if (users.length > 0) {
      return mapUserToUserDatabase(users[0]);
    }
  }
}

async function findUserByEmail(email: string) {
  if (database) {
    const users = await database
      .collection("users")
      .find({ email })
      .toArray();
    if (users.length > 0) {
      return mapUserToUserDatabase(users[0]);
    }
  }
}

type mongoChat = {
  messages: any[];
  peers: { uid: string; name: string; email: string }[];
};

io.on("connection", function(socket) {
  //
  socket.on("signal", function(message) {
    const user = getUser(socket);
    if (user && message.peerId) {
      const peer = users[message.peerId];
      if (peer) {
        message.peerId = user.uid;
        return peer.socket.emit("signal", message);
      }
    }
    console.error("onmessage error:", message);
  });

  socket.on("active", function(peerId: string, ack) {
    const user = getUser(socket);
    if (user) {
      const peer = users[peerId];
      if (peer) {
        return ack(true);
      } else {
        return ack(false);
      }
    }
  });

  socket.on("createContact", async function(email: string, ack) {
    const user = getUser(socket);
    console.log(email, user, socketIdToUserId, socket.id);

    if (!user) {
      return ack({ error: EmitCallErrors.NOT_LOGGED_IN });
    }
    const peer = await findUserByEmail(email);
    if (!peer) {
      return ack({ error: EmitCallErrors.NOT_EXISTS });
    }
    if (email == user.email) {
      return ack({ error: EmitCallErrors.CALLED_SELF });
    }
    if (!database) {
      return ack({ error: EmitCallErrors.BACKEND_ERROR });
    }

    const chats: mongoChat[] = await database
      .collection("chats")
      .find({
        "peers._id": new mongodb.ObjectID(peer.uid)
      })
      .toArray();

    if (chats.length > 0) {
      for (let c of chats) {
        for (let p of c.peers) {
          if (p.uid === user.uid) {
            return ack({ error: EmitCallErrors.BACKEND_ERROR });
          }
        }
      }
    }

    const ins = await database.collection("chats").insertOne({
      peers: [
        {
          uid: new mongodb.ObjectID(peer.uid),
          name: peer.name,
          email: peer.email
        },
        {
          name: user.name,
          email: user.email,
          uid: new mongodb.ObjectID(user.uid)
        }
      ],
      messages: []
    });

    if (ins.insertedCount === 1) {
      const chatUid = ins.insertedId as string;
      await database
        .collection("users")
        .updateMany(
          { _id: { $in: [new ObjectID(peer.uid), new ObjectID(user.uid)] } },
          { $push: { chats: new ObjectID(chatUid) } }
        );
      return ack({ chatUid, peer: mapUserToPeer(peer) });
    } else {
      return ack({ error: EmitCallErrors.BACKEND_ERROR });
    }

    //   const peer = allUser[email];
    // const fullUser = allUser[user.email];
    // if (fullUser.chats)
    //   for (let chat of Object.keys(fullUser.chats)) {
    //     if (peer.uid in chats[chat].peers) {
    //       return ack({ error: EmitCallErrors.BACKEND_ERROR });
    //     }
    //   }

    // const chatsKeys = Object.keys(chats);
    // const newPeer = { ...mapUserToPeer(peer), counter: 0 };
    // const newUser = { ...user, counter: 0 };
    // const newChat = {
    //   uid: "" + chatsKeys.length,
    //   messages: {},
    //   peers: { [newPeer.uid]: newPeer, [newUser.uid]: newUser }
    // };
    // chats[chatsKeys.length] = newChat;

    // return ack({ chatUid: newChat.uid, peer: newPeer });
  });

  socket.on("fetchChat", async function(chatId: string, ack) {
    if (database) {
      const chats: mongoChat[] = await database
        .collection("chats")
        .find(new mongodb.ObjectID(chatId))
        .toArray();

      if (chats.length > 0) {
        const chat = chats[0];
        chat.peers = chat.peers.reduce((all: any, v) => {
          all[v.uid] = v;
          return all;
        }, {});
        (chat as any).uid = chatId;
        return ack(chat);
      } else {
        return ack(null);
      }
    }
  });

  socket.on("chat", function(chat: ChatMessageDatabase & { chatId: string }) {
    const chatId = chat.chatId;
    if (database) {
      delete chat.chatId;
      database
        .collection("chats")
        .update(
          { _id: new ObjectID(chatId) },
          { $push: { messages: { ...chat } } }
        );
      // let messages = chats[chatId].messages;
      // if (messages === null) {
      //   chats[chatId].messages = {};
      //   messages = chats[chatId].messages;
      // }

      // if (messages !== null) {
      //   const ke = Object.keys(messages);
      //   messages[ke.length] = chat as ChatMessageDatabase;
      // }
    }
  });

  // socket.on("login", function(
  //   {
  //     email,
  //     password
  //   }: {
  //     email: string;
  //     password: string;
  //   },
  //   ack
  // ) {
  //   console.log(email);
  //   const user = allUser[email];
  //   if (user) {
  //     if (user.password === password) {
  //       let userNew = user;

  //       const ans = { ...userNew };
  //       delete ans.password;

  //       const userType = { ...mapUserToPeer(userNew), socket } as UserType;
  //       socket.user = userType;
  //       users[user.uid] = socket.user;

  //       return ack({ user: ans });
  //     } else {
  //       return ack({ error: "wrong password" });
  //     }
  //   } else {
  //     return ack({ error: "not found" });
  //   }
  // });

  function byeFunction(reason: string | undefined) {
    if (reason) {
      console.log(`Peer or server disconnected. Reason: ${reason}.`);
    }
    // const user = getUser(socket);
    // if (socket.user) {
    //   delete users[socket.user.uid];
    //   socket.user = null;
    // }

    const userId = socketIdToUserId[socket.id];
    if (userId) {
      logoutUser(users[userId]);
    }
  }
  socket.on("disconnect", byeFunction);
  socket.on("logout", byeFunction);
  // socket.on("logout", function() {
  //   if (socket.user) {
  //     delete users[socket.user.uid];
  //     socket.user = null;
  //   }
  // });
});

function loginUser(socketId: string, user: UserDatabase) {
  const socket = io.sockets.connected[socketId];
  if (socket) {
    socketIdToUserId[socketId] = user.uid;
    users[user.uid] = { ...mapUserToPeer(user), socket };
  }
}

app.post("/api/profile", utils.ensureAuthenticated, (req, res) => {
  let user = { ...req.user };
  if (req.body.socketId) {
    user = mapUserToUserDatabase(user);
    loginUser(req.body.socketId, user as UserDatabase);

    res.json(user);
  }
  console.log(socketIdToUserId, user);
});

function authenticate(req: Request, res: Response, next: NextFunction) {
  passport.authenticate("local")(req, res, () => {
    const user = { ...(req.user as UserDatabase) };
    delete (user as any).password;
    socketIdToUserId[req.body.socketId] = user.uid;
    users[user.uid] = {
      ...mapUserToPeer(user),
      socket: io.sockets.connected[req.body.socketId]
    };

    if (!req.body.rememberMe) {
      return next();
    }

    utils.issueToken(req.user, function(err, token) {
      if (err) {
        return next(err);
      }
      res.cookie("rememberMe", token, {
        path: "/",
        httpOnly: true,
        maxAge: 604800000
      });
      return next();
    });
  });
}

function logoutUser(userType: UserType) {
  delete socketIdToUserId[userType.socket.id];
  delete users[userType.uid];
}

app.post("/api/login", authenticate, (req, res) => {
  const user = mapUserToUserDatabase(req.user);

  loginUser(req.body.socketId, user);
  res.json({ message: "Inicio de sesión exitoso.", user });
});

app.post("/api/logout", (req, res) => {
  const userType = users[(req.user as any)._id];
  if (userType) {
    logoutUser(userType);
  }

  res.clearCookie("rememberMe");
  req.logout();
  res.json({ message: "Cierre de sesión exitoso." });
});

app.post("/api/signup", async (req: Request, res: Response) => {
  for (let field of ["email", "name", "password"]) {
    if (!req.body[field]) {
      return res
        .status(400)
        .json({ error: `El campo '${field}' es obligatorio.` });
    }
  }
  const { email, name, password: passwordRaw } = req.body;
  try {
    const password = await bcrypt.hash(passwordRaw, 10);
    const db = (req as any).db as mongodb.Db;
    const users = await db
      .collection("users")
      .find({ email })
      .toArray();
    if (users.length > 0) {
      return res
        .status(400)
        .json({ error: "Ya existe una cuenta con este correo." });
    } else {
      db.collection("users").insertOne(
        { email, name, password },
        (error, result) => {
          if (error) return res.status(500).json({ error });
          if (result.insertedCount === 1) {
            authenticate(req, res, () => {
              const user = mapUserToUserDatabase(result.ops[0]);

              loginUser(req.body.socketId, (user as any) as UserDatabase);
              return res.status(201).json({
                message: "Registro exitoso.",
                user
              });
            });
          } else {
            return res.status(500).json({
              error:
                "Error en el servidor, por favor vuelve a intentar más tarde."
            });
          }
        }
      );
    }
  } catch (error) {
    res.status(500).json({ error });
  }
});

MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(clientP => {
    client = clientP;
    database = client.db("test-webrtc");
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
    app.use(passport.authenticate("remember-me"));
    passportConfig(passport, client);
  })
  .catch(err => {
    throw err;
  });
