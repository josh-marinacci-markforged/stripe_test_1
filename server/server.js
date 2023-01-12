import {Stripe} from "stripe"
import express from "express"
import {resolve} from 'path'
import session from "express-session"


const STRIPE_PUBLISHABLE_KEY ="pk_test_51MFHp4CKEA4cLdhn8CPBMopA7zKVxd0th76m0ffqucbhsSj5ZiHTwXg65hlquFlqioyaMLG2pFNTmgLBgUsL2N3400PEnnzX5x"
const STRIPE_SECRET_KEY="sk_test_51MFHp4CKEA4cLdhnHYVk0bX2Lw4PPmgE1rTCxhKP2XsTEGC4b78Rl5zq1z8qrzmUc9ugYOmKSUMbTUXE61nxrZpM00aWOGlx6z"
// const STRIPE_WEBHOOK_SECRET="whsec_1234"
const DOMAIN="http://localhost:4242"
const ACCOUNT_ID = "acct_1MFITKAf9SYDdFKf"

// const API_KEY = ""
// const CONFIG = {}
const stripe = new Stripe(STRIPE_SECRET_KEY);

const app = express()
const port = 4242

//static dir for html
app.use(express.static('client'));

app.use(session({
    secret: "Set this to a random string that is kept secure",
    resave: false,
    saveUninitialized: true,
}))


// 1: request the page
app.get("/", (req, res) => {
    const path = resolve('client' + "/index.html");
    res.sendFile(path);
});


// 2: page requests config, giving the list of accounts
// and the public key
app.get('/config', (req, res) => {
    stripe.accounts.list(
        {limit: 10},
        function(err, accounts) {
            if (err) {
                return res.status(500).send({
                    error: err.message
                });
            }
            return res.send({
                accounts,
                publicKey: STRIPE_PUBLISHABLE_KEY,
                // basePrice: BASE_PRICE,
                // currency: CURRENCY,
            });
        }
    );
});


// 3: on checkout, client requests create-checkout-session
// which returns stripe.checkout.sessions.create() for the
// item for sale with a 10% commission for us
app.post('/create-checkout-session', async (req, res) => {
    console.log("Making a checkout session")
    const domainURL = DOMAIN;
    const account = ACCOUNT_ID
    console.log("about to send out..")
    const product_price_USDC = 4200
    const product_name = 'cool prod x'
    const markforged_cut = 0.25
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [
            {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: product_name,
                    },
                    unit_amount: product_price_USDC,
                },
                quantity: 1,
            },
        ],
        payment_intent_data: {
            application_fee_amount: markforged_cut * product_price_USDC,
            // The account receiving the funds, as passed from the client.
            transfer_data: {
                destination: account,
            },
        },
        // ?session_id={CHECKOUT_SESSION_ID} means the redirect will have the session ID set as a query param
        success_url: `${domainURL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${domainURL}/canceled.html`,
    });

    console.log("session is",session)
    res.send({
        sessionId: session.id,
    });
});



// 4: after the client pays, they are sent to success.html
// which loads /checkout-session to get the status
app.get('/checkout-session', async (req, res) => {
    const { sessionId } = req.query;
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    res.send(session);
});

app.listen(port, () => console.log(`Node server listening on port ${port}!`));
