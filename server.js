const express = require("express");
const cors = require("cors")
const {format} = require("date-fns")
const {es} = require("date-fns/locale");
const app = express();
const mercadopago = require('mercadopago');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const path = require("path");

require("dotenv").config({path: ".env"});

console.log(path.join(__dirname, '/serviceAccountKey.json'))

app.use(cors());

const serviceAccount = require(path.join(__dirname, '/serviceAccountKey.json'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://educadorafirebase.firebaseio.com",
})
const db = admin.firestore();

///// carga claves de sesion para mercadopago y stripe
var configdata={}
configdata=db.collection('ConfiguracionGeneral').get()
.then((data)=>{
  console.log('carga datos de firebase')
configdata=data.docs[0].data()
})


    // This is your real test secret API key.
    res.sendStatus(200);
    app.listen(port, '0.0.0.0', () => {
      console.log('NODE SERVER RUN!');
    });


  

  



