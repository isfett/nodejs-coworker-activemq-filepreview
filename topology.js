module.exports = function( rabbit, subscribeTo ) {
    return rabbit.configure( {
        // arguments used to establish a connection to a broker
        connection: {
            user: 'guest',
            pass: 'guest',
            server: [ 'localhost' ]
            //port: 5672,
            //vhost: '%2f'
        },

        // define the exchanges
        exchanges: [
            {
                name: 'imagepreview-exchange',
                type: 'direct',
                autoDelete: true
            }
        ],

        // setup the queues, only subscribing to the one this service
        // will consume messages from
        queues: [
            {
                name: 'imagepreview-queue',
                autoDelete: false,
                subscribe: subscribeTo === 'requests'
            }
        ],

        // binds exchanges and queues to one another
        bindings: [
            {
                exchange: 'imagepreview-exchange',
                target: 'imagepreview-queue',
                keys: [ '' ]
            }
        ]
    } );
};