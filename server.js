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
  var configdata=data.docs[0].data()

  ejecutaConfigdata(configdata)
})

function ejecutaConfigdata(config){

  console.log("config data")
  console.log(config)
    // This is your real test secret API key.
    
    const stripe = require("stripe")(config.pagos.stripe.modoprueba === true ? config.pagos.stripe.secretkeytest : config.pagos.stripe.secretkeyprod);
    //CREDENCIALES DE CUENTA TEST
    mercadopago.configure({
      access_token: config.pagos.mercadopago.modoprueba === true ? config.pagos.mercadopago.secretkeytest : config.pagos.mercadopago.secretkeyprod
    });

ejecutaserver(stripe,mercadopago)
}


function ejecutaserver(stripe,mercadopago){

  app.use(express.static("."));
  // app.use(express.json());
  app.use(express.json({verify: (req,res,buf) => { req.rawBody = buf }}));
  
  
  // let YOUR_DOMAIN = 'http://localhost:3000';
  const port = process.env.PORT || 4242;
  
  
  //MERCAPAGO
  app.post("/create_preference", (req, res) => {
    console.log("crear preference");
    // console.log(req.body);
  
    
    let { quantity, description, price, dominio, external_reference } = req.body;
    // Crea un objeto de preferencia
    external_reference = external_reference.toString();
    let preference = {
      items: [
        {
          title: description,
          unit_price: price,
          quantity,
        }
      ],
      back_urls: {
        "success": `${dominio}/`,
        "failure": `${dominio}/`,
        "pending": `${dominio}/`
      },
      // notification_url: "https://educadora.cf/ipn",
      // notification_url: "https://nvbz6.sse.codesandbox.io/about",
      notification_url: "https://stripe-checkout-api.herokuapp.com/mp-webhook?source_news=webhooks",
      // auto_return: 'approved',
      external_reference,
    };
  
  
    mercadopago.preferences.create(preference)
      .then(function (response) {
        console.log(response.body);
        res.json({id :response.body.id, pre: response.body })
      }).catch(function (error) {
        console.log(error);
      });
  });
  

  app.post("/estado-pago", async(req, res) => {
  
    console.log("ESTADO-PAGO");
    // console.log("ESTADO-PAGO");
    // console.log("ESTADO-PAGO");
    // console.log("ESTADO-PAGO");
    //superHeroes['active']
    // console.log(req.body);
    // console.log(req.body{'data.id'});'data.id': '123'
    // console.log("req.body[data.id]");
    // console.log(req.body['data.id']);
    // console.log(req.body.('data.id'));
    //const {id} = req.body;/
    const id = req.body.idPago;
    // mercadopago.merchant_orders
    // console.log("chercando merchant orden")
    // console.log(id);
  
  //   mercadopago.configure({
  //   access_token: process.env.TOKENMERCADOPAGO
  // });
    
    // mercadopago.merchant_orders.get(id)
    mercadopago.payment.get(id)
    .then( dato => {
      console.log("mercapago payment")
      console.log(dato.body)
  
      res.send({
        response: dato.body,
      });
    }).catch( e => {
      console.log("ERROR ID NO VALIDO");
      console.log(e);
      res.send({
        error: true,
        msj: "Pago pendiente o no ha realizado el pago"
      })
    })
  })
  
  
  
  
  //STRIPE
  let external_reference_Global = "sd";
  
  app.post("/create-checkout-session", async (req, res) => {
    // const domainURL =YOUR_DOMAIN;
    console.log(req.body);
    let { priceId, dominio,external_reference } = req.body;
    console.log(external_reference)
    console.log(typeof(external_reference))
    // external_reference = external_reference.toString();
    external_reference = external_reference.toString();
  
    external_reference_Global = external_reference;
    console.log("CREATE CEHCKOUT SESION");
    console.log(req.body);
  
  
    try {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${dominio}/`,
        cancel_url: `${dominio}/`,
        client_reference_id: external_reference,
      });
  
      console.log(session)
  
      res.send({
        sessionId: session.id,
      });
      // res.json(session );
    } catch (e) {
      res.status(400);
      return res.send({
        error: {
          message: e.message,
        }
      });
    }
  });
  
  //VERIFICAR 
  app.get("/checkout-session", async (req, res) => {
    // console.log(req.query)
    const { sessionId } = req.query;
    // console.log(sessionId);
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      // console.log(session)
      // const subscription = await stripe.subscriptions.retrieve(session.subscription);
      // console.log("ESTADO DE SUSCRIPCION")
      // console.log(subscription)
      res.send(session);
      
    } catch (error) {
      res.send({
        error: true,
        msj: "Sesión de compra incorrecta"
      })
    }
  });
  
  //REVISAR ESTADO DE SUSCRIPCION
  app.get("/check-suscripcion", async (req, res) => {
    console.log("check-suscripcio")
    // console.log(req.query)
    const { suscripcionId } = req.query;
    try {
      // const session = await stripe.checkout.sessions.retrieve(sessionId);
      // console.log(session)
      const subscription = await stripe.subscriptions.retrieve(suscripcionId);
      // console.log("ESTADO DE SUSCRIPCION")
      // console.log(subscription)
      res.send(subscription);
      
    } catch (error) {
      console.log(error)
      res.send({
        error: true,
        msj: "Membresia no premium"
      })
    }
  });
  
  app.listen(port, '0.0.0.0', () => {
    console.log('NODE SERVER RUN!');
  });
  
  //ADMINISTRADOR DE MEMBRESIA
  app.post('/customer-portal', async (req, res) => {
    // For demonstration purposes, we're using the Checkout session to retrieve the customer ID.
    // Typically this is stored alongside the authenticated user in your database.
    const { sessionId, dominio } = req.body;
    // console.log(req.body)
    const checkoutsession = await stripe.checkout.sessions.retrieve(sessionId);
  
    
  
    const portalsession = await stripe.billingPortal.sessions.create({
      customer: checkoutsession.customer,
      return_url: `${dominio}/`,
    });
  
    res.send({
      url: portalsession.url,
    });
  });
  
  app.get('/obtenerFechaActual', async(req, res) => {
    // const f = new Date();
    let dateee = Date.now();
    // console.log(dateee)
    const fecha = format(dateee , "dd/MM/yyyy", {locale: es});
  
  // document.write(f.getDate() + "/" + (f.getMonth() +1) + "/" + f.getFullYear());
    // const fecha = new Date(f.getFullYear(),f.getMonth() +1, f.getDate());
    // console.log(fecha);
    res.send({
      fecha,
      dateee
    })
  })
  
  
  
  
  app.post("/stripe-webhook", bodyParser.raw({type: 'application/json'}), async (req, res) => {
    let eventType;
    // Check if webhook signing is configured.
    console.log("CHECK WEBHOOK STRIPE")
    // console.log("CHECK WEBHOOK STRIPE")
    // console.log("CHECK WEBHOOK STRIPE")
    // console.log("CHECK WEBHOOK STRIPE")
    
      let event= {};
      let signature = req.headers["stripe-signature"];
  
      try {
        event = stripe.webhooks.constructEvent(
          req.rawBody,
          signature,
          process.env.STRIPE_WEBHOOK_SECRET
        );
        // console.log(event);
  
      } catch (err) {
        console.log(`⚠️  Webhook signature verification failed.`);
        console.log(err);
        return res.sendStatus(400);
        
      }
  
      console.log(event.type);
      // console.log(event.type);
      // console.log(event);
      // console.log(event.type);
      // console.log(event.type);
      // console.log(event.data);
  
      // console.log(event.type);
  
   
    switch (event.type) {
        // case 'checkout.session.completed':
        //   console.log("checkout.session.completed")
  
        //   // Payment is successful and the subscription is created.
        //   // You should provision the subscription.
        //   break;
  
        case 'customer.subscription.updated':
  
          console.log("customer.subscription.updated")
          // console.log("customer.subscription.updated")
          // console.log("customer.subscription.updated")
          // console.log("customer.subscription.updated")
          // console.log("event")
          // console.log(event)
          console.log("event.data")
          console.log(event.data)
  
        break;
        case 'invoice.paid':
          console.log("invoice.paid")
          // console.log("event")
          // console.log(event)
          console.log("event.data")
          console.log(event.data)
  
          // Continue to provision the subscription as payments continue to be made.
          // Store the status in your database and check when a user accesses your service.
          // This approach helps you avoid hitting rate limits.
          break;
        case 'invoice.payment_failed':
          console.log("invoice.payment_failed")
          // console.log("event")
          // console.log(event)
          console.log("event.data")
          console.log(event.data)
  
          // The payment failed or the customer does not have a valid payment method.
          // The subscription becomes past_due. Notify your customer and send them to the
          // customer portal to update their payment information.
          break;
  
        case 'payment_intent.created':
            console.log("payment_intent.created")
    
            // The payment failed or the customer does not have a valid payment method.
            // The subscription becomes past_due. Notify your customer and send them to the
            // customer portal to update their payment information.
            break;
        
        case 'customer.subscription.created':
          console.log("customer.subscription.created")
  
  
         
        break
        case 'checkout.session.completed':
          console.log("checkout.session.completed  dentroooooo")
  
          let {id, client_reference_id,customer,payment_status,subscription } = event.data.object;
            // ,current_period_end, current_period_start,plan,status} = event.data.object;
          
  
          try {
            
            let objPago;
  
            const pagosRef = db.collection('pagos');
            const queryRef = await pagosRef.where('external_reference', '==', client_reference_id).get();
            // console.log(queryRef)
            // console.log(queryRef.docs)
            queryRef.docs.forEach(doc=>{
                idPago = doc.id;
                objPago = {...doc.data() }
            });
  
            // collector_id
            console.log("objPago antes ");
            console.log(objPago);
  
            objPago.collector_id = id;
            objPago.id = subscription;
            // objPago.operation_type = operation_type;
            // objPago.payer = customer;
            objPago.payment_method_id ="card";
            objPago.status = payment_status;
            // objPago.status_detail = "accredited";
            // objPago.tipoSuscripcion = tipoSuscripcion;
  
            console.log("objPago despues");
            console.log(objPago);
  
  
            const pagoRef = db.collection('pagos').doc(idPago);
            await pagoRef.update(objPago);
  
            const userRef = db.collection('usuarios').doc(objPago.iduser);
            await userRef.update({idSuscripcion: client_reference_id, lvluser: 2});
  
           } catch (error) {
             console.log(error);
           }
  
        
        break;
  
            // customer.subscription.created
        default:
        // Unhandled event type
      }
  
    res.sendStatus(200);
  });
  
  app.post("/mp-webhook", async (req, res) => { 
    console.log("MERCADOPAGO WEBHOOK");
    console.log("req.query")
    console.log(req.query)
    console.log("req.body")
    console.log(req.body)
    const id = req.query['data.id']
    const {type} = req.query
  
    if (req.method === "POST") { 
      switch (type) {
        case 'payment':
          console.log("PAYMENT")
  
          mercadopago.payment.get(id)
          .then( async (dato) => {
  
            //Se extraen los datos de la orden de pago /id pago
            const {collector_id,date_created,description,
              external_reference,id,operation_type,payer,payment_method_id,
              transaction_amount,status,status_detail,} = dato.body;
              console.log("dato.body")
              console.log(dato.body)
  
              const tipoSuscripcion = transaction_amount === 1290 ? "trimestral" :
                transaction_amount === 2190 ? "semestral" :
                transaction_amount === 3500 ? "anual" : "mensual";
              // const tipoSuscripcion = transaction_amount === ?
  
            //variable para almacenar los cambios del pago
            let objPago;
  
  
            
           try {
  
  
            const pagosRef = db.collection('pagos');
            const queryRef = await pagosRef.where('external_reference', '==', external_reference).get();
            // console.log(queryRef)
            // console.log(queryRef.docs)
            queryRef.docs.forEach(doc=>{
                idPago = doc.id;
                objPago = {...doc.data() }
            });
  
            // collector_id
            // console.log("objPago");
            // console.log(objPago);
  
            objPago.collector_id = collector_id;
            objPago.id = id;
            objPago.operation_type = operation_type;
            objPago.payer = payer;
            objPago.payment_method_id =payment_method_id;
            objPago.status = status;
            objPago.status_detail = status_detail;
            objPago.tipoSuscripcion = tipoSuscripcion;
  
            console.log("objPago");
            console.log(objPago);
  
  
            const pagoRef = db.collection('pagos').doc(idPago);
            await pagoRef.update(objPago);
  
            const userRef = db.collection('usuarios').doc(objPago.iduser);
            await userRef.update({idSuscripcion: external_reference, lvluser: 2});
  
           } catch (error) {
             console.log(error);
           }
  
            
          }).catch( e => {
            console.log("ERROR ID NO VALIDO");
            console.log(e);
            res.send({
              error: true,
              msj: "Pago pendiente o no ha realizado el pago"
            })
          })
          break;
  
        case 'plan':
          console.log("PLAN")
          break;
  
        case 'subscription':
          console.log("SUBSCRIPTION")
          break;
  
        case 'invoice':
            console.log("INVOICE")
            break;
        
        case 'test':
          console.log("TEST gg")
        break;
  
        default:
        // Unhandled event type
      }
     
    }
  
    res.sendStatus(200);
  
    //return res.status(200); 
  });
  
}



