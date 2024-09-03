const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { swaggerUi, swaggerDocs } = require('./config/swagger');
require('dotenv').config();

const app = express();

mongoose.set('strictQuery', false);

var routes = require('./route/routes');

// Configurazione CORS
app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));


app.use('/api', routes);

// Serve la documentazione Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

app.use(express.json());
app.use(routes);

const port = process.env.PORT || 9992;

app.listen(port, function check(err) {
    if (err) {
        console.log("Errore connessione al server");
    } else {
        console.log("Server in ascolto sulla porta:", port);
    }
});

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(
    () => {
        console.log("MongoDB Connection -- Ready state is:", mongoose.connection.readyState);
    },
    (err) => {
        console.log(err, ": database utenti non connesso");
    }
);

app.use((err, req, res, next) => {
    console.error('Errore nel server:', err);
    res.status(500).send('Errore nel server');
});
