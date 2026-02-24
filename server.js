const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { connectDB } = require('./db');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Static files
app.use(express.static('DangNhap_DangKy'));
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Router cards
const cardsRouter = require("./routes/cards")
app.use('/cards', cardsRouter) 

//trò chơi
const gamesRouter = require('./routes/games');
app.use('/games', gamesRouter);

//collection
const collectionRouter = require('./routes/collections');
app.use('/collections', collectionRouter);

//rao ban
const raobanRoutes = require('./routes/raoban');
app.use('/raoban', raobanRoutes);

//tin tuc
const tintucRouter = require('./routes/tintuc');
app.use('/tintuc', tintucRouter);

//users
const usersRouter = require('./routes/users');
app.use('/users', usersRouter);

//tim mua
const timmuaRouter = require('./routes/timmua');
app.use('/timmua', timmuaRouter);

//orders
const ordersRouter = require('./routes/orders');
app.use('/orders', ordersRouter);

const loginRouter = require('./routes/login');
const registerRouter = require('./routes/register');

app.use('/login', loginRouter);
app.use('/register', registerRouter);

// Khởi chạy server
connectDB().then(() => {
  app.listen(3000, () => console.log("Server chạy: http://localhost:3000"));
});
