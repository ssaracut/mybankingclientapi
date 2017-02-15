import Hapi from 'hapi';
import Good from 'good';
import HapiAuthJwt from 'hapi-auth-jwt2'
import Bell from 'bell'
import Handlers from './Handlers'
import MyBankingClientApi from './MyBankingClientApi'

const server = new Hapi.Server();
const contextRoot = process.env.CONTEXT_ROOT;

server.connection({ port: 8080 });

function validate(decoded, request, callback) {
    MyBankingClientApi.validateProfile(decoded.key)
        .then(isValid => {
            callback(null, isValid);
        })
        .catch(error => { callback(null, false) })
};

// Register bell with the server
server.register(Bell, function (err) {

    // Declare an authentication strategy using the bell scheme
    // with the name of the provider, cookie encryption password,
    // and the OAuth client credentials.
    server.auth.strategy('google', 'bell', {
        provider: 'google',
        password: 'cookie_encryption_password_secure',
        clientId: process.env.GOOGLE_API_CLIENT_ID,
        clientSecret: process.env.GOOGLE_API_SECRET,
        isSecure: false    // Terrible idea but required if not using HTTPS especially if developing locally        
    });

    server.route({
        method: '*', // Must handle both GET and POST
        path: `${contextRoot}login`,          // The callback endpoint registered with the provider
        config: {
            auth: {
                strategy: 'google',
                mode: 'try'
            },
            handler: Handlers.loginGoogle
        }
    });

});

server.register(HapiAuthJwt, function (err) {

    if (err) {
        console.log(err);
    }

    server.auth.strategy('jwt', 'jwt',
        {
            key: 'NeverShareYourSecret',          // Never Share your secret key 
            validateFunc: validate,            // validate function defined above 
            verifyOptions: { algorithms: ['HS256'] },   // pick a strong algorithm 
            tokenType: 'jwt'
        });

    server.auth.default('jwt');

    server.route([
        {
            method: 'GET',
            config: { auth: false },
            path: `${contextRoot}version`,
            handler: (request, reply) => {
                reply({ version: process.env.npm_package_version });
            }
        },
        {
            method: 'GET',
            config: { auth: { strategies: ['jwt'] } },
            path: `${contextRoot}profile`,
            handler: Handlers.getProfile
        },
        {
            method: 'POST',
            config: { auth: 'jwt' },
            path: `${contextRoot}auth/bank/{bank}`,
            handler: Handlers.getBankAuth
        },
        {
            method: 'GET',
            config: { auth: { strategies: ['jwt'] } },
            path: `${contextRoot}profile/{bank}`,
            handler: Handlers.getBankProfile
        },
        {
            method: 'GET',
            config: { auth: { strategies: ['jwt'] } },
            path: `${contextRoot}accounts/{bank}`,
            handler: Handlers.getBankAccounts
        }

    ]);
});

server.register({
    register: Good,
    options: {
        includes: {
            request: ['payload'],
            response: ['payload']
        },
        reporters: {
            console: [{
                module: 'good-squeeze',
                name: 'Squeeze',
                args: [{
                    request: '*',
                    response: '*',
                    log: '*'
                }]
            }, {
                module: 'good-console'
            }, 'stdout']
        }
    }
}, (err) => {

    if (err) {
        throw err; // something bad happened loading the plugin
    }

    server.start((err) => {

        if (err) {
            throw err;
        }
        server.log('info', 'Server running at: ' + server.info.uri);
    });
});